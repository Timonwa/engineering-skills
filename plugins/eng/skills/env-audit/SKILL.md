---
name: env-audit
description: >-
  Manually invoked. Environment and secrets audit — secrets in env and public per-tier facts in committed constants, APP_ENV as the tier, a Zod guard at boot with no stray process.env reads, a names-only .env.example in parity, NEXT_PUBLIC correctness, App Hosting grants and overlays, worker secrets, safe ops scripts, rotation and leak response, and turbo's env listing. Verifies each finding and writes a prioritised report.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Env audit

**Run this only when the user asks for it by name. It writes a report and changes no code; fixing a finding is a separate request.**

A **manually-invoked, red-team env audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/env-audit.md`.

> **Self-contained** — this checklist is comprehensive on its own and needs no other skill installed. Where the house skill **`env`** is installed, it is the fix target for what this finds; secrets in CI belong to `devops`.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[phase]` — `development` | `production`; sets the action-item tiers. Omitted → the audit phase the project's `AGENTS.md` records, else `production` (assume the app is live until told otherwise).
- `[path]` — a file, directory, or PR/diff to scope the audit to; omitted → the whole repo.

## Audit protocol

**Mindset — reviewer/attacker first.** Don't assume code is fine because it looks careful; find the sequence that breaks it. Report only findings you can justify as real, each verified before it lands.

### Method

1. **Resolve phase** — the phase arg if given; else the audit phase in `AGENTS.md`; else `production`, so a CRITICAL finding gets Fix-Now urgency instead of a pre-launch discount.
2. **Load the previous report** — if `_reports/env-audit.md` exists, read it, but still run every check against the source. Use it only to keep the ID of each finding still present (status `UNRESOLVED`), carry its `WON'T FIX` findings forward unchanged — never re-raised as new findings — drop its `FIXED` findings and any no longer present, continue ID numbering from its highest ID, and take its scores for the score-change row. First run → mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating. Drop one the project records as a deviation, with its reason, in `AGENTS.md` or a doc it links.
5. **Write the report** to `_reports/env-audit.md` — overwriting the whole file, so no resolved history accumulates — and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — actively exploitable or broken now: data loss/leak, security breach, or total failure of the audited concern. Fix immediately.
- **HIGH** — a serious defect that will bite in production or blocks launch. Fix before shipping.
- **MEDIUM** — a real issue with a workaround or limited blast radius. Schedule it.
- **LOW** — minor, polish, or defense-in-depth.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/env-audit.md` in the format in [references/report-format.md](references/report-format.md): the header line, the score change with its one Overall row, the findings table with its status legend and one section per finding, the scorecard and phase-tiered action items.

### Output

Every run produces two things:

- **Full report** → `_reports/env-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

Audit every app's `env.ts`, `.env.example`, per-tier constants (`site.ts`), host config (`apphosting.yaml` and overlays), workers, ops scripts, `turbo.json` and `.gitignore`.

### Secret or constant

- **One gate: would leaking this hurt?** Yes → env and a secret manager. No → a committed constant keyed off `APP_ENV`, however much it differs per tier. A base URL, cookie domain, CORS origin, project or bucket id, Firebase web config, public key or analytics id in `.env` is a finding; say which tier's value the constants are missing.
- **A Client Component gets a per-tier fact as a prop** from a server layout; a client module importing the constants file that reads server-only env is a finding.

### The guard

- **One leaf `env.ts` per app** — imports only `zod` (plus `server-only` in a frontend), parses `process.env` at load, exports `env`, and fails with a readable message (`z.prettifyError`).
- **No `.default("")` hiding a required value.** A value with a real type — a URL, an enum, a minimum length — is stronger than a bare `z.string()`; flag it `LOW`, as audit advice rather than an `env` rule.
- **A value optional locally but required on a deployed tier** is `.optional()` plus a `superRefine` keyed on `APP_ENV` — correct, not a finding. One that's simply optional everywhere, so a deployed boot quietly switches a feature off, is.
- **No `process.env` outside the carve-outs** — the guard itself, `next.config.*`, test setup, standalone scripts, and a client module reading a literal `NEXT_PUBLIC_` value. Any other direct read is a finding, unless the project records its own carve-out.

