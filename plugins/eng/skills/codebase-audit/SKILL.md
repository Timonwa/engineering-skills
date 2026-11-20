---
name: codebase-audit
description: >-
  Manually invoked. Broad repo-health triage that routes to the deep audits and covers the hygiene no other audit owns — tech debt, dead code, TypeScript strictness and the options TypeScript 6 deprecates, error handling, tests (boundary-only mocks, determinism, no skipped or flaky tests), CI hygiene, branch protection, releases and deploys, and git hygiene. Verifies each finding and writes a prioritized report with an overall health score.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Codebase audit

A **manually-invoked, red-team codebase audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/codebase-audit.md`.

> **Self-contained** — this checklist is comprehensive on its own and needs no other skill installed. Where the house skills **`typescript`**, **`testing`**, **`naming`** and **`devops`** are installed, they are the fix target for what this finds.

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
2. **Load the previous report** — if `_reports/codebase-audit.md` exists, read it, but still run every check against the source. Use it only to keep the ID of each finding still present (status `UNRESOLVED`), carry its `WON'T FIX` findings forward unchanged — never re-raised as new findings — drop its `FIXED` findings and any no longer present, continue ID numbering from its highest ID, and take its scores for the score-change row. First run → mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating. Drop one the project records as a deviation, with its reason, in `AGENTS.md` or a doc it links.
5. **Write the report** to `_reports/codebase-audit.md` — overwriting the whole file, so no resolved history accumulates — and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — actively exploitable or broken now: data loss/leak, security breach, or total failure of the audited concern. Fix immediately.
- **HIGH** — a serious defect that will bite in production or blocks launch. Fix before shipping.
- **MEDIUM** — a real issue with a workaround or limited blast radius. Schedule it.
- **LOW** — minor, polish, or defense-in-depth.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/codebase-audit.md` in the format in [references/report-format.md](references/report-format.md): the header line, the score change with its one Overall row, the findings table with its status legend and one section per finding, the scorecard, "Deep audits to run next" and phase-tiered action items.

### Output

Every run produces two things:

- **Full report** → `_reports/codebase-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Routing — hand off to a deep audit, or flag for manual review

This map keeps codebase-audit shallow: when the sweep surfaces a smell in a domain another audit owns, **don't investigate it here** — record a one-line signal in the report's "Deep audits to run next" table. The handoff is **not a hard dependency**. For each row:

- **If the owner audit is installed** — point at it (record "run `X-audit`") and leave the depth to it.
- **If it isn't** — don't assume it exists. Flag the domain as **"needs a focused manual review"**, note the signal you spotted, and still surface it so the gap is visible. Never route to a skill you can't confirm is available.

| Smell you spot                                                                                                                         | If installed, hand off to | Otherwise flag for manual review |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------- |
| XSS sink, weak/missing Content Security Policy (CSP), secret in bundle, injection, Server-Side Request Forgery (SSRF), fail-open catch | `security-audit`          | Focused security review          |
| Route/action with no role check, "logged-in ≠ authorized", IDOR, tenant leak                                                           | `access-control-audit`    | Focused authorization review     |
| Route handler missing Zod validation, rate limit, pagination, typed errors, response builder                                           | `api-audit`               | Focused API-layer review         |
| Dependency drift, unused/duplicate deps, stale lockfile, known vulnerability, unpinned actions, no scanners                            | `dependency-audit`        | Focused dependency review        |
| Missing `.env.example`, unvalidated env at boot, `NEXT_PUBLIC_` misuse, a committed env file or secret                                 | `env-audit`               | Focused env/secrets review       |
| Missing labels/alt/focus, poor contrast, keyboard traps, ARIA misuse                                                                   | `accessibility-audit`     | Focused accessibility review     |
| Waterfalls, missing code-split, oversized bundle, unoptimised images                                                                   | `performance-audit`       | Focused performance review       |
| N+1 reads, unbounded queries, missing indexes, counter drift                                                                           | `firestore-audit`         | Focused data-access review       |
| Redis keys without TTL or builder, unstated failure direction                                                                          | `redis-audit`             | Focused Redis review             |
| Generic/library-default UI, inconsistent tokens                                                                                        | `frontend-audit`          | Focused frontend/UI review       |
| Naming, structure or routing drift; duplicated helpers; oversized files; magic values                                                  | `conventions-audit`       | Focused conventions review       |
| Missing page metadata, no sitemap or robots, absent structured data, AI crawlers blocked                                               | `seo-aeo-geo-audit`       | Focused search-visibility review |
| Components without stories, stories without keyboard or axe checks                                                                     | `storybook-audit`         | Focused Storybook review         |

