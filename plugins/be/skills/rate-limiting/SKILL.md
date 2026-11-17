---
name: rate-limiting
description: >-
  Rate limits for a Next.js API on Upstash — an edge layer, a per-IP flood layer, and per-account, per-key and per-organisation budgets; named tiers by what a route does, sliding window or token bucket, cost and concurrency limits, rate limit versus quota, the trusted client IP (IPv6 by /64), fail-open versus fail-closed tiers, lockouts, bot and sign-up abuse, 429 with Retry-After and the IETF RateLimit fields, limits on calls to providers, alerts, and sizing from real traffic. Use when adding a route, a budget, a lockout, or debugging a 429.
---

# Rate limiting

Every route draws on a named budget, counted in Redis, so no caller — a script, a stolen session, a busy office — can take more than its share or guess its way in. OWASP's API4 asks for limits fitted to what each operation costs and risks, not one blanket number; the budgets here are chosen per route for that reason.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Layers

- **At the edge, before the app** — the platform's or a CDN's firewall and rate rules absorb volumetric floods and known-bad traffic. An application limit counts in Redis on every request, so it stops abuse of the product, never a flood of the network.
- **Per IP, first in the handler** — `applyRateLimit(request, tier, "domain:action")`, before validation or auth, so a flood costs one Redis call, not a token verification. It's the flood shield, and always the looser layer: an office, a campus, a venue or a mobile carrier puts many people behind one address.
- **Per account, inside the session guard** — once the token is verified, the guard counts the caller on their own budget (writes by default for mutating methods, reads otherwise), so every guarded route gets it without remembering. This is where fairness between real callers lives.
- **Per API key**, for routes that take keys — the key is the identity, on its own tier (`access-control`).
- **Per organisation**, where many members or keys act for one tenant — a pooled budget above the per-caller ones, so one customer's integration can't starve the rest.

A per-IP limit alone locks out strangers who share an address; a per-account limit alone can't run before the caller is known. Every route has both, with the IP budget above the account budget on the same route.

## Budgets

- **Named tiers in one constants file, chosen by what the route does** — credential flows, sensitive acts (role changes, deletions), ordinary writes, reads, anonymous reads, and any bulk shape (uploads) that fits none of them. A bulk route gets its own tier rather than stretching `WRITE`, so other writes keep their budget.
- **Every tier carries a comment** saying what traffic it allows and what it stops. A number without a reason can't be reviewed.
- **Each route has its own `domain:action` name** (`auth:sign-in`, `admin:users:suspend`); a shared name merges two routes into one counter.
- **Sliding window by default; token bucket where bursts are normal** — a key's batch job or a client syncing after being offline — so a short burst passes while the average holds. Never a fixed window: a caller stacks the end of one window against the start of the next for twice the budget.
- **Weigh a request by its cost** when routes in one tier differ widely — an export or a bulk write spends several units (`rate` on the limit call), a read one.
- **Cap concurrency on heavy routes** — exports, reports, generation — at a few in flight per caller, with a lock that expires (`redis`); a request rate alone lets a caller start many slow jobs at once.
- **A plan may raise a budget**, read from the account's plan, never from the request. A rate limit protects the service over seconds or minutes; a **quota** — calls, sends or storage per billing period — is a product limit, counted and enforced as an entitlement (`plan-entitlements`).
- **Size from real traffic.** Set each budget above the observed p99 of legitimate use, keep the limiter's analytics on until real traffic has been seen, and treat a 429 on a tier that isn't a brute-force target as a wrong number, not a bad caller. The numbers are the project's (`AGENTS.md`); don't publish them.
- **No route is unlimited.** Public routes with no user — health, docs, a webhook's `GET` ping — take a generous public tier of their own. Only routes with their own gate skip the user layers: a scheduler's tick behind its token, a webhook `POST` behind its signature (`api-architecture`).

## The client IP

- **Behind a load balancer, trust only the hops your own infrastructure appended.** Read `x-forwarded-for` from the right, skipping the known proxies; everything to the left is whatever the client sent. Confirm the service is reachable only through that balancer, or a direct caller can forge the header.
- **Key IPv6 by its /64**, the block one customer is usually given; a key per full address lets one machine rotate through billions of them. Unmap an IPv4-mapped address (`::ffff:203.0.113.7`) to its IPv4 form first, so one caller has one key.
- **A frontend server calling the API** makes every visitor arrive from the frontend's address. Have it forward the visitor's IP with proof it's really your server — a platform-signed identity token (on Google Cloud, the service account's ID token with the API as audience), verified by the API — and trust the forwarded IP only when that proof checks out.
- **A high-volume browser call goes straight to the API**, not through the frontend server, which would otherwise share one IP budget across every caller.
- **No usable IP** shares an `unknown` bucket and logs a warning, rather than skipping the limit.

## When Redis fails

