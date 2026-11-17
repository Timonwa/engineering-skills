---
name: backend-security
description: >-
  Server-side security mapped to the OWASP Top 10 2025 and API Security Top 10 2023 — authorisation at object, function and field level, injection and stored rich HTML, SSRF, resource limits, business-flow abuse, races and idempotency, CSRF with Origin and Fetch Metadata, App Check and the Firebase web API key, secrets and config, failing closed, logging, and upstream APIs — each pointing to the skill that owns the mechanics. Use when building or reviewing route handlers, Server Actions, services, workers or webhooks.
model: opus
effort: high
---

# Backend security

The server is the only real trust boundary: anything the client could skip, the server enforces. This skill is the threat map — what each OWASP risk means on the server and the control that stops it — and it points to the skill that owns each mechanism rather than restating it. The browser's side is `frontend-security`; a full review is the manual `security-audit`.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The map

| Risk                                                                    | The control                                                           | Owner                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| A01 Broken Access Control · API1 BOLA · API5 BFLA · API3 property level | Re-authorise every object, function and field from the verified actor | `access-control`, below                |
| A01 (SSRF) · API7 Server-Side Request Forgery                           | Allowlisted destinations, resolved-IP checks, no redirects            | below                                  |
| A02 / API8 Security Misconfiguration                                    | Tight CORS, debug off, secure defaults, restricted API keys           | below, `env`, `devops`                 |
| A03 Software Supply Chain Failures                                      | Pinned actions, advisories, blocked build scripts                     | `devops`, `monorepo`                   |
| A04 Cryptographic Failures                                              | TLS, field encryption, a CSPRNG for every secret value                | below, `field-encryption`              |
| A05 Injection                                                           | Schemas at the boundary, parameterised queries, sanitised rich HTML   | below, `schemas-and-contracts`         |
| A06 Insecure Design · API6 Sensitive Business Flows                     | Abuse cases designed in: limits, atomic flows, bot checks             | below, `rate-limiting`                 |
| A07 Authentication Failures · API2 Broken Authentication                | Server-minted sessions, lockouts, MFA for operators                   | `auth`, `rate-limiting`                |
| A08 Software or Data Integrity Failures                                 | No unsafe deserialisation; signed webhooks                            | below, `api-architecture`              |
| A09 Security Logging and Alerting Failures                              | An audit log for privileged acts, a security log for refusals, alerts | `api-architecture`, `rate-limiting`    |
| A10 Mishandling of Exceptional Conditions                               | Fail closed, generic errors, no stack traces                          | below                                  |
| API4 Unrestricted Resource Consumption                                  | Budgets per tier, size and page caps, timeouts                        | `rate-limiting`, below                 |
| API9 Improper Inventory Management                                      | Versioned routes, the API reference as inventory, no debug routes     | `api-architecture`, `openapi-registry` |
| API10 Unsafe Consumption of APIs                                        | Validate, time-box and rate-limit every upstream call                 | below, `rate-limiting`                 |

## Authorisation

Broken access control is the top risk in both lists, and object-level authorisation (BOLA) the most reported API flaw. The model and guards are `access-control`'s; the rules that make them hold:

- **Every id is re-authorised**, not just the one in the URL: "move task X into project Y" checks access to Y as well. A body never names the owner, the caller or their role.
- **Every query is scoped to the tenant** the guard resolved; an id from the client alone never reaches another tenant's data, and a miss is a 404, never a 403 that confirms the id exists.
- **Fields are authorised too.** Writes take a `.pick()` allowlist and responses a projection (`schemas-and-contracts`); never bind a body to a document, or return a document whole to a caller who may not see all of it.
- **Only the guard decides.** The proxy, the service and the projection back it up, but the store's rules don't: the Admin SDK bypasses them, so they stop clients reaching the store directly and never catch a mistake in the guard (`firestore`).

## Injection and input

