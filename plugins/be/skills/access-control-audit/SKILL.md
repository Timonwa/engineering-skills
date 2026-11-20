---
name: access-control-audit
description: >-
  Manually invoked. Access-control audit — guards on every route and Server Action (BFLA), 404 before 403 and tenant scoping (BOLA), allowlisted writes and projected reads (BOPLA), verbs never role names, roles that add up, escalation and invitations, claims and revocation, sessions and sign-in, API keys and share links, the plan and flag order, UI gates, data rules and the tests. Verifies each finding and writes a prioritised report.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Access control audit

A **manually-invoked, red-team access-control audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/access-control-audit.md`.

> **Self-contained** — this checklist is comprehensive on its own and needs no other skill installed. Where **`access-control`**, **`auth`**, **`api-architecture`** and **`backend-security`** are installed, apply their house rules too; rule internals go to **`firebase-security-rules-auditor`** (the official Firebase skill, where installed).

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
2. **Load the previous report** — if `_reports/access-control-audit.md` exists, read it, but still run every check against the source. Use it only to keep the ID of each finding still present (status `UNRESOLVED`), carry its `WON'T FIX` findings forward unchanged — never re-raised as new findings — drop its `FIXED` findings and any no longer present, continue ID numbering from its highest ID, and take its scores for the score-change row. First run → mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating. Drop one the project records as a deviation, with its reason, in `AGENTS.md` or a doc it links.
5. **Write the report** to `_reports/access-control-audit.md` — overwriting the whole file, so no resolved history accumulates — and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — actively exploitable or broken now: data loss/leak, security breach, or total failure of the audited concern. Fix immediately.
- **HIGH** — a serious defect that will bite in production or blocks launch. Fix before shipping.
- **MEDIUM** — a real issue with a workaround or limited blast radius. Schedule it.
- **LOW** — minor, polish, or defense-in-depth.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/access-control-audit.md`, with one Overall row in the score change:

```
# Access control audit — <app/scope>

**Date:** <YYYY-MM-DD> · **Phase:** <phase> · **Mode:** Report-only · **Branch:** `<branch>` · **Scope:** <what was audited> · **Overall:** <X>/10

## Score change (previous → current)
| Metric | Previous | Current | Δ | Trend |
| --- | --- | --- | --- | --- |
| Overall | <prev/10 or N/A> | <cur/10> | <+N / -N / 0> | <▲ / ▼ / ■ / N/A> |

## Findings
| ID | Severity | Category | Status | Issue | Location |
| --- | --- | --- | --- | --- | --- |
| 1 | HIGH | <category> | NEW | <one-line issue> | `file/path:line` |

**Status:** `NEW` — found this run for the first time · `UNRESOLVED` — still present from an earlier run · `FIXED` — fixed after the audit; the note names the commit · `WON'T FIX` — the owner ruled it not a defect, intended, or accepted as it is; the note gives their reason