| Tier                                      | On a Redis error or timeout                                     |
| ----------------------------------------- | --------------------------------------------------------------- |
| Guards a credential or a guessable secret | **Fails closed** — the request is refused; no store, no guesses |
| Everything else                           | **Fails open** — logged, and the request goes through           |

An outage should cost the limit, not the product — except where an open window is unlimited guessing. `@upstash/ratelimit` resolves a timed-out call as a success with `reason: "timeout"`; a closed tier reads that as a denial. The client and its settings are `redis`'s; the SDK's options are the official `upstash-ratelimit-js` skill's.

## Lockouts

A lockout counts **failures** of a check, on top of the request budget, and fails closed:

- **Sign-in:** per (IP, email), so one address can only lock itself (five failures, fifteen minutes is common); **and per account**, so guesses spread across many addresses still meet a limit (OWASP; NIST caps consecutive failures at 100). Both locks lapse on their own, so the owner can't be locked out for good, and a reset link still works while locked. A success clears both. A locked account answers exactly like a wrong password.
- **Second factors and passcodes:** a few wrong codes lock that factor or that resource for a while (`auth`, `access-control`).
- **Email sends:** each address a sign-in link, reset or verification goes to has its own budget, however many IPs ask, checked just before the send — so nobody can flood someone's inbox through the API.
- A test keeps the account lockout stricter than the IP budget on the same route; otherwise the budget, not the lockout, ends the guessing.

## Bots and sign-up abuse

- **A challenge on anonymous forms that cost something** — sign-up, password reset, contact, anything that sends email — shown after a soft threshold or on every submit, and verified server-side before the work (Turnstile, reCAPTCHA; App Check for the app's own clients). A token the API doesn't verify protects nothing.
- **Sign-up gets its own tier** per IP, plus the per-recipient email budget; nothing that costs money or sends to others works until the email is verified (`auth`).
- **Deny lists are for confirmed abuse**, each entry with a reason and an expiry. Never block addresses automatically from a reputation feed or a burst of 429s: a carrier's shared address carries thousands of real people.

## Over budget

- **429 with `Retry-After`** (seconds, from the limiter's reset), through the shared error envelope with a stable code (`api-architecture`).
- **The IETF `RateLimit-Policy` and `RateLimit` fields** (`"name";q=<quota>;w=<window>` and `"name";r=<remaining>;t=<reset>`) say which budget was spent. A public API sends them on every response, so integrators can pace themselves.
- **The retry contract is documented for integrators:** wait for `Retry-After`, otherwise back off exponentially with jitter, cap the attempts, and retry automatically only a request that's safe to repeat. The project's own clients follow it too.
- **A signed-in caller over budget stays over budget**: an optional-session read rethrows the 429 instead of carrying on as a guest.
- **When the service itself is overloaded**, shed the least important work first with **503** and `Retry-After` — 429 says "you sent too much", 503 says "we can't right now".

## Calls to providers

Every provider the API calls — email, payments, media, search — has limits of its own:

- **Honour its 429 and `Retry-After`**, back off with jitter, and cap retries; a tight retry loop gets the whole account throttled or banned.
- **Pace bulk work through a queue** at the provider's published rate, rather than sending in a loop from a request.
- **Webhooks to customers' endpoints** are capped per endpoint (`webhook-delivery`).
- **Budget what a caller can make the API send** — an invitation or a share by email spends the sender's budget, so one account can't spend the provider's whole allowance.

## Watching

- **Alert on spikes** of 429s, lockouts and fail-closed denials, per tier: a spike is an attack in progress or a budget set wrong, and both need a person.
- **Log each 429 and lockout** with the tier, the action name and the key's kind (IP, account, key), never the key or the address in full where the logs aren't access-controlled (`api-architecture`).

## Testing

Mock `@upstash/ratelimit` with a fake whose next verdict a test sets (`testing`). Assert the 429 and its headers, that a closed tier refuses on a Redis error, that an open tier lets the request through, and that two addresses in one IPv6 /64 share a key.

## Do / Don't

- **Do** stop floods at the edge; rate-limit first in every handler; count both IP and account; key IPv6 by /64; give each route its own action name; comment every tier; weigh costly requests; cap concurrent heavy jobs; fail closed on credentials and secrets only; trust only your own proxy's hops; lock out per account as well as per IP; budget email sends per recipient; verify every challenge token on the server; honour providers' limits; alert on spikes; size from real traffic.
- **Don't** leave a public route unlimited; use a fixed window; key a signed-in limit by IP alone; trust the leftmost `x-forwarded-for`; proxy a high-volume browser call through the frontend server; fail open on a lockout; publish the numbers; let a lockout be permanent; auto-block shared addresses; treat a quota as a rate limit; retry a provider in a tight loop.

## Related skills

Where the call sits in a route `api-architecture` · the Redis client, locks and failure directions `redis` · the SDK `upstash-ratelimit-js` (official) · sign-in, verification and second factors `auth` · keys and passcodes `access-control` · quotas `plan-entitlements` · other resource limits (body size, page size, timeouts) `backend-security` · the limiter fake `testing`.