- **Every input crosses a schema** — body, query, params, form data, headers the code reads (`schemas-and-contracts`). Unknown keys are dropped; lengths and ranges are bounded.
- **No query or command built from strings:** parameterised SQL, scalar values in NoSQL filters (a raw request object as a filter is operator injection), no user input in a shell command, and no user input in a file path — resolve it and confine it to a base folder (path traversal).
- **No unsafe deserialisation** (A08): untrusted JSON never deep-merges into an object whose prototype it can reach (`__proto__`, `constructor`), and user input never reaches `eval`, a template engine or a dynamic `import`.

## Stored rich HTML

- **Sanitise on the server, at write time,** with an allowlist policy — the tags, attributes and URL schemes allowed (`http`, `https`, `mailto`) — from a maintained sanitiser (`sanitize-html`, or DOMPurify on the server). Everything else is stripped before the value is stored.
- **One policy, shared:** the allowlist sits in the shared constants, so the editor, the server's sanitiser and the browser's second pass (`frontend-security`) agree.
- **Plain text stays plain** — React escapes it when rendering; a field that isn't meant to hold HTML never goes through `dangerouslySetInnerHTML`.

## SSRF

When the server fetches a URL a user gave it — an import, a link preview, a customer's webhook endpoint, a URL an AI tool chose:

- **Allowlist the scheme and host** where the set is known; otherwise refuse private, loopback, link-local and metadata addresses (`169.254.169.254`, `metadata.google.internal`, `fd20:ce::254`) after resolving **every** A and AAAA record.
- **No redirects** (or re-check each hop), a tight timeout, and a response size cap. Pin the checked IP for the connection where the client allows it, or DNS rebinding swaps it afterwards.
- The guard is in [references/server-hardening.md](references/server-hardening.md).

## Resource use and business flows

- **Budgets per tier, lockouts and bot challenges** are `rate-limiting`'s; every route draws on one.
- **Cap every input:** request body size, page size (`api-architecture`), upload size and pixels (`image-handling`), decompressed size (a zip bomb), and a timeout on every outbound call.
- **No user-controlled regex**, and no regex on request input that can backtrack catastrophically (ReDoS).
- **Design the abuse case** (A06, API6): for each flow worth automating — sign-up, checkout, invites, redeeming a code — decide its limits, who can trigger it how often, and what an attacker gains, before building it.
- **Races:** a check and the action it guards commit together — a transaction or an atomic conditional update (`firestore`) — or a double-spend, a coupon reused or a seat oversold is one parallel request away.
- **Repeats:** internal work that must not run twice takes a short first-seen claim (`redis`); a public API accepts an `Idempotency-Key` and replays the stored response; a webhook is recorded once by its event id (`api-architecture`).

## CSRF

- **Cookie-authenticated mutations are checked in the proxy:** the `Origin` header must be on the allowlist, falling back to `Referer` when `Origin` is absent, and anything else is a 403. OWASP now adds **Fetch Metadata**: refuse a mutation whose `Sec-Fetch-Site` is `cross-site`. `SameSite=Lax` on the session cookie is a layer, not the defence (`auth`).
- **A `Bearer` request isn't open to CSRF** — the browser never attaches it on its own — but the same route still runs the origin check when a cookie is present.
- **A `GET` never changes state**, so no check is needed on it.
- **A Server Action is a public `POST` endpoint**: it authorises and validates on its own, every time, like a route. Next compares its `Origin` with `Host`; set `serverActions.allowedOrigins` only for a known proxy, and never treat the encrypted closure as a place to keep a secret.
- **Responses that vary on `Origin` or `Sec-Fetch-Site`** send `Vary` with those headers, so a cache can't serve one caller's answer to another.

## Firebase's public surface

