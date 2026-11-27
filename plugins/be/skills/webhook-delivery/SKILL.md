---
name: webhook-delivery
description: >-
  Sending webhooks to customers from a Next.js API — events written in the same transaction as the change, a queue so a request never waits on delivery, Standard Webhooks signing with an id and timestamp, versioned event types, thin or full payloads, retries with backoff and jitter over days, at-least-once and unordered delivery, SSRF checks on customer URLs, endpoint registration and test events, a delivery log with replay, disabling failing endpoints, rotation and per-endpoint limits. Use when an API must notify customers' systems of events.
---

# Webhook delivery

A webhook is your API calling a customer's server when something happens. It's a delivery system, not a route: an event is recorded with the change that caused it, a worker sends it from a queue, a failure is retried for days, and the customer can see every attempt and send it again. The receiving side — verifying a provider's webhooks — is `api-architecture`'s.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Recording an event

- **The event is written in the same transaction as the change** — an `events` record beside the order or the payout it describes (the outbox pattern). A crash between "change saved" and "event queued" then can't lose an event, and a rolled-back change can't send one.
- **A worker reads new events and fans them out**: one delivery per subscribed endpoint, each its own record and its own queue task. The request that made the change returns at once; nothing on the request path calls a customer's server.
- **Fan-out is idempotent:** the delivery id is built from the event id and the endpoint id, and created with `create()`, so a worker that runs twice doesn't send twice.
- **Each event has a permanent id** (`evt_…`), the same on every attempt and every endpoint — it's the receiver's dedup key.

## Event types and payloads

- **Types are `resource.action` in the past tense**, lowercase, grouped by resource (`order.paid`, `ticket.refunded`), from one catalogue in the shared contracts. One type always carries one payload schema.
- **The body is JSON**: `{ "type", "timestamp", "data" }` — `timestamp` the ISO time the event happened, not when it was sent.
- **Versioned with the API.** A payload is a contract: adding a field is safe; removing or renaming one is a new version, chosen per endpoint and announced like an API version (`api-architecture`).
- **Thin or full, on purpose.** A full payload carries the resource as it stood, so most receivers need no call back; a thin one carries ids, and the receiver fetches the current state with its API key — safer for sensitive data and never stale. Either way, keep a body small (under about 20 KB) and send links, not files.
- **Only what the endpoint's account may see**: the payload is built through the same projection the API would return to that account (`schemas-and-contracts`), never the stored document.

## Signing