### F1 — <title>
- **What:** <the defect, and the concrete evidence that proves it real>
- **Why it matters:** <impact / who it affects> <· optional standard ref, e.g. OWASP A01 / API1 / NIST SP 800-63B>
- **Fix:** <the specific remediation>
- **Note:** <only once `FIXED` (the commit and what changed) or `WON'T FIX` (the owner's reason)>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Guards and coverage | <X>/10 | <one-line justification> |
| Verbs and the policy | <X>/10 | <one-line justification> |
| Roles to verbs | <X>/10 | <one-line justification> |
| Object and property level | <X>/10 | <one-line justification> |
| Escalation and revocation | <X>/10 | <one-line justification> |
| Sessions and sign-in | <X>/10 | <one-line justification> |
| Keys and links | <X>/10 | <one-line justification> |
| Plans, flags and UI | <X>/10 | <one-line justification> |
| Data rules | <X>/10 | <one-line justification> |
| Audit and tests | <X>/10 | <one-line justification> |

## Action items
Tiers by phase — `development` → **Fix Now / Before Launch / Post-Launch**; `production` → **Fix Now / Next Release / Backlog**. Each task references a finding ID.

### <Tier>
| # | Priority | Task (finding ID) | Effort |
| --- | --- | --- | --- |
```

### Output

Every run produces two things:

- **Full report** → `_reports/access-control-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

The frame is **broken access control** (OWASP A01; API1, API3 and API5): **object level (BOLA)** — a forged id reaches another actor's resource; **function level (BFLA)** — an operation runs without the verb it requires; **property level (BOPLA)** — a request sets or reads fields the actor may not. Check every route, Server Action, guard, the verb registry, the role maps, keys, links, the UI gates and the data rules. The fix target for each finding is `access-control` (sessions and keys: `auth`).

### Guards and coverage (BFLA)

- **Every route and Server Action that acts for a person runs a guard**, after the rate limit and any feature-flag check, before validation. Categorise each as public (named: sign-in, health, a webhook), session only, or verb-guarded; flag any non-public route with none. Webhooks verify a signature and cron an OIDC token instead.
- **The API's guard is the only gate.** A Server Action that calls the API doesn't need its own check; one in an app with its own backend calls the guard itself. Flag a mutation whose only check is client-side, or a guard placed after a side effect.
- **Routes on the caller's own record need a session, not a verb** — flag a missing session, not a missing verb.
- **Identity comes from the verified token** (`token.uid`): flag the caller's own uid, role or ownership taken from a body, query or header. Ids of the record acted on (`/admin/users/[uid]`, the member being invited) are input like any other, authorised by the guard. An unverified email is refused outside a tested allowlist.
- **Guards throw typed errors** (`ForbiddenError`, `NotFoundError`) mapped centrally; flag a guard returning a boolean a route can ignore.

### Verbs and the policy

- **Checks name verbs, never roles.** Grep routes, services and components for `role ===`, `isAdmin`, `roles.includes(`, `hasRole(`; each hit gating an action is a finding. Not findings: the role-to-verb map, the rank check for who may manage whom, the last-top-role guard, and role labels shown in the UI.
- **No permissions stored on a user document** — roles are stored, verbs derived.
- **Every verb comes from one typed registry** (`scope.resource.action`, a fixed action vocabulary, each reverse action its own verb); flag inline strings and unregistered verbs. A registered verb no route uses is cleanup in `production`, a note in `development`.
- **`can(actor, verb)` is pure** — no reads or side effects — with `canAll`/`canAny`, and denies by default: an unknown role, a missing membership or a pending invite holds nothing.

### Roles to verbs

- **One map per role kind, each role a set of verbs; roles add up** — a person's verbs are the union of their roles. Flag logic assuming one role per person or inheritance by rank.
- **Allowlist roles get each new verb explicitly**, in the same change as the route that needs it; for every recently added verb, check each role the project's docs or feature spec say should hold it does; where nothing says, mark it "needs confirmation". Exclusion roles receive it unless excluded.
- **Least privilege:** read-only roles hold only read verbs; no role holds a verb outside its job.
- **Operators hold no resource verbs** — they act through operator routes with operator verbs; flag an operator borrowing a member's role. **Resource roles are resolved per request**, never stored in claims.

### Object and property level (BOLA, BOPLA)

- **404 before 403:** a resource guard loads the record first, so a stranger asking for a hidden id gets 404, never a 403 that confirms it exists.
- **Ownership from the record, every query scoped to the tenant**, and every id in a request (parent, child, batch item, move target) authorised, not just the first.
- **Writes take a `.pick()` allowlist** — flag a body spread into a write or a write schema built with `.omit()`; **responses return the projection for that caller**, never a raw document across a trust boundary.

### Escalation, invitations and revocation

- **Manage only strictly lower roles; nobody grants themselves or a role at or above their own; the last holder of the top role can't be removed.** Tests cover every pair.
- **Invitations** are single-use, expiring, stored hashed, bound to the invited email, accepted only by that verified address, and void if the inviter has lost the right; resending replaces the old one; the owner can see and revoke pending invites; a pending invite grants nothing.
- **The riskiest operator acts need a second approver**, nobody approves their own request, and both people are audited; task grants carry an end date; break-glass access is time-limited and alerts the owners (the review after it, and periodic access reviews, are process — "needs confirmation").
- **Claims are a cache:** role documents are written first and claims re-derived, awaited, under 1,000 bytes. Removing a role revokes the person's sessions; a suspension disables and revokes; anything that must hold instantly reads the store. Flag a client-writable role field.

### Sessions and sign-in (`auth`)

- **A session is minted only by the API**, from an ID token signed in within the last five minutes (`auth_time`), else 401. The client SDK uses `inMemoryPersistence` and signs out once the cookie is set; password sign-in and account creation go through the API (lockout, Identity Toolkit, a custom token), never the browser SDK.
- **Verification passes `checkRevoked: true`; sign-out ends the session on the server** (deletes its record, or revokes refresh tokens) and sends `Clear-Site-Data: "cache", "storage"`, never `"cookies"`. Other sessions are revoked on a password change, an account recovery or a role removal.
- **Auth email is sent by the API** with the Admin SDK's `generate…Link`, never the client SDK or Firebase's templates. A password or email change needs the current password and emails the owner. Providers are linked with `linkWithCredential`, and an unverified account never gains one.
- **Operator sessions:** a required second factor, a separate cookie only the admin routes accept, an absolute cap of 24 hours or less, an idle timeout of an hour or less, and step-up for the most sensitive acts.
- **In the Next.js app:** each route group's layout gates behind `<Suspense>`, never the root layout; the proxy checks only that the cookie exists; the current-user helper never imports `firebase-admin`. Cookie attributes, session caps and password rules are `security-audit`'s.

### API keys and share links

- **Key scopes are verbs** from the same registry; a key never holds a verb its creator lacks, acts only in its account, stops when the account is suspended or the creator loses the verbs, and never reaches operator routes. Keys are 32 random bytes with a product and tier prefix and a checksum, generated server-side, shown once, stored as a SHA-256 hash, sent only as `Bearer`, separate per tier, rate-limited by key, rotatable with old and new working side by side; issuing and revoking are audited and emailed to the owners.
- **Share links** carry at least 120 random bits, grant one read verb on one resource, expire or are single-use, are revocable, and answer 404 when wrong, expired or revoked; a `GET` on one never triggers an action, and its page loads no third-party scripts. **Passcodes** are stored hashed or encrypted, compared in constant time, rate-limited with a lockout, and set a short-lived cookie for that resource only. The page sends `Referrer-Policy: no-referrer` and `noindex` (meta and `X-Robots-Tag`), never a robots.txt disallow. Access bought or earned is a relationship, not a link.

### Plans, flags and the UI

- **The order:** rate limit → a switched-off feature answers 404 → session and verb → the resource's attributes → the plan's entitlement → the usage limit reserved in the work's transaction. Entitlement refusals are 403 with their own codes (`FEATURE_NOT_IN_PLAN`, `PLAN_LIMIT_REACHED`); flag a plan-name check.
- **The UI runs the same `can()`** through a hook and a gate component; it hides what can't be done (rather than disabling it without saying why) and protects nothing. Flag a control whose action has no server guard.

### Data rules

- **Default deny**; where every path goes through the API, clients are denied entirely. Any opened path checks ownership and membership in the rule, keeps role fields immutable, and is commented. `rules_version = '2'`; every file `firebase.json` names exists; no server code imports the client SDK; rules have unit tests. Rule internals → `firebase-security-rules-auditor` (official).

### Audit and tests

- **The privileged guard audits its own denials**; role grants and removals, key issuing and revoking are audited (`audit-log`).
- **Tests:** the role map verb by verb in both directions; the hierarchy pairs; each guarded route's 401, 404, 403 and success; a key without the scope gets 403; a wrong, expired and revoked link each get 404.

## Fixing what it found

Fixing is a separate request, after the report is written, and covers only the findings the owner chose. Then **update the report in place — never re-run the audit to update it**: a re-run re-checks the whole codebase, costs a full audit and raises new findings mid-fix. Mark each fixed finding `FIXED` with its commit and a one-line note of what changed, mark a finding the owner rules out `WON'T FIX` with their reason, and leave everything else as it stands. Recompute the scorecard categories the fixes touched and the Overall, and rewrite the one score-change row (previous → current) — never add a second row.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
