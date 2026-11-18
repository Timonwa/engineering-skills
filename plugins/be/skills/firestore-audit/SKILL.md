---
name: firestore-audit
description: >-
  Manually invoked. Firestore audit — clients denied and the data layer the only caller, one Admin client, Timestamps converted before parsing, reads that match the response (batched, chunked at 30, counted, projected), transactions, counters and batches over 500, drift repair, cursor pagination, TTL and cascade deletes, idempotent triggers, indexes by edition, rules and their tests, and backups. Verifies each finding and writes a prioritised report.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Firestore audit

A **manually-invoked, red-team Firestore audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/firestore-audit.md`.

> **Self-contained** — this checklist is comprehensive on its own and needs no other skill installed. Where **`firestore`** is installed, apply its house rules too; rule internals go to **`firebase-security-rules-auditor`** (the official Firebase skill, where installed).

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
2. **Load the previous report** — if `_reports/firestore-audit.md` exists, read it: carry unresolved findings forward (same ID, status `UNRESOLVED`), move fixed ones to "Resolved since last audit", and continue ID numbering. First run → skip Resolved and mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating. Drop one the project records as a deviation, with its reason, in `AGENTS.md` or a doc it links.
5. **Write the report** to `_reports/firestore-audit.md` (overwrite) and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — actively exploitable or broken now: data loss/leak, security breach, or total failure of the audited concern. Fix immediately.
- **HIGH** — a serious defect that will bite in production or blocks launch. Fix before shipping.
- **MEDIUM** — a real issue with a workaround or limited blast radius. Schedule it.
- **LOW** — minor, polish, or defense-in-depth.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/firestore-audit.md`:

```
# Firestore audit — <app/scope>

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
- **Why it matters:** <impact / who it affects> <· optional ref, e.g. Firestore best practices / OWASP A01>
- **Fix:** <the specific remediation>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Access boundary | <X>/10 | <one-line justification> |
| Reads | <X>/10 | <one-line justification> |
| Writes and atomicity | <X>/10 | <one-line justification> |
| Pagination | <X>/10 | <one-line justification> |
| Lifecycle | <X>/10 | <one-line justification> |
| Indexes | <X>/10 | <one-line justification> |
| Security rules | <X>/10 | <one-line justification> |
| Backups | <X>/10 | <one-line justification> |

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

- **Full report** → `_reports/firestore-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

Trace each endpoint through route → service → data function, counting Firestore operations. The fix target is `firestore`, with its `references/patterns.md`.

### The access boundary

- **Clients are denied every read and write**; a path opened for a client feature is read-only, checks ownership and membership in the rule, and its listener is unsubscribed on unmount.
- **Only the data layer calls Firestore.** Flag `collection()` or `doc()` in a route, action, component or service.
- **One lazy Admin client** kept on `globalThis`, with `ignoreUndefinedProperties: true`; credentials from the platform (Application Default Credentials), never a key file in the repo or a public variable.

### Reads

- **Collection paths come from constants and builders**; flag a literal path.
- **Every document is parsed with Zod on the way out**, through the tolerant read schema, with `Timestamp` converted to an ISO string first; flag a `Timestamp` reaching a contract or a response.
- **Reads match the response:** N+1 lookups batched (`getAll`, `in`); `in` and `array-contains-any` chunked at 30 (Firestore's cap) and run in parallel, `getAll` chunked where the project chooses; counts with `count().get()`; filters and sorts in the query, never in memory; `.select()` where a large document is read for a few fields; lists through a `.pick()` projection.
- **A sorted field exists on every document** — `orderBy` silently drops those without it.
- **Listeners** are scoped, used only where live data is needed, and torn down.

### Writes and atomicity

- **Read-then-write is a transaction**, with calls to the outside world after the commit; uniqueness uses `create()` or a transaction; counters use `FieldValue.increment()`.
- **Timestamps:** `serverTimestamp()` on writes, `Timestamp.now()` inside a transaction; `createdAt` and owner fields never change after create.
- **Writes take a validated, allowlisted body.** Batches group related writes and stay under the 10 MiB request size — there is no 500-write limit any more; a large volume of independent writes uses `BulkWriter`.
- **Denormalised data** — the counts and names lists read — is updated in the same transaction or batch as its source; a delete reverses a counter only if it was counted; a scheduled recount repairs drift and logs each correction; a hot counter is sharded.
- **No unbounded growth** on one document — an array or map that grows without limit is a subcollection.

### Pagination

- **Cursor pagination** — a document-id cursor, `limit + 1` to detect more, `documentId()` as the tie-breaker — with a capped page size. **Every list query has a limit**; a bounded lookup (an `in` chunk, a `create()`, a recount job walking a collection in pages) isn't a finding.

### Lifecycle

- **TTL** for expiry with no side effects: one `expiresAt` per collection group, set from a retention constant, reads still filtering `expiresAt > now`. TTL doesn't cascade, so a parent with subcollections needs its own cleanup. Whether the policy is set on every tier is console state — check with `gcloud firestore fields ttls list`, else "needs confirmation".
- **A delete with consequences** flips a status, answers 202, and a trigger cleans up, guarded against work in progress.
- **Triggers are idempotent** on the event id, 2nd-gen, one codebase per concern, with region, memory and timeout set deliberately and secrets from the secret manager. Scheduled work runs through the API's cron route, not scheduled functions.

### Indexes

- **Every query that needs a composite index has one** in the committed `firestore.indexes.json`, changed in the same PR: an equality filter with a range or an `orderBy`, or several ranges. Queries of equality filters alone can merge single-field indexes and need no entry. On the Standard edition a missing index throws `FAILED_PRECONDITION` in production — the emulator doesn't enforce indexes — so such a query without an entry is HIGH. On the Enterprise edition an index is optional, a speed and cost choice.
- **Both directions:** an index no query uses costs writes and storage. A new index deploys before the code that needs it, an old one is removed only after nothing uses it, and never with `--force` on production.

### Security rules

- **Deny by default** with a catch-all; each opened path commented. Create and update validated by one function; ownership and the role from `request.auth` (the token), not a `get()`; size and type caps on every field; `createdAt`, owners and roles unchanged; append-only collections `write: false`; `hasOnly` always paired with ownership. `rules_version = '2'`.
- **Rules have unit tests** (`@firebase/rules-unit-testing`) in CI, covering a signed-out caller and another account, with `assertSucceeds` for each caller a rule allows; `--dry-run` alone isn't a test. Whether the console matches the repo's rules file can't be seen from code — "needs confirmation". Rule internals → `firebase-security-rules-auditor` (the official Firebase skill, where installed).

### Backups and recovery

- **Delete protection on every tier, point-in-time recovery on production, and a scheduled backup** (weekly is enough; a development tier holding only seed data may skip it) — console state, checked with `gcloud firestore databases describe` and `gcloud firestore backups schedules list`, else "needs confirmation". A restore goes into a new database; whether it's been rehearsed is process, "needs confirmation". A migration that reshapes documents ships with its way back or is recorded as one-way.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
