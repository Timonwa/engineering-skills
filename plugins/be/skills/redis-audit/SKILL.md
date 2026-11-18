---
name: redis-audit
description: >-
  Manually invoked. Redis audit — one client with a short timeout, keys from builders with a TTL on every write, a failure direction per primitive (caches open, locks and claims closed, rate limits by tier, timeouts as failures), caches parsed on every hit with group invalidation, owned locks and short claims released on failure, rate-limit layers and the client IP, eviction and tiers, and tests that prove each direction. Only for apps that use Redis.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Redis audit

A **manually-invoked, red-team Redis audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/redis-audit.md`.

> **Self-contained** — this checklist is comprehensive on its own and needs no other skill installed. Where **`redis`**, **`rate-limiting`** and **`api-architecture`** are installed, apply their house rules too.

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
2. **Load the previous report** — if `_reports/redis-audit.md` exists, read it: carry unresolved findings forward (same ID, status `UNRESOLVED`), move fixed ones to "Resolved since last audit", and continue ID numbering. First run → skip Resolved and mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating. Drop one the project records as a deviation, with its reason, in `AGENTS.md` or a doc it links.
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
- **Why it matters:** <impact / who it affects> <· optional ref, e.g. Upstash docs / OWASP API4>
- **Fix:** <the specific remediation>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Client | <X>/10 | <one-line justification> |
| Keys and TTLs | <X>/10 | <one-line justification> |
| Failure direction | <X>/10 | <one-line justification> |
| Caching | <X>/10 | <one-line justification> |
| Locks and claims | <X>/10 | <one-line justification> |
| Rate limits | <X>/10 | <one-line justification> |
| Storage settings | <X>/10 | <one-line justification> |
| Tests | <X>/10 | <one-line justification> |

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

First confirm the app uses Redis (a client, config or dependency). Then find the surface — the client module, the keys module, the cache, lock, claim and rate-limit helpers — and grep the call sites. The fix targets are `redis` and `rate-limiting`.

### The client

- **One client**, in the server's clients module, configured from the validated env; never constructed per request or helper; never imported into a browser bundle; its token never logged or echoed in an error.
- **A short timeout and few retries on the request path** (`signal: () => AbortSignal.timeout(…)`, one or two retries). The SDK's default of five retries with backoff stalls a cache that should fail open for seconds. Flag a plain `AbortSignal` passed as `signal`: the SDK then resolves an aborted command as `null` instead of throwing, and every command after it too. A `TimeoutError` is transient; an `UpstashError` such as `WRONGTYPE` is a bug no retry fixes, so retrying it is a finding.
- **Few round trips per request:** `mget` over many `get`s, pipelining for concurrent commands; flag an awaited command inside a loop.
- **The SDK serialises:** flag a manual `JSON.stringify` on write, or two writers of one key using different codecs.

### Keys and TTLs

- **Every key comes from a builder** in one keys module, in the `domain:action` grammar, with user-supplied segments encoded; flag a template string at a call site.
- **Each namespace documents its TTL default and failure direction** beside its builder.
- **Every key expires, with the TTL on the write itself** (`ex`, `px`, `exat`, `pxat`); flag a separate `expire` call a crash can skip, and a key without a TTL and no comment saying what bounds it — a cache group's generation key is the expected exception, with its comment. TTLs come from shared presets and fit their purpose: a lock at 2–3× the work's p99, a claim covering the work.

### Failure direction

- **Caches fail open:** the read and the write-back each sit in a `try`, and a failure falls back to the source. Flag a cache error reaching the response.
- **Locks and claims fail closed:** an unreachable check refuses. Flag a fallback or catch-and-continue.
- **Rate limits fail by tier:** a tier guarding a credential or a guessable secret fails closed, every other tier fails open. Flag closed-for-everything and open-on-credentials alike. `@upstash/ratelimit` resolves a timeout as a success with `reason: "timeout"`, which a closed tier must read as a denial.
- **A timeout is a failure in every direction**, and one helper has one direction. `@upstash/ratelimit`'s own `timeout` is set short, never left at its 5-second default.
- **State Redis owns** — session records, an operator's idle clock — fails closed, like a lock.

### Caching

- **One read-through helper**, the TTL chosen per call site by how stale the caller can bear.
- **Every hit is parsed with the value's schema**, a failure counting as a miss; values are stored in their wire form, never revived `Date`s or Firestore `Timestamp`s.
- **The mutation that changes the source invalidates the cache** in the same change; a group is retired by bumping its generation number, never by `SCAN` and delete on a request path.
- **No auth decision is cached** (claims, tokens, permission checks); Server Component reads use the framework's cache instead, never both for the same data; an expensive fetcher is protected from stampedes.

### Locks and claims

- **Locks** are acquired with `set(key, token, { nx: true, ex })` and a random token, released by an owner-checked compare-and-delete script, and sized above the work; contention throws a typed error, never a spin-wait; ordered writes carry a fencing token. A lock is never used as deduplication.
- **Claims** use `set nx ex` with a short TTL and are released when the work fails, so a retry runs. Dedup that must last — a webhook event, a payment — is a database record, and a public API's `Idempotency-Key` replay is stored in the database. Flag a claim not released when its work fails, and a long-lived dedup key in Redis. A claim left to expire after the work succeeds is correct.

### Rate limits

- **Layers:** a per-IP limit first in the handler, a per-account limit in the session guard, a per-key limit for API keys, a pooled per-organisation budget where many act for one tenant; the IP budget above the account budget.
- **The client IP** is read from the right of `x-forwarded-for`, skipping only your own proxies; IPv6 is keyed by its /64 after unmapping `::ffff:`; no usable IP shares an `unknown` bucket. A frontend server forwards the visitor's IP only with a verified platform identity token, and a high-volume browser call goes straight to the API.
- **Sliding window or token bucket, never a fixed window**; limiter instances constructed once; each route its own action name.
- **Lockouts** count failures per (IP, email) and per account, lapse on their own, and clear on success; a locked account answers exactly like a wrong password, and a reset link still works while locked. Email sends have a per-recipient budget.
- **Deny lists** carry a reason and an expiry, and nothing blocks addresses automatically. Calls to providers honour their 429 and `Retry-After` with capped, jittered retries, and bulk sends go through a queue.
- **Each 429 and lockout is logged** with its tier, action and key kind, never the full key or address, and spikes alert someone.

### Storage settings

- **Eviction off** wherever locks, claims or rate limits live: on Upstash that's the default, and turning it on uses optimistic-volatile, which evicts keys with a TTL first; on self-hosted Redis, `noeviction`, with `allkeys-lru` only on a cache-only database. **One database per tier**, with its own credentials — "429 never fires" is the sign of an app pointed at another tier. Both are console settings: infer what the env and config show, else "needs confirmation".
- **No `KEYS`, `FLUSHALL` or unbounded `SMEMBERS`, `HGETALL` or `LRANGE 0 -1`** on a request path.

### What never lives in Redis

- **Source-of-truth data**, a second session store or pub/sub beside the auth system's or the database's own, and secrets in a key or value. Session records `auth` keeps here are state Redis owns, not a finding.

### Tests

- **A fake client that fails or times out on demand**, and a test proving each primitive's direction: a cache serves the source, a lock and a claim refuse, a claim is released when the work throws, a closed tier refuses and an open tier passes on a Redis error, two addresses in one IPv6 /64 share a key, every 429 carries its headers, and the account lockout is stricter than the IP budget on the same route.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
