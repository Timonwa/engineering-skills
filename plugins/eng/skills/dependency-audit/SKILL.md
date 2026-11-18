---
name: dependency-audit
description: >-
  Manually invoked. Dependency-health audit of a monorepo — one version per dependency through the pnpm catalog with recorded exceptions, workspace protocol and dependency direction, peer dependencies for singletons, unused, missing, duplicate and misplaced packages, build-script allowlists, release-age holds, advisories, automated updates, and lockfile integrity. Verifies each finding and writes a prioritised report.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Dependency audit

A **manually-invoked, red-team dependency audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/dependency-audit.md`.

> **Self-contained** — this checklist is comprehensive on its own and needs no other skill installed. Where the house skills **`monorepo`** and **`devops`** are installed, they are the fix target for what this finds.

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
2. **Load the previous report** — if `_reports/dependency-audit.md` exists, read it: carry unresolved findings forward (same ID, status `UNRESOLVED`), move fixed ones to "Resolved since last audit", and continue ID numbering. First run → skip Resolved and mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating. Drop one the project records as a deviation, with its reason, in `AGENTS.md` or a doc it links.
5. **Write the report** to `_reports/dependency-audit.md` (overwrite) and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — actively exploitable or broken now: data loss/leak, security breach, or total failure of the audited concern. Fix immediately.
- **HIGH** — a serious defect that will bite in production or blocks launch. Fix before shipping.
- **MEDIUM** — a real issue with a workaround or limited blast radius. Schedule it.
- **LOW** — minor, polish, or defense-in-depth.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/dependency-audit.md` in the format in [references/report-format.md](references/report-format.md): the header line, the score change, the findings table with one section per finding, the scorecard, phase-tiered action items and "Resolved since last audit".

### Output

Every run produces two things:

- **Full report** → `_reports/dependency-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

Read the root `package.json`, `pnpm-workspace.yaml` (its `catalog`, `allowBuilds` and supply-chain settings), every member's `package.json` (`apps/*`, `packages/*`, `functions/*`), `turbo.json`, the syncpack config, the lockfile and `.github/`. **Probes are read-only** — `pnpm why`, `pnpm dedupe --check`, `pnpm outdated`, `pnpm audit`, `pnpm view <pkg> deprecated`; never run an install, which writes `node_modules`.

**Recorded exceptions are not findings.** A place that can't use `catalog:` — a host that reads a framework's exact version from each app, workers whose cloud build runs a plain `npm install`, a linter aliased to an older TypeScript — is correct when a labelled syncpack version group records why. The same goes for a critical-only advisory policy recorded beside the install settings. An exception with no record is the finding.

### One version per dependency

- **Every third-party dependency comes from the catalog** — `"<dep>": "catalog:"` in each member, the version once in `pnpm-workspace.yaml`. A literal range on a dependency the catalog has, or a shared dependency left out of it, is a finding; a member a major behind is `HIGH`.
- **`syncpack lint` passes** (the project's `deps:check`), and every exception is a labelled group with its reason.
- **Coupled pairs move together** — `react` with `react-dom`, a plugin with its host (`@types/react`, `eslint-*`, `@tailwindcss/*`), and a framework pinned per app moves in the same change as the catalog.
- **No `overrides` forcing a version inside a third-party tree** to silence an advisory; the fix is that dependency releasing it.
- **No `*` or `latest`** on a runtime dependency.

### Workspace packages and direction

- **Internal packages use `workspace:*`**, never a literal version.
- **Every import is declared** in that member's manifest — nothing resolves only through hoisting — and nothing is declared that the workspace doesn't contain.
- **Dependencies point one way** — apps on packages, packages on lower packages; no package depends on an app.
- **A shared package declares singletons as peer dependencies** — `react`, `react-dom`, `next`, `firebase`, a form library — so every app supplies one copy.
- Build- and type-only packages (`typescript-config`, `eslint-config`) are `devDependencies`; runtime ones are `dependencies`.

### Unused, missing and misplaced

- Each declared dependency is imported somewhere in that member — `import`, `require`, dynamic import, CSS `@import`, or a config file. Don't flag tooling used indirectly (`typescript`, `@types/*`, `eslint*`, `turbo`, test runners, build tools) or declared peers.
- A package used only to build, test or configure sits in `devDependencies`; one shipped code imports isn't hiding there.

### Duplicates

- **One copy of each singleton** — `pnpm why react` (and `next`, `firebase`, `zod`) shows one version; two copies break hooks and context with no type error. `pnpm dedupe --check` shows what a dedupe would change.
- **Overlapping packages** for one job — two date libraries, two HTTP clients, two icon sets.
- **A helper a house package already ships**, re-added as a dependency or rewritten.

### Deprecated and removed packages

- A package its registry marks deprecated (`pnpm view <pkg> deprecated`), or unmaintained with a maintained successor.
- A package the project replaced creeping back (a client fetching library replaced by Server Components, an SEO package replaced by Next's metadata files).

### Build scripts, release age and advisories

- **Dependency build scripts are blocked except an allowlist** — pnpm 11's `allowBuilds` map (`sharp: true`). `onlyBuiltDependencies` is the removed pnpm 10 form; scripts switched on for everything — `dangerouslyAllowAllBuilds: true` or `strictDepBuilds: false` — is `HIGH`.
- **Release-age holds** — `minimumReleaseAge` isn't switched off (`0`; the default is a day); a `minimumReleaseAgeExclude` entry names an exact version (`zod@4.5.1`) and is removed once that version ages past the window.
- **pnpm's other guards stay on** — `blockExoticSubdeps` (on by default) isn't disabled; `trustPolicy: no-downgrade`, which refuses a version whose publishing trust dropped, is recommended, its absence `LOW`.
- **`pnpm audit`** — every advisory reported; CI fails at the level the project records (critical, by the house default). Each known advisory and where it lives is recorded beside the install settings.
- **Automated updates** — Renovate or Dependabot, grouped and scheduled, including GitHub Actions SHAs; a project on alerts alone records that.

### Supply chain in CI

Owned here; `security-audit` points to it.

- **Every third-party action pinned to a full commit SHA** with a version comment, first-party ones included; a tag is `HIGH`.
- **Scanners on every PR** — CodeQL, `dependency-review-action`, and `zizmor` or `actionlint` over the workflows; secret scanning with push protection on the repository (needs confirmation — a repository setting).

### Turborepo

- **Tasks** — `build` depends on `^build` and declares `outputs` with `!.next/cache/**`; `lint` and `check-types` depend on a `transit` task, never `^lint`/`^check-types`; nothing depends on a `persistent` task; `globalEnv` stays minimal (what each build reads is `env-audit`'s).
- **Running** — dev through pnpm (`pnpm -r --parallel --filter …`), not `turbo dev`; tests `--concurrency=2`; CI uses `--affected` with `TURBO_SCM_BASE=origin/<base>` and `fetch-depth: 0`.

### Lockfile and tooling

- **One `pnpm-lock.yaml`**, committed at the root and in sync — CI's `--frozen-lockfile` install passes (read its last run rather than installing); no stray `package-lock.json` or `yarn.lock`. Drift is `HIGH`.
- **`packageManager` names an exact pnpm version**, `engines.node` the minimum, and `.nvmrc` the version CI and every machine run. CI's setup action runs `pnpm/action-setup` (reading `packageManager`; Node 25 and later don't ship corepack), then `setup-node` from `.nvmrc` with the pnpm cache, then `pnpm install --frozen-lockfile`.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