Follow the [Standard Webhooks](https://www.standardwebhooks.com/) spec, so customers can verify with its libraries:

- **Headers:** `webhook-id` (the event id), `webhook-timestamp` (Unix seconds) and `webhook-signature` (`v1,<base64>`).
- **The signed content is `id.timestamp.body`** — the exact bytes sent, so serialise once and sign and send the same string. HMAC-SHA256 with the endpoint's own secret.
- **Each endpoint has its own secret**, 24–64 random bytes, shown as `whsec_…` once on creation, stored encrypted (`field-encryption`) because it must be read to sign. A leaked secret affects one endpoint, not every customer.
- **Rotation sends both signatures**, space-separated, for a set overlap (a day to a week), so the customer switches without a missed delivery; then the old secret is deleted.
- **Sign each attempt afresh**, with that attempt's timestamp: a signature built when the event was queued fails a receiver's few-minute tolerance on a retry hours later.
- **Asymmetric signing** (ed25519, `v2a`, over `endpoint_id.msg_id.timestamp.payload`) lets receivers verify without holding a shared secret, and one key pair serves every endpoint; the older `v1a` is deprecated.
- **Tell receivers** to verify in constant time, reject a timestamp outside a few minutes, and dedupe on `webhook-id` — the same rules the house applies when it receives webhooks.

## Delivery

- **At least once, in no particular order.** Retries and parallel workers mean an event can arrive twice and after a later one; say so in the docs, and put the resource's state or version in the payload so a receiver can ignore an older event.
- **One attempt:** `POST` over HTTPS only, a timeout of 15–30 seconds, no redirects followed. A 2xx is success; anything else, a timeout or a reset connection is a failure.
- **Responses mean things:** `410 Gone` disables the endpoint; `429`, `502`, `503` and `504` slow it down, honouring `Retry-After`; a `3xx` is a failure — the customer updates the URL.
- **Retries back off over days**, with jitter so retries don't arrive in waves — immediately, then seconds, minutes, hours, up to about three days. Each attempt is a new queue task, never a sleep in a worker.
- **Per-endpoint limits:** a cap on concurrent requests and on requests per second to each endpoint, so one customer's slow server can't hold the queue, and a burst of events doesn't knock theirs over (`rate-limiting`).
- **One endpoint's failures stay its own**: deliveries to other endpoints carry on.

## SSRF — the customer chooses the URL

A webhook makes your server call any URL a customer types, which is the shape of server-side request forgery (OWASP API7):

- **HTTPS only**, a hostname not an IP literal, on a standard port.
- **Resolve the hostname, refuse private addresses, and connect to the address you checked.** Refuse loopback, private, carrier-grade NAT, link-local (including the cloud metadata address `169.254.169.254`), unique-local IPv6 and IPv4-mapped forms — and pin the connection to that resolved address, or a second DNS answer can point it inside (DNS rebinding). Check at registration and on every attempt.
- **Send from a network that can't reach internal services** — an egress proxy that filters addresses, or workers in their own subnet — so a check you missed still can't reach anything.
- **Never follow redirects**, never send cookies or internal headers, and never return the response body to the customer beyond a short, truncated excerpt in the log.
- **Read at most a few kilobytes of the response**, then close the connection; a huge or endless body never reaches memory.
- **Send from fixed, published IP addresses**, so customers behind a firewall can allow them.

## Endpoints

- **Managed through the API and the dashboard** by the account's owners, with a permission verb (`account.webhook-endpoint.create`), each change audited (`access-control`, `api-architecture`). An endpoint holds its URL, the event types it subscribes to, its payload version, its secret and its state.
- **A test event** the customer can send at any time (`webhook.test`), and one sent on creation, so they see a signed delivery before real events depend on it.
- **Several endpoints per account**, each with its own subscriptions and secret.

## The delivery log

- **Every attempt is recorded**: the event, the endpoint, the time, the status code, the duration and a truncated response — kept for a stated period (30 days is common), then deleted by TTL (`firestore`).
- **Customers see it** in the dashboard and through the API, filtered by event, status and time, so they can debug their own endpoint.
- **Replay:** one delivery or every failure in a time range, sent again with the same event id — the receiver's dedup makes a replay safe.

## Failing endpoints

- **An endpoint failing every attempt for days is disabled**, after warnings: email the account's owners when failures start, again before disabling, and when it's disabled. Pending events are kept, so re-enabling can replay them.
- **Re-enabling is the customer's act**, after a test event succeeds.

## Testing

A route test for endpoint management with SSRF cases (a private IP, a hostname resolving to one, a redirect); a unit test that the signature matches Standard Webhooks' published test vectors; a worker test with a fake HTTP target for success, retry scheduling, `410` and `Retry-After` (`testing`).

Code for signing, the address check and the retry schedule is in [references/patterns.md](references/patterns.md).

## Do / Don't

- **Do** write the event in the change's transaction; send from a queue; sign with Standard Webhooks headers and a per-endpoint secret; version payloads; project them for the account; retry with backoff and jitter over days; check addresses at registration and on every send, pinned to the resolved IP; log every attempt and offer replay; warn before disabling.
- **Don't** call a customer's server on the request path; promise exactly-once or ordered delivery; sign a body other than the one sent; share one secret across endpoints; follow redirects; send to a private or metadata address; let one endpoint's failures stall others; disable an endpoint without notice.

## Related skills

**This skill sets the rules and never writes an audit report.** An audit of this area is `/api-audit`, written from its own template. Run it rather than writing a report from here.

Receiving webhooks and versioning `api-architecture` · API keys and endpoint permissions `access-control` · outbound limits `rate-limiting` · storing secrets `field-encryption` · claims and locks `redis` · the event record and TTL `firestore` · payload projections `schemas-and-contracts` · SSRF and server threats `backend-security` · failure emails `transactional-email`.
