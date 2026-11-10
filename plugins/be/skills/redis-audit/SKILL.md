---
name: redis-audit
description: >-
  Manually invoked. Audits an app's Redis usage — key namespacing via central builders, TTL discipline on every write, atomic operations, single-client hygiene, per-request command cost, missed caching, dedup and rate-limit opportunities, and input and secret safety. Verifies each finding and writes a prioritized report. Only for apps that use Redis.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Redis audit

A **manually-invoked, red-team Redis audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/redis-audit.md`.

> **Self-contained** — this checklist is comprehensive on its own and needs no other skill installed. Where the house standard(s) **`redis`** (the authoring mirror of this audit), **`api-architecture`**, **`backend-security`**, and **`devops`** ARE present, also apply their house-specific rules as an enhancement.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[phase]` — `development` | `production`; sets the action-item tiers. Omitted → `production` (assume the app is live until told otherwise — the safer default).
- `[path]` — a file, directory, or PR/diff to scope the audit to; omitted → the whole repo.

## Audit protocol

**Mindset — reviewer/attacker first.** Don't assume code is fine because it looks careful; find the sequence that breaks it. Report only findings you can justify as real, each verified before it lands.

### Method

1. **Resolve phase** — use a phase arg (`development` | `production`) if given; else default `production` — assume the app is live with real users until told otherwise, so a CRITICAL finding gets Fix-Now urgency instead of a pre-launch discount. Phase sets the action-item tiers.
2. **Load the previous report** — if `_reports/redis-audit.md` exists, read it: carry unresolved findings forward (same ID, status `UNRESOLVED`), move fixed ones to "Resolved since last audit", and continue ID numbering. First run → skip Resolved and mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating.
5. **Write the report** to `_reports/redis-audit.md` (overwrite) and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — actively exploitable or broken now: data loss/leak, security breach, or total failure of the audited concern. Fix immediately.
- **HIGH** — a serious defect that will bite in production or blocks launch. Fix before shipping.
- **MEDIUM** — a real issue with a workaround or limited blast radius. Schedule it.
- **LOW** — minor, polish, or defense-in-depth.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/redis-audit.md`:

```
# Redis audit — <app/scope>

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
- **Why it matters:** <impact / who it affects> <· optional standard or criterion ref, e.g. WCAG 2.1.2 / OWASP A01>
- **Fix:** <the specific remediation>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Key namespacing | <X>/10 | <one-line justification> |
| TTL discipline | <X>/10 | <one-line justification> |
| Atomicity | <X>/10 | <one-line justification> |
| Connection hygiene | <X>/10 | <one-line justification> |
| Cost | <X>/10 | <one-line justification> |
| Missed opportunities | <X>/10 | <one-line justification> |
| Security | <X>/10 | <one-line justification> |

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