## Checklist — code-quality hygiene (owned here)

This is what codebase-audit investigates itself, and it stands alone: every check states its criterion inline, so the sweep runs in full even with no other skill installed. Standards references (`→ skill`) are optional pointers to the fuller rule, not prerequisites. Keep it broad and generic; anything domain-specific routes above.

### Tech debt

- Count `TODO` / `FIXME` / `HACK` / `XXX` / `@deprecated` markers; flag old or business-critical ones — a `FIXME` on an auth or payment path is `HIGH`, a stray `TODO` is `LOW`.
- Commented-out code blocks left in source — dead weight; git history is the archive, so it should be deleted.
- Magic values, duplicated helpers and oversized files are `conventions-audit`'s — route them.
- A `TODO` on transitional code names what ends it; one with no end state is debt with no owner.

### Dead code

- Unused **exports**, whole unreferenced **files/modules**, unused local **vars/imports**. A value prefixed `_` is unused on purpose and not a finding (→ `naming`; the lint rule is `devops`').
- **Unreachable branches** — code after a `return`/`throw`, conditions that can't be true, disabled feature paths, dead feature flags never toggled on.

### TypeScript strictness

- `strict` (and its family — `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess` where the house uses it) is on in `tsconfig`; flag `strict: false` or the family disabled (→ `typescript`).
- **What TypeScript 6 deprecates and 7 removes** — `baseUrl`, `moduleResolution` `node`/`node10`/`classic`, `esModuleInterop` or `allowSyntheticDefaultImports` set to `false`, `target: "es5"`, `downlevelIteration`, `outFile`, `module` `amd`/`umd`/`system`/`none`, `alwaysStrict: false`, and the syntax: `module Foo {}` namespaces, import `asserts`, `/// <reference no-default-lib>` — plus `ignoreDeprecations` hiding them. A workspace that reads globals (`process`) lists them in `types`, now `[]` by default.
- **Presets by resolver** — Bundler for Next.js apps and bundled packages, NodeNext for what plain Node loads (with `.js` on relative imports); a package that emits sets `rootDir: "./src"` beside `outDir`; `noUncheckedSideEffectImports` isn't switched off. A `dist/` package emits `declaration` and `declarationMap` with `isolatedDeclarations`, puts `types` first in its `exports`, and aliases with `#/*` subpath imports rather than `paths`.
- **Checked and linted with types** — typescript-eslint's `strictTypeChecked` with `projectService`; a Next.js app checks with `next typegen && tsc --noEmit`; exported functions annotate their return types; `type` over `interface` except for merging or `implements`.
- Erasable syntax only — no `enum`, value `namespace`, parameter properties or `import =` where `erasableSyntaxOnly` is the standard; type-only imports marked under `verbatimModuleSyntax`. A package built to `dist/` emits declarations.
- No `any` (explicit or implicit on params/returns), no unsafe `as` casts (especially `as unknown as`, `as any`), no non-null `!` used to paper over nullability, no `@ts-ignore` / `@ts-expect-error` silencing real errors.
- No untyped external boundaries — network, JSON and user input are typed by the schema that parses them; a hand-written type beside or instead of the schema is the finding (`process.env` is `env-audit`'s).

### Error handling

- Consistent, **typed** errors — no throwing bare strings or plain objects; a shared error shape where the house has one.
- No **empty catches** and no **swallowed errors** — every catch logs, rethrows, or handles; no `catch {}` that only `console.log`s and continues on a critical path.
- No unhandled promise rejections or **floating promises** (async calls not awaited/handled); async paths in loops/handlers actually settle — type-aware lint (`no-floating-promises`) catches these where it's on.
- `catch (error)` treats the error as `unknown` and narrows before use.

### Tests

Criteria from `testing`:

- A test setup exists and runs — a test script and a runner configured; flag source with no test infrastructure.
- Shared functions and hooks, services, data modules, guards, routes, Server Actions and workers have a **behavioural spec beside them**, covering the success path and each refusal — flag ones that don't. An async Server Component holds no decisions: it awaits a data function and renders, and that function and its child components carry the tests. A route spec calls the exported handler with a real `Request`; shared generic helpers have type tests (`*.test-d.ts`).
- **Mocks only at I/O boundaries** — cloud SDKs, `next/navigation`, `next/headers`, `next/cache`, `server-only`, `fetch`, timers, a hosted Redis client — and a project function only when it does I/O itself (the project's client module, swapped for an in-memory fake). A spec that mocks the project's own schemas, utilities or hooks, or a pure dependency, tests the stub.
- **Setup and placement** — the setup file seeds a placeholder for every env key the guard requires and mocks `server-only`; a mocked module a dependency imports is inlined (`test.server.deps.inline`); manual mocks are typed `Mock<typeof fn>`; fixtures and fakes live in `src/testing/`, and one two workspaces use moves to the shared testing package; node and jsdom run as separate projects, with every test file in exactly one.
- **Independent and deterministic** — mocks reset after each test; fake timers and a fixed timezone, locale and seed instead of the real clock or `Math.random`; tests pass in shuffled order.
- No **skipped, focused or weakened** tests (`.skip`, `.only`, `xit`, a deleted or loosened assertion) and no unit or integration retries hiding a flaky test — a flaky test is fixed, never quarantined. No empty or assertion-free tests.
- A coverage floor on shared packages and critical paths (auth, money, permissions) that only ever rises; no floor at all there is a finding.

### CI hygiene

Criteria from `devops` (action SHAs, scanners and advisories are `dependency-audit`'s):

- Lint fails on any warning (`eslint --max-warnings 0`); `no-console` allows only `info`, `warn`, `error` and `debug`; hooks are husky with lint-staged formatting staged files and commitlint on the message — nothing slow in pre-commit.
- Every workflow starts from `permissions: {}` and each job grants only what it uses; checkouts that don't push set `persist-credentials: false`.
- No `${{ github.event.* }}` text inside a `run:` (passed through `env:` instead), and no `pull_request_target` or `workflow_run` workflow that checks out or runs PR code.
- Every job has `timeout-minutes`, and every workflow a `concurrency` group that cancels superseded runs.
- Prettier formats every file type with `proseWrap: "preserve"` and ESLint loads `eslint-config-prettier`; flat configs come from one shared preset package, each workspace re-exporting one preset; `turbo/no-undeclared-env-vars` is on.
- CI runs format, lint and types, build and tests as parallel jobs; pull requests run only what changed and a push to a tier branch runs everything; the build gets placeholder values for every secret its env guard requires; CI never deploys unless the project records otherwise (below).

### Branches, releases and deploys

Criteria from `devops`. Repository settings are read with `gh api` where it's available (`repos/{owner}/{repo}/rulesets`, `rules/branches/{branch}`); what can't be read is "needs confirmation", never a guess.

- **Tier branches are protected by rulesets** — a pull request and the CI checks required, no force-push, no deletion — so nothing reaches them by a direct commit. A tier branch with no ruleset, or one whose required checks don't match the CI job names, is `HIGH`.
- **Promotion PRs merge with a merge commit, never a squash** — check the history of each higher tier for squashed promotions; pull request titles are checked as Conventional Commits by a workflow; a workflow that applies a label has a seeding script that creates it.
- **Releases** — every push to `main` publishes a release and tag through release-drafter, with a labelling workflow mapping commit types to labels and marking promotion PRs so the notes skip them; changesets only where a package is published to a registry.
- **Deploys** — one project or target per tier, from that tier's branch; automatic rollouts off where every backend tracks one branch; functions, rules and indexes deployed from a machine, never CI. A rollback runbook per tier and a named owner of each app's logs, health check and alerts sit in the project's docs — that they were tested needs confirmation.
- **Where CI does deploy**, it authenticates with short-lived OIDC (Workload Identity Federation) — a long-lived service-account key stored as a CI secret is `HIGH` — and gates on a post-deploy health check.
- **Opt-in gates** — preview deploys, end-to-end tests, bundle budgets, Lighthouse CI, CODEOWNERS, protected environments, a merge queue, an SBOM: absence isn't a finding; a gate the project's docs record that isn't wired up is.

### Git hygiene

- No large binaries or build output (`dist/`, `build/`, `.next/`, coverage, `node_modules/`) tracked — verify with `git ls-files` before flagging. Committed secrets and `.env*` files are `env-audit`'s — route them.
- `.gitignore` covers build output, dependency folders and OS and editor files.
- No leftover **debug logging** (`console.log`, `debugger`, `print`, verbose dumps) in shipped/non-test code.
- No unresolved **merge-conflict markers** (`<<<<<<<`, `=======`, `>>>>>>>`) left in tracked files.

## Fixing what it found

Fixing is a separate request, after the report is written, and covers only the findings the owner chose. Then **update the report in place — never re-run the audit to update it**: a re-run re-checks the whole codebase, costs a full audit and raises new findings mid-fix. Mark each fixed finding `FIXED` with its commit and a one-line note of what changed, mark a finding the owner rules out `WON'T FIX` with their reason, and leave everything else as it stands. Recompute the scorecard categories the fixes touched and the Overall, and rewrite the one score-change row (previous → current) — never add a second row.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
