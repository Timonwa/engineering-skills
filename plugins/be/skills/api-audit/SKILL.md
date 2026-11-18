---
name: api-audit
description: >-
  Manually invoked. API-layer audit — the six-step route, thin routes over services, validation at every boundary, the envelope, typed errors and no-store, concurrent edits and long-running work, a named rate limit on every route, cursor lists, versions and transitions, the audit log, each route's reference entry and test, cron, webhook and proxy rules, and where present maintenance mode, flags, plan entitlements, outgoing webhooks and email sending. Verifies each finding and writes a prioritised report.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# API audit

A **manually-invoked, red-team API audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/api-audit.md`.

> **Self-contained** — this checklist is comprehensive on its own and needs no other skill installed. Where **`api-architecture`**, **`rate-limiting`**, **`audit-log`**, **`openapi-registry`**, **`access-control`**, **`schemas-and-contracts`**, **`image-handling`**, **`maintenance-mode`**, **`feature-flags`**, **`plan-entitlements`**, **`webhook-delivery`** and **`transactional-email`** are installed, apply their house rules too.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[phase]` — `development` | `production`; sets the action-item tiers. Omitted → the audit phase the project's `AGENTS.md` records, else `production` (assume the app is live until told otherwise — the safer default).
- `[path]` — a file, directory, or PR/diff to scope the audit to; omitted → the whole repo.

## Audit protocol

**Mindset — reviewer/attacker first.** Don't assume code is fine because it looks careful; find the sequence that breaks it. Report only findings you can justify as real, each verified before it lands.

### Method

1. **Resolve phase** — use a phase arg (`development` | `production`) if given; else the audit phase the project's `AGENTS.md` records; else `production` — assume the app is live with real users until told otherwise, so a CRITICAL finding gets Fix-Now urgency instead of a pre-launch discount. Phase sets the action-item tiers.
2. **Load the previous report** — if `_reports/api-audit.md` exists, read it: carry unresolved findings forward (same ID, status `UNRESOLVED`), move fixed ones to "Resolved since last audit", and continue ID numbering. First run → skip Resolved and mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating.
5. **Write the report** to `_reports/api-audit.md` (overwrite) and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — actively exploitable or broken now: data loss/leak, security breach, or total failure of the audited concern. Fix immediately.
- **HIGH** — a serious defect that will bite in production or blocks launch. Fix before shipping.
- **MEDIUM** — a real issue with a workaround or limited blast radius. Schedule it.
- **LOW** — minor, polish, or defense-in-depth.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/api-audit.md`:

```
# API audit — <app/scope>

**Date:** <YYYY-MM-DD> · **Phase:** <phase> · **Mode:** Report-only · **Branch:** `<branch>` · **Scope:** <what was audited> · **Overall:** <X>/10

## Score change (previous → current)
| Metric | Previous | Current | Δ | Trend |
| --- | --- | --- | --- | --- |
| Overall | <prev/10 or N/A> | <cur/10> | <+N / -N / 0> | <▲ / ▼ / ■ / N/A> |

## Findings
| ID | Severity | Category | Status | Issue | Location |
| --- | --- | --- | --- | --- | --- |
| 1 | HIGH | <category> | NEW | <one-line issue> | `file/path:line` |

### F1 — <title>
- **What:** <the defect, and the concrete evidence that proves it real>
- **Why it matters:** <impact / who it affects> <· optional standard ref, e.g. OWASP API4 / RFC 9110 §15.5.10>
- **Fix:** <the specific remediation>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| The route | <X>/10 | <one-line justification> |
| Validation | <X>/10 | <one-line justification> |
| Responses and errors | <X>/10 | <one-line justification> |
| Guards | <X>/10 | <one-line justification> |
| Rate limiting | <X>/10 | <one-line justification> |
| Lists | <X>/10 | <one-line justification> |
| Paths and transitions | <X>/10 | <one-line justification> |
| Audit log | <X>/10 | <one-line justification> |
| Routes complete | <X>/10 | <one-line justification> |
| Cron, webhooks and proxy | <X>/10 | <one-line justification> |
| Maintenance mode | <X>/10 or N/A | <one-line justification> |
| Feature flags | <X>/10 or N/A | <one-line justification> |
| Plan entitlements | <X>/10 or N/A | <one-line justification> |
| Outgoing webhooks | <X>/10 or N/A | <one-line justification> |
| Email sending | <X>/10 or N/A | <one-line justification> |

## Action items
Tiers by phase — `development` → **Fix Now / Before Launch / Post-Launch**; `production` → **Fix Now / Next Release / Backlog**. Each task references a finding ID.

### <Tier>
| # | Priority | Task (finding ID) | Effort |
| --- | --- | --- | --- |