### `.env` and `.env.example`

- **`.env.example` lists every key the app and its scripts read, with no values and no comments**, committed. A placeholder value or a comment is a finding.
- **Parity** — `.env.example` names exactly the keys the `env.ts` schema reads, checked by a script in CI (CI has no `.env`); a key nothing reads is deleted.
- **Each app has its own gitignored `.env`** holding the local secrets and `APP_ENV=local`.
- **Gitignored** — every real `.env*` file; only `.env.example` is tracked (`git ls-files`).
- **Local secrets come from the secret manager** through a script, never passed around by hand — check the script exists; the practice itself needs confirmation.

### `NEXT_PUBLIC_`

- **Only for a value safe in the browser bundle**, and rare, since public facts are constants. A secret behind the prefix is CRITICAL — inlined at build and unrecoverable without rotation.
- **A `NEXT_PUBLIC_` value needs build and runtime availability** on a host that separates them. **An API app takes no `availability:` blocks** — its guard parses during `next build`, so a runtime-only value breaks the build.

### The tier

- **`APP_ENV` names the tier** as a validated enum and is the only switch. Setting or branching on `NODE_ENV` is a finding.

### Deployed tiers, workers and scripts

- **A base host config plus one overlay per tier, each overlay setting `APP_ENV`.** That each secret exists and the backend is granted access before the rollout, and that a rotation shipped with a rollout, live in the secret manager — mark them "needs confirmation" unless a deploy log shows them.
- **Workers have no `.env`** — secrets via `defineSecret`, public facts from the shared constants. **Extensions** keep parameters in a committed file with secrets as references, never values.
- **Ops scripts take `--env=<tier>` with no production default**, load only that tier's secrets from a gitignored file, and read public facts from the app's constants.
- **Every env var a build reads is listed** in that task's `env` in `turbo.json`, or strict mode withholds it from the build and the cache — except what Turborepo infers for the framework (`NEXT_PUBLIC_*` in a Next.js package), which isn't a finding. Turborepo doesn't load `.env` files, so `.env*` sits in the build task's `inputs`, and `turbo/no-undeclared-env-vars` is on in lint.

### Leaks and rotation

- **Nothing secret committed** — keys, `-----BEGIN` blocks, tokens, service-account JSON, connection strings with passwords — in tracked files or history. A secret ever committed is reported for **revocation at its issuer first**, then replacement and a history purge if the repo is public; never "fixed" by deleting the commit.
- **No secret in logs, error messages or URLs.** (Owned here; `security-audit` points to it, as it does for `NEXT_PUBLIC_` secrets.)
- **A rotation plan is written down** in the project's docs — long-lived keys rotate on a schedule and when someone with access leaves; signing and encryption keys rotate with an overlap. Whether it's followed needs confirmation.

### Across apps

- **Shared values agree** — the same names and shapes for same-purpose values across apps, env guards included; an app missing a value its peers all have, or a mismatch, is a finding. (Owned here; `conventions-audit` leaves env guards to it.)
- **Each deployed tier provides every required value** — spot-check the host config against each schema.

## Fixing what it found

Fixing is a separate request, after the report is written, and covers only the findings the owner chose. Then **update the report in place — never re-run the audit to update it**: a re-run re-checks the whole codebase, costs a full audit and raises new findings mid-fix. Mark each fixed finding `FIXED` with its commit and a one-line note of what changed, mark a finding the owner rules out `WON'T FIX` with their reason, and leave everything else as it stands. Recompute the scorecard categories the fixes touched and the Overall, and rewrite the one score-change row (previous → current) — never add a second row.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