- **Full report** → `_reports/redis-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

First confirm the app actually uses Redis (a client/config/dependency). Then find the surface: the shared client module, the key builders, cache/rate-limit/dedup/lock helpers, and grep call sites (`redis.` ops, the Redis import, the rate-limit import). Every criterion needed is inlined below; if the related standards are installed they add house-specific depth (`redis` / `api-architecture` / `backend-security` / `devops`).

### Key namespacing

- **Built via central builders** — every key is constructed through the central key-builder constants, not an ad-hoc string literal or an inline template built at the call site.
- **Consistent prefixes** — each namespace uses one documented prefix; no prefix appears outside the key-builder module. (A rate-limit library that manages its own keys under its configured prefix is fine.)

### TTL discipline

- **Every write expires** — every `set`/cache entry carries a TTL (`ex`/`px`/`exat`/`pxat`), unless it's intentionally permanent with a comment saying why.
- **No unbounded keys** — no key grows without a lifecycle (memory + cost leak); no call removes a TTL (`persist`) or sets an unreasonably long / zero one without justification.
- **TTLs are sized to the job** — lockout counters ~15 min, refreshed on each failure and cleared on success; webhook dedup ≥ the provider's retry window (typically 7 days, never <24 h in prod); idempotency keys ~24 h; cache entries per call site by staleness tolerance; locks longer than the worst-case guarded operation. Flag a TTL that contradicts its purpose (e.g. a 1 h dedup key against a multi-day retry window).

### Atomicity

- **Atomic ops, not races** — counters/claims/scores use atomic primitives (`SET NX`, `INCR`, `ZINCRBY`, pipelines/transactions) rather than a read-modify-write (`get` then `set`) that can lose updates under concurrency.
- **Claim-once is atomic** — "do this exactly once" logic (a dedup claim, a lock acquire) uses `SET NX` with a TTL, not check-then-set; a lock releases only its own token.

### Connection hygiene

- **One shared client** — a single shared client instance, imported everywhere; no `new` client constructed per request, per helper, or per module.
- **Config through validated env** — connection URL/token come from a validated `env` object (schema-checked at boot), not raw `process.env` reads; a missing URL/token fails loudly at startup, not silently at first use. (If `devops` is installed, follow its env-validation pattern.)
- **Production instance uses `noeviction`** — any eviction policy (`allkeys-lru`, etc.) silently drops locks/dedup/rate-limit keys under memory pressure; correctness keys must error loudly, not vanish.
- **Right database per environment** — the classic misconfig signature is "429 never fires / no rate-limit keys appear": the app is pointed at the wrong environment's Redis database. Verify the configured instance matches the env.

### Cost

- **Commands per flow minimized** — trace a few representative request flows and count Redis commands; flag chatty loops and paths that fan out many small calls where a pipeline/batch (`mget`, a single pipeline) would do.
- **No redundant round-trips** — no repeated lookups of the same key in one request; no cache probe on a path that never benefits.
- **No dangerous full-scan / bulk ops** — no `KEYS`, `FLUSHALL`/`FLUSHDB`, or unbounded `SMEMBERS`/`HGETALL`/`LRANGE 0 -1` on hot or request paths (they block or scale with data size); prefer `SCAN`, bounded ranges, or a maintained index set.
- **Caches fail OPEN** — a Redis error or miss on a cache/read path falls back to the primary store (wrapped in try/catch) rather than throwing and taking down the request; a Redis blip must degrade performance, not availability. Flag a cache path that propagates the error.
- **Security/correctness primitives fail CLOSED** — rate limits, locks, webhook dedup, and idempotency keys must NOT fall back to a secondary store or skip the check when Redis errors; a 5xx on those routes is by design. Flag a fallback or catch-and-continue that quietly lets the request through.

### Missed opportunities

- **Webhook dedup** — an inbound webhook that processes events without a dedup claim (re-delivery causes duplicate side effects) — recommend the dedup helper.
- **Idempotency keys** — a side-effecting mutation (charge, payout, email, plan change) with no idempotency key / lock (a double-submit double-acts).
- **Rate-limit counters** — a sensitive/expensive route (auth, mutation) with no rate limit — recommend a per-identity, atomic (`INCR` + TTL, or a sliding-window library) rate limit sized to the route. (If `api-architecture` is installed, use its rate-limit tiers.)
- **Hot-read caching** — a hot read hitting the primary store every request for data that changes slowly should use a short-TTL cache; flag it, don't cache anything with a user's auth state/claims/token. Watch for a cache stampede on a popular key (many concurrent misses recomputing at once) where a short lock / single-flight would help.
- **Consistent serialization** — cached values are read back with the same codec they were written with (both JSON, or both raw); no `set(JSON.stringify(x))` paired with a `get` that assumes an object, and no silent type mismatch on read.

### Security

- **Input sanitized into keys** — any key built from user input is encoded/sanitized so a delimiter (`:`) or crafted value can't collide with or forge another namespace's key.
- **No secrets in keys or values** — no token/secret stored in plaintext or embedded in a key; the client token is never logged, echoed in an error, or returned in a response; no Redis client imported into a client/browser bundle (the token would ship to the client).

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