- **The web API key is an identifier, not a secret** — it ships in every page. Restrict it in the Google Cloud console: **API restrictions** to the Firebase APIs the app uses, and for a web key, **application restrictions** to the tier's own domains. One key per tier, and never a non-Firebase API (a paid AI API, say) on the same key.
- **App Check** attests that a call comes from the real app, for every Firebase product the client calls directly; enforce it in production after a monitoring period, and verify its token on any API route that wants the same proof ([references/app-check.md](references/app-check.md)).
- **Clients reach no data directly** — the rules deny them (`firestore`) — except public files in the public bucket and uploads to a reserved path (`image-handling`).

## Secrets and configuration

- **Secrets** live in the secret manager, never in code, a public variable or a committed file; service accounts hold only the roles they use; a leaked secret is revoked at its issuer first (`env`).
- **CORS** names exact origins, never `*`, and allows credentials only with an exact origin. No debug routes, introspection or verbose banners on a deployed tier; security headers are set in every app's config (`frontend-security`, `devops`).
- **Secrets are compared in constant time** (`timingSafeEqual`), never with `===`; it throws on inputs of different lengths, so hash both sides first.
- **Absolute URLs come from configured origins** — an email's link, a redirect, a continue URL — never from `Host` or `X-Forwarded-Host`, which a caller can set.

## Errors and logging

- **Fail closed** (A10): a `catch` around a check denies, never allows. A timeout on a security check is a failure (`redis`, `rate-limiting`).
- **The client gets a generic message, a stable code and a correlation id**; the stack, the query, internal paths and which check failed stay in the server log (`api-architecture`).
- **Never log secrets, tokens or passwords**, and never put them in a URL, which proxies and browsers log. **Personal data** — an email, an IP — goes only into the access-controlled audit and security logs, with a retention period, never the general application log.
- **Privileged acts go to the audit log**, every other refusal to the security log with actor, method, path and IP, and spikes alert someone (`audit-log`, `rate-limiting`).

## Data in transit and at rest

HTTPS everywhere with HSTS (`frontend-security`); the platform's encryption at rest, and field encryption for the few values that warrant it (`field-encryption`); every token, nonce, id and salt from a CSPRNG (`crypto.randomBytes`, `crypto.randomUUID`), never `Math.random()` or a timestamp.

## Upstream APIs and inventory

- **Data from a third-party API is untrusted input**: parse it with a schema, time-box the call, honour its rate limits (`rate-limiting`), and decide what happens when it fails.
- **Webhooks and scheduled calls authenticate their own way** — a signature over the raw body or the scheduler's OIDC token, in constant time, with a replay window (`api-architecture`).
- **Know every route that's live:** each is versioned and in the API reference, a retired version is deleted, and no debug or staging route ships to production (`openapi-registry`).

Concrete snippets — the ownership check, the field mapper, the SSRF guard, token verification, the Fetch Metadata check, the sanitiser policy, failing closed — are in [references/server-hardening.md](references/server-hardening.md).

## Do / Don't

- **Do** re-authorise every id from the verified actor; scope queries by tenant; allowlist writes and project reads; parse every input; sanitise stored HTML on the server; guard outbound URLs; cap every input and design each flow's abuse case; commit checks and actions together; check Origin and `Sec-Fetch-Site` on cookie mutations; restrict the Firebase web key; fail closed with generic errors; keep secrets in the manager.
- **Don't** trust a client-sent id, role or owner; return a document whole to a caller who may not see all of it; build a query from strings; store raw user HTML; fetch a user's URL unchecked or follow its redirects; leave a route without a budget; compare secrets with `===`; return a stack trace; log a token or put one in a URL; share one API key across tiers or APIs.

## Related skills

Browser-side threats `frontend-security` · sessions `auth` · roles and guards `access-control` · budgets and lockouts `rate-limiting` · route order, webhooks and audit `api-architecture` · schemas `schemas-and-contracts` · rules `firestore` (and `firebase-security-rules-auditor`) · uploads `image-handling` · secrets `env` · CI and supply chain `devops` · encrypted fields `field-encryption` · the review `security-audit`.