## Resolved since last audit
| ID | Issue | How it was resolved |
| --- | --- | --- |
```

### Output

Every run produces two things:

- **Full report** → `_reports/api-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

Scope it first: a dedicated API app, route handlers in a frontend (webhooks, a backend-for-frontend), or Server Actions calling services — the last drops the HTTP-envelope checks but keeps services, validation, guards and the audit log. Judge every handler against the standard, not its neighbours: a shape every sibling shares can still be wrong, and consistent-but-wrong is one **systemic** finding with a count. The fix targets are `api-architecture`, `rate-limiting`, `audit-log` and `openapi-registry` (write schemas: `schemas-and-contracts`; upload bytes: `image-handling`), and the last section names its own. A category the app doesn't have scores `N/A` and leaves the overall score.

### The route

- **Six steps, in order:** rate limit → authorise → validate → delegate (one service call) → audit → respond. Flag a reordered or doubled step, or a skipped one the route needs. Not findings: no audit step on a non-privileged route; no guard on health and docs; a webhook `POST`, a scheduler tick and a queue worker gated by signature or OIDC token instead of a user guard.
- **No logic, store access or branching in the route.** The server barrel exports only services and guards; flag a route importing from `data/` or `clients/` around it.
- **Services** — one per resource — take validated input and the actor, return plain objects and throw typed errors; logic one audience needs sits in that audience's service, never a forked copy.

### Validation

- **Body, query, params and form data** each pass the shared schema through the project's validators; `ctx.params` is awaited, then validated. Flag raw `request.json()`, `searchParams` or `ctx.params`, and an inline schema duplicating a shared one.
- **Write schemas are `.pick()` allowlists**; a partial update strips defaults so omitted fields keep their values. Flag `.omit()` write schemas and bodies spread into writes. Uploads are checked by their bytes, not their label.

### Responses and errors

- **One envelope** — `{ success, data, message?, metadata? }` or `{ success: false, error: { code, message, details? } }`, typed in the shared contracts — **built only by `ok`, `created`, `noContent`, `paginated` and `errorResponse`**; flag a hand-rolled `Response`. Every handler's `catch` delegates to `errorResponse`.
- **Typed errors with stable codes:** 400 with every failing field, 401, 403, 404, 409, 412, 429 with `Retry-After`, 503; an unexpected error is a 500 whose message is hidden outside local. A missing composite index is a 503 with its own code; a held lock is a 409.
- **Every response sends `Cache-Control: no-store`** from the builders; a public, non-personal read opts into shared caching deliberately. Flag a cacheable personal response.
- **Concurrent edits:** an update to a record two people can edit checks a version (`If-Match` → 412, or a version field → 409); flag a blind overwrite.
- **Long-running work** answers 202 with an operation to poll; flag a request held open for an export or import.

### Guards

- **Every route with a user runs its guard** — a session for the caller's own record, a verb for everything else — with identity from the verified token (`Bearer` or the session cookie, revocation checked). Depth → `access-control-audit`.

### Rate limiting

- **Every route is limited, first** — no route unlimited; health, docs and a webhook's `GET` ping take a generous public tier of their own. A scheduler tick and a queue worker behind their OIDC token, and a webhook `POST` behind its signature, skip the user layers. `@upstash/ratelimit`'s own `timeout` is set short, never left at its 5-second default.
- **Each route has its own `domain:action` name** (flag two routes sharing one) on a named tier carrying a comment. The per-account layer runs in the session guard; keys have their own tier.
- **Budgets fit the work:** costly requests weigh more (`rate`), heavy routes cap concurrent jobs with an expiring lock, and a plan raises a budget from the account, never the request. Sign-up has its own tier; challenge tokens (Turnstile, reCAPTCHA, App Check) are verified on the server; nothing that costs money works before the email is verified.
- **Over budget:** 429 with `Retry-After`, through the error envelope; a public API sends `RateLimit-Policy` and `RateLimit`; an optional-session read rethrows the 429 rather than serving a guest. Credential and secret tiers fail closed, the rest open; sign-in locks per (IP, email) and per account; auth email has a per-recipient budget. Depth → `redis-audit`.

### Lists

- **Cursor pagination, never offset**, through one shared helper, with a capped, validated page size and the full `metadata` (`limit`, `total`, `totalPages`, `nextCursor`, `prevCursor`, `hasNext`, `hasPrevious`), the total from a stored counter.
- **A list returns a projection**, and sorts and filters only on allowlisted fields, each with its index; an unknown field is a 400.

### Paths, versions and transitions

