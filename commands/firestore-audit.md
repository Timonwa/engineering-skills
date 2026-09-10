---
name: firestore-audit
description: >-
  Manually invoked. Firestore cost, performance and data-modeling review — reads and writes per endpoint, N+1 query patterns, atomic operations (FieldValue.increment, transactions), batched writes, denormalization and counters, server-side caching, field selection, pagination limits, and required composite indexes. Verifies each finding and writes a prioritized report.
argument-hint: "[phase] [path]"
model: opus
effort: high
---

# Firestore audit

A **manually-invoked, red-team Firestore audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/firestore-audit.md`.

> **Self-contained** — this checklist is comprehensive on its own and needs no other skill installed. Where the house standard(s) **`firebase-architecture`** (Firestore/Storage rules → **`firebase-security-rules-auditor`**) ARE present, also apply their house-specific rules as an enhancement.

## Arguments

- `[phase]` — `development` | `production`; sets the action-item tiers. Omitted → `production` (assume the app is live until told otherwise — the safer default).
- `[path]` — a file, directory, or PR/diff to scope the audit to; omitted → the whole repo.

## Audit protocol

**Mindset — reviewer/attacker first.** Don't assume code is fine because it looks careful; find the sequence that breaks it. Report only findings you can justify as real, each verified before it lands.

### Method

1. **Resolve phase** — use a phase arg (`development` | `production`) if given; else default `production` — assume the app is live with real users until told otherwise, so a CRITICAL finding gets Fix-Now urgency instead of a pre-launch discount. Phase sets the action-item tiers.
2. **Load the previous report** — if `_reports/firestore-audit.md` exists, read it: carry unresolved findings forward (same ID, status `UNRESOLVED`), move fixed ones to "Resolved since last audit", and continue ID numbering. First run → skip Resolved and mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating.
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
- **Why it matters:** <impact / who it affects> <· optional standard or criterion ref, e.g. WCAG 2.1.2 / OWASP A01>
- **Fix:** <the specific remediation>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Reads | <X>/10 | <one-line justification> |
| Writes | <X>/10 | <one-line justification> |
| Atomicity | <X>/10 | <one-line justification> |
| Denormalization / counters | <X>/10 | <one-line justification> |
| Caching | <X>/10 | <one-line justification> |
| Pagination | <X>/10 | <one-line justification> |
| Indexes | <X>/10 | <one-line justification> |

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

Trace each endpoint through route → service → helper, counting Firestore operations. Each item below is self-sufficient; where the `firebase-architecture` skill is installed, its patterns (+ `references/patterns.md`) are the recommended fix target.

### Reads

- **Reads per page/endpoint minimized** — count `.get()` on a doc (1), on a query (1 per doc returned, estimate from `limit`), `count().get()` (1), and reads inside a transaction; flag routes doing more reads than the response needs.
- **N+1 lookups batched** — a list query followed by one lookup per item is batched via `getAll(...)` or an `in`/`where` query, not a loop of `.get()`.
- **No over-fetching whole collections** — never fetch a full collection to filter/count/derive in memory; filter with `where`, count with `count().get()`.
- **Field selection where supported** — reads that need a subset use `.select(...)` (Admin SDK) rather than pulling whole documents; list responses strip fields via a doc→list-item mapper (Firestore has no `SELECT` on the wire).
- **Filter/sort/count in the query, not memory** — `where`/`orderBy` and `count().get()` push work to Firestore; flag fetching a set then filtering, sorting, slicing, or `.length`-counting it in JS (bills every scanned doc).
- **Real-time listeners scoped and torn down** — `onSnapshot` is billed per changed doc for the listener's life; flag broad/unbounded listeners, listeners where a one-shot `.get()` would do, and any that aren't unsubscribed on unmount/route-change.

### Writes

- **Writes per endpoint** — count `.set()`/`.update()`/`.delete()`/`.create()`, each `FieldValue.increment`, and every op inside a batch/transaction; flag mutations doing more writes than the change needs.
- **Batched writes / transactions for multi-doc** — multiple related writes that must land together use a batch (independent writes) or a transaction (read-then-write); flag sequential separate writes that should be one atomic unit.
- **No write amplification** — a single logical change doesn't fan out into avoidable extra writes (redundant mirror docs, per-field updates that could be one, denormalized copies updated outside the same batch/tx).

### Atomicity

- **Counters via `FieldValue.increment()`** — any incremented/decremented number uses the atomic sentinel, never read-modify-write.
- **Balances / inventory in a transaction** — money and stock operations check-and-decrement inside one transaction (no oversell, no lost update).
- **Race safety** — uniqueness via a transaction or `create()` (fails if exists); read-then-write sequences that can interleave are wrapped in a transaction; transactions are idempotent (external calls/notifications after commit).

### Denormalization + counters

- **Denormalized reads for hot paths** — derived/summary data read on hot paths is stored on the parent doc to avoid an extra read or an N+1; denormalized copies are updated in the same tx/batch as their source.
- **Aggregate counters instead of counting docs** — a maintained counter field (updated atomically) is used for totals shown on hot paths rather than reading/counting the collection each time; on delete, a counter is reversed only if the doc was counted.
- **Fan-out reads bounded** — `collectionGroup` and cross-collection aggregations don't scan unbounded document sets on a hot path; heavy aggregates are precomputed/denormalized or moved off the request path. A single hot counter that could see high write contention uses distributed/sharded counters.

### Caching

- **Server-side cache tiers on hot reads** — repeated identical hot reads sit behind a server cache tier (hot/warm/cold) so they don't re-hit Firestore each request; cached identity/config reads are deduped and tagged for invalidation on the relevant mutation (→ `nextjs-best-practices` caching + `firebase-architecture`).

### Pagination

- **Cursor + capped page size** — list endpoints use cursor pagination (doc-id token, `limit + 1` to detect more) with a capped page size, not offset.
- **No unbounded queries** — every list query enforces a `limit`; flag any query that can return an unbounded result set.
- **No unbounded document growth** — arrays/maps that grow without bound on a single doc (approaching the ~1 MB doc cap, and re-billed in full on every write) are a subcollection instead.

### Indexes

- **Required composite indexes declared as code** — every compound query (multiple `where`, or `where` + `orderBy` on different fields, inequality-filtered fields ordered) has a matching entry in `firestore.indexes.json`.
- **No missing-index errors** — a query missing its composite index yields an empty page (not a throw) with the house cursor helper, so silent-empty-results are as bad as a runtime crash; audit both directions (missing = wrong results, unused = waste).

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
