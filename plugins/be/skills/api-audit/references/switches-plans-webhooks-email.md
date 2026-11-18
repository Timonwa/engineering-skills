# API audit — switches, plans, outgoing webhooks and email

The checks behind the last five sections of the checklist. Run each section only where the app has the thing; one it lacks scores `N/A`. The fix targets are `maintenance-mode`, `feature-flags`, `plan-entitlements`, `webhook-delivery` and `transactional-email`.

## Contents

- [Maintenance mode](#maintenance-mode)
- [Feature flags](#feature-flags)
- [Plan entitlements](#plan-entitlements)
- [Outgoing webhooks](#outgoing-webhooks)
- [Email sending](#email-sending)

## Maintenance mode

- **Two gates read one flag:** the API's, in its proxy before any handler, and each frontend's, server-side in its proxy. Flag a gate on the pages alone (scripts and integrators walk past it), a gate in client code, or a second switch for emergencies.
- **The proxy reads a mirror** written on every flag change, with no TTL — flag a TTL, which ends maintenance mid-window — or a frontend's short-lived in-memory copy of the API's public window.
- **The way out is never gated:** the admin app has no gate; the API routes it needs (operator sign-in and session, the flag routes, the public window read) answer, while customer sign-up and sign-in don't; health and cron answer, and every task but the window reconciler skips its run; inbound webhooks are accepted and recorded, processed after; `robots.txt` and static files answer; so does the bypass route. The allowlist is prefix matches checked before the flag is read. Flag any of these gated, and any path exempted without one of those reasons.
- **The response is a 503 with `Retry-After` and `Cache-Control: no-store`** ([RFC 9110 §15.6.4](https://www.rfc-editor.org/rfc/rfc9110#section-15.6.4), [§10.2.3](https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3)) — the seconds to `endsAt`, or a default. Flag a 200 (crawlers index the page, monitors read it as healthy) or a missing `Retry-After`. The API's body is the error envelope with a stable code and the window, with CORS headers; the pages' gate serves the maintenance page's HTML itself with the 503 — flag a rewrite to a prerendered page, which answers 200. Google drops URLs that stay 503 for long ([planned downtime](https://developers.google.com/search/blog/2011/01/how-to-deal-with-planned-site-downtime)), so a long outage needs an indexable page.
- **The bypass:** one route sets an `httpOnly`, `Secure`, `SameSite=Lax` cookie for a day and redirects to a clean URL; a wrong or missing token is a **404**, compared in constant time; an unset token disables it. The token is 32 random bytes or more, per tier, rotated after each use; the cookie reaches the API, and server-side calls forward it. Flag a 401 or 403, `===`, or a bypass that opens when the token is unset.
- **Both gates fail open** down the ladder — mirror, store, last value read, then "not in maintenance" — with a log and an alert. Flag a gate that fails closed. A window guarding a migration that must not race writes is also backed at the data layer; flag one that relies on the gate alone.
- **Read-only mode**, where present, is a second state of the same switch, refusing writes with a 503 and its own code.
- **Running it:** every flip is audited; the cron reconciler applies windows, and ending early clears the window; the exit rotates the bypass token and replays queued webhook events. Whether it's been drilled on staging needs confirmation, not a finding from code.

## Feature flags

The 404 for a switched-off route and its place in the check order are `access-control-audit`'s; here, the flag system itself.

- **A flag is release, ops or experiment — never a permission or a plan gate**, and never config or a secret ([Pete Hodgson, Feature Toggles](https://martinfowler.com/articles/feature-toggles.html)). Flag a flag checked to grant access, a plan read from a flag, or a host, credential or tuning value in one.
- **One typed registry** of every flag code reads, each with its kind and coded default, the name union derived from it; flag a flag read by a raw string. The default is today's behaviour: release flags off, ops flags guarding a working feature on.
- **One evaluation function** is the only read path; it never throws, and when the store can't be read it serves the last catalogue read, then the coded default — never all-off (the OpenFeature and LaunchDarkly behaviour). No record, archived or draft → the default. Flag a second read path or a fail-to-off.
- **Evaluated on the server**; the evaluate route returns resolved booleans, never records, so drafts and archived flags stay unseen. Flags reach the client as booleans in a provider, resolved behind their own `<Suspense>` in a route group's layout — flag a client fetch (it flashes the default) or a read in the root layout.
- **Caching:** an in-process tier over a shared one over the store; every change clears both before it answers; the propagation bound is stated. Flag a change that leaves either tier stale.
- **Changes** are `POST` sub-routes per transition, each with its own verb, rate limit and an audit entry holding the before and after. New flags go through the admin API, never a direct store write; a seed is create-if-missing. Flags are archived, never deleted; a flag code still reads is never archived.
- **Flag debt:** each release and experiment flag has an owner and a `removeBy` date, and a scheduled check lists overdue ones; flag a release flag fully on with its branch still in code. Tests cover both branches of every flag, plus one run with all on.
- **Windows** are reconciled by the cron tick idempotently, with an audit entry and a cache clear, and do nothing to a draft or archived flag.

## Plan entitlements

The check order and the two 403 codes are `access-control-audit`'s; here, where entitlements come from and how limits hold.

- **One map** in the shared contracts from plan to features and limits, each with a stable key; code asks the map, never the plan name. **One function** computes the effective entitlements — plan, add-ons, operator overrides (each with an end date, audited) — and every check reads it. Plans are versioned, so an edit never changes what a current subscriber bought. The resource owner's plan applies, not the actor's.
- **Plan changes come only from verified provider webhooks**, recorded once, applied from the state they carry, older ones ignored. The success page grants nothing by itself; the server asks the provider on return, through the same idempotent fulfilment. Flag access granted from the browser's return, or the provider called per request. A scheduled reconciliation compares subscriptions with the provider and alerts on a difference.
- **Each provider status maps to access in one table** — active and trialing get the plan, past-due gets the grace period, the rest fall to free.
- **Usage limits are reserved in the work's transaction** — read, refuse if over, increment — never a check then a separate write, which lets two requests at the edge both through. Settled to the real amount after, released on failure. Periods are keys (`usage/<account>_<periodStart>`), never a reset job; a scheduled recount logs corrections; warnings go out once per threshold. A quota is never implemented as a rate limit, or the reverse.
- **Changes:** upgrades at once; downgrades and cancellations at the period's end; over a limit after a downgrade, data stays readable and new use is refused; a failed payment opens a grace period; refunds and chargebacks take back what they bought; a trial never charges without consent; credit packs are a balance spent atomically, apart from the quota. Every change is recorded with its source, old and new plan, and time.
- **Never in session claims**, which outlive a downgrade; a cached snapshot is expired by the event that changes the plan, not by time alone.
- **Tests:** the map plan by plan; each gated route's two refusals and its success; two reservations at the edge with exactly one winning; a replayed and an out-of-order webhook.

## Outgoing webhooks

Receiving webhooks is the main checklist's; this is sending them, against the [Standard Webhooks](https://www.standardwebhooks.com/) spec.

- **The event is written in the change's transaction** (the outbox), and a worker fans it out from a queue — one delivery per endpoint, its id built from the event and endpoint ids and created once. Flag a customer's server called on the request path, or an event queued after the commit where a crash loses it.
- **Payloads:** `{ type, timestamp, data }`, types `resource.action` past tense from one catalogue, each with one schema; versioned per endpoint like the API; under about 20 KB; built through the account's projection, never the stored document.
- **Signing:** `webhook-id`, `webhook-timestamp` and `webhook-signature` headers; HMAC-SHA256 over `id.timestamp.body` — the exact bytes sent — as `v1,<base64>`, re-signed on every attempt with that attempt's timestamp. Each endpoint has its own secret of 24–64 random bytes, shown once as `whsec_…` and stored encrypted; rotation sends both signatures for an overlap. Flag one secret shared across endpoints, a body re-serialised after signing, or a signature reused from the queued time. Asymmetric signing is the spec's `v2a`; flag a new `v1a`, which the spec has deprecated.
- **One attempt:** HTTPS `POST`, a 15–30 second timeout, no redirects followed, the response read to a few KB. 2xx succeeds; `410` disables the endpoint; `429` and `5xx` back off honouring `Retry-After`; `3xx` is a failure. Retries back off with jitter over about three days, each a new queue task, never a sleep. Per-endpoint concurrency and rate caps keep one slow customer from stalling the rest. Delivery is documented as at-least-once and unordered, and the payload carries a version or state to order by.
- **SSRF ([OWASP API7](https://owasp.org/API-Security/editions/2023/en/0xa7-server-side-request-forgery/)):** HTTPS, a hostname on a standard port, resolved and refused if private, loopback, CGNAT, link-local (`169.254.169.254`), unique-local or IPv4-mapped — checked at registration and on every attempt, with the connection pinned to the checked address. Sent from a network that can't reach internal services, with no cookies or internal headers, from published IPs. Flag a check at registration only, or a connection that resolves again.
- **Endpoints** are managed with their own permission verb and audited; a test event goes out on creation and on demand. **Every attempt is logged** (status, duration, a truncated response) with a TTL, visible to the customer, and replayable with the same event id.
- **Failing endpoints** are disabled after days of failure, with emails as failures start, before disabling and on disabling; pending events are kept; re-enabling is the customer's act after a test succeeds.
- **Tests:** endpoint SSRF cases (a private IP, a hostname resolving to one, a redirect); the signature against the spec's test vectors; the worker's success, retry, `410` and `Retry-After`.

## Email sending

What an email says is `emails`'; this is how it's sent, against [Gmail's](https://support.google.com/a/answer/81126) and [Yahoo's](https://senders.yahooinc.com/best-practices/) sender requirements.

- **Transactional and marketing mail are separate** — providers, or at least streams and subdomains — and each purpose has its own sender, with a reply-to a person reads on anything someone might answer.
- **SPF and DKIM on every sending domain, and DMARC published and aligned with the From domain** (`p=none` with reports to start). Gmail and Yahoo require all three of bulk senders, and a spam rate under 0.3% (Gmail recommends under 0.1%). DNS isn't in the repo: mark it "needs confirmation" with the records to check, unless the project records them.
- **One client per provider, one service per email.** A send never throws into the work that caused it: it logs (type, sender, count — never the address or body) and returns `false`. Flag a receipt failure that rolls back an order.
- **No account enumeration:** a reset or verification resend is queued and answered with the same success and timing whether or not the address has an account ([OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)).
- **One claim per message**, keyed by type, recipient and the causing event, released on failure, passed as the provider's idempotency key where it takes one. **Per-recipient budgets** on everything a caller can make the API send. Flag a webhook redelivery that sends twice.
- **Retries:** timeouts, 5xx and 429 only, with backoff and jitter honouring `Retry-After`; a 4xx is never retried. Bulk sends go through a queue at the provider's rate, never a loop in a request.
- **Suppression:** bounce and complaint webhooks are verified and recorded once; a hard bounce suppresses everything, a complaint everything but essential transactional mail, soft bounces only after repeats; the list is checked before every send. Non-production tiers send only to an allowlist or a sandbox — flag any path that can reach real users from local or test code.
- **One-click unsubscribe ([RFC 8058](https://www.rfc-editor.org/rfc/rfc8058)) on marketing and subscribed mail:** a `List-Unsubscribe` header with one HTTPS URI, `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, both covered by DKIM, plus a visible link in the body. The URI identifies the recipient and list by a signed token, since the POST carries no cookie; the POST answers without a redirect; a `GET` only shows a confirmation page, never unsubscribes. Honoured within two days (Yahoo). Flag it missing on subscribed mail, an unsubscribe on `GET`, or a redirect. Transactional mail doesn't carry it.
- **Building:** every user value HTML-escaped; links from user input checked as `http(s)`; header values stripped of `\r\n`; a plain-text part beside the HTML; HTML under about 100 KB (Gmail clips it); images PNG or JPEG on absolute HTTPS URLs; no tracking pixel or link rewriting on security and auth mail. Links point at the sending tier from per-tier constants, and a link that acts opens a page whose button acts, so a scanner's `GET` changes nothing.
- **Previews and tests:** a local preview route that 404s on deployed tiers; a test per email covering the subject, a hostile value escaped, the text part and the unsubscribe headers where they belong.
- **Marketing audiences** use per-tier ids, join only after a confirmation email with the consent recorded, carry the sender's postal address, and adding someone never throws.