- **Every route sits under a version**, and consumers build every path from one version constant; a breaking change adds `v2`; a retiring version sends `Deprecation` and `Sunset` with a link to migration notes. Paths group by resource: `<resource>/route.ts` lists and creates, `<resource>/[id]/route.ts` reads, updates and deletes.
- **A state transition is its own `POST` sub-route** with its own verb and audit action; `DELETE` removes, never switches off. Repeating a transition returns the current state with no second side effect, or a 409.

### Audit log

- **Every privileged mutation and security-relevant action writes an entry** through one helper — after the response (`after()`), or in the change's transaction where both must exist — and a failed write never fails the request. Flag an unawaited promise a serverless instance can freeze.
- **What earns one:** privileged refusals and failed second-factor or step-up checks; ordinary refusals go to the security log with actor, method, path and IP. A write retries and its final failure goes to the error log and alerts — never lost silently.
- **The entry:** an action from one typed list, the result, the scope, the actor's kind, id and email (both people when an operator acts as a customer), the target and what changed (never a secret or token), the IP, user agent, method, path and request id, and the server clock's time in UTC.
- **Kept trustworthy:** no route edits or deletes an entry and the rules deny clients; entries are also shipped to write-once storage or hash-chained; retention runs by policy and a TTL field; deleting a user never deletes their entries; reads are scoped per audience behind their own verb, and reads and exports are audited. Each privileged route's test asserts its entry and its refused-call failure, plus a test over the action list.

### Each route ships complete

- **Its request and response schemas and any composite index; its API-reference entry**, registered from the handler's own schemas for every exported method (auth mirroring the guard, a response schema whenever data returns, a `required` body, the `paginated` flag, uploads as binary, a tag from the closed typed list, a verb-first `summary`, `.meta({ id, examples })`, a stable `operationId`, `deprecated: true` on a retiring version), **a colocated `route.test.ts`** calling the exported handler with a real `Request`, and the path in each consumer's endpoints file. A coverage test fails when a route has no entry or an entry has no route, local-only routes excluded by an explicit prefix list; outgoing webhooks are registered too. CI lints the spec (Spectral or Redocly) and runs `oasdiff breaking --fail-on ERR`; the docs routes take a public rate limit.

### Cron, webhooks and queues

- **Cron:** one scheduler entry hits one dispatcher, with no user rate limit; each task is wrapped and the dispatcher returns `{ results, errors }`, so one failure never stops the rest; the guard verifies the OIDC token's exact audience, the scheduler's service account and `email_verified`; a local bypass needs both a flag and the local tier; `?task=` rejects an unknown name; a heartbeat records only scheduled ticks, never by-name runs, and its `GET` answers 503 after missed ticks; tasks are idempotent and fit the attempt deadline, or chunk.
- **Webhooks:** the signature is verified over the raw body, in constant time, before parsing, with a timestamp tolerance against replays — a bad or missing one is a 401, and old and new secrets both verify during a rotation; the event is recorded once by its id in a transaction and forgotten on failure, or queued; slow work runs from a queue; the full provider payload is kept; each event is handled from its own state, ignoring one older than the record. Tests sign a body, repeat it as a no-op, and send a bad signature.
- **Queued jobs** are checked by the queue's OIDC token and idempotent on their id.

### Health, docs and the proxy

- **Health** answers only that it's up, never its dependencies, and a probe that must never be throttled reaches it by network or identity, not an open exemption; **docs** are served only on the tiers meant to show them.
- **The proxy** holds the CORS allowlist (no `*` with credentials), the CSRF check on mutations (`Origin`, and `Sec-Fetch-Site` not `cross-site`) and the maintenance gate. It is never the authorisation layer.

### Switches, plans, outgoing webhooks and email

Each runs only where the app has it; the full checks, with the standard behind each, are in [references/switches-plans-webhooks-email.md](references/switches-plans-webhooks-email.md).

- **Maintenance mode** — gates in the API's proxy and each frontend's, never the admin app, health, cron, inbound webhooks, `robots.txt` or the bypass; a 503 with `Retry-After` and `no-store`, never a 200; a bad bypass token is a 404; both gates fail open.
- **Feature flags** — never a permission, plan or config; one typed registry with coded defaults; one server-side evaluation that serves last-known values, then defaults; audited transitions; owners and removal dates. The 404 and its order are `access-control-audit`'s.
- **Plan entitlements** — one map and one effective-entitlements function, never a plan name; changes only from verified webhooks; limits reserved in the work's transaction; keep data over a limit; never in claims. The order and the 403 codes are `access-control-audit`'s.
- **Outgoing webhooks** — an outbox in the change's transaction, sent from a queue; Standard Webhooks signing per endpoint; retries over days; SSRF checks on every attempt; a delivery log with replay.
- **Email sending** — SPF, DKIM and aligned DMARC; a send never fails its work; one claim per message; suppression before every send; RFC 8058 one-click unsubscribe on subscribed mail; escaped values and a text part.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
