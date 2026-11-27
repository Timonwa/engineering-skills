---
name: devops
description: >-
  A repo's format, check, release and ship automation — Prettier and shared ESLint presets, fast git hooks, GitHub Actions with parallel jobs and hardening against workflow injection, tier branches protected by rulesets with merge-commit promotions, release-drafter releases, deploys kept out of CI with a rollback runbook, and opt-in gates. Use when setting up or reviewing CI/CD, hooks, branches, releases or deployment.
---

# DevOps

How the repo **formats, checks, releases and ships**. The house practice comes first; the gates a project adds when it needs them are at the end, marked as such.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Formatting and linting

- **Prettier formats every file type** — TypeScript, JavaScript, JSON, CSS, Markdown, MDX — with `proseWrap: "preserve"` so prose is never hard-wrapped. ESLint loads `eslint-config-prettier`, so the two never argue.
- **ESLint flat configs come from one shared package** with a preset per kind of workspace (`base`, `next`, `react-internal`); each workspace's config re-exports one preset. A rule every file should obey goes in `base`, anything narrower in the narrowest preset.
- **Every rule is a warning in the editor and an error in the check**: `eslint-plugin-only-warn` keeps the editor yellow, and every `lint` script runs `eslint --max-warnings 0`, so a warning still fails.
- **House rules:** `no-console` allowing only `info`, `warn`, `error` and `debug` (the structured logger owns output); unused variables and arguments ignored only with a leading underscore; `turbo/no-undeclared-env-vars`, so a build reading an unlisted env var fails lint.
- **Imports in order:** React, external, internal (`@/*`, workspace packages), then relative. Where no lint rule enforces it, the reviewer does.

## Git hooks

- **husky** installs the hooks (`"prepare": "husky"`).
- **pre-commit runs lint-staged with Prettier over the staged files only**, so committing stays fast. Lint, types and tests run in CI.
- **commit-msg runs commitlint** with the Conventional Commits config. The message format is `ship-changes`'.
- **Because hooks don't lint, type-check or test, run `pnpm lint && pnpm check-types && pnpm format:check` before committing**, and the test suites the change reaches.

## CI on GitHub Actions

- **One composite setup action** (`.github/actions/setup`) that every job uses: pnpm before Node (`pnpm/action-setup` first, reading `packageManager`, so `setup-node`'s `cache: pnpm` finds the store), Node from `.nvmrc`, then `pnpm install --frozen-lockfile`. `actions/checkout` stays in the workflow, never inside the composite action, because a local action can't be found before the checkout that brings it.
- **Parallel jobs that share nothing**, each on its own runner:

  | Job              | Runs                                                                                                            |
  | ---------------- | --------------------------------------------------------------------------------------------------------------- |
  | `format`         | `pnpm format:check`                                                                                             |
  | `lint-and-types` | the env parity check, other repo checks, `pnpm audit --audit-level critical`, then `turbo run lint check-types` |
  | `build`          | `turbo run build`                                                                                               |
  | `test`           | `turbo run test`, one job per app and package; a long suite splits into groups by domain                        |
  | `stories`        | installs Playwright's Chromium (cached on its version), then runs the Storybook tests                           |

- **Pull requests run only what changed** (`--affected`, with `TURBO_SCM_BASE=origin/<base>` and `fetch-depth: 0`); a push to a tier branch runs everything.
- **The build gets placeholder values for every secret its env guard requires**, set in the workflow, so `next build` passes without real secrets in CI — and on a fork's PR, which gets no secrets.
- **CI checks and never deploys.** Deploying is its own step, below.

## Hardening

- **No untrusted text in a script.** A PR's title, body or branch name, a commit message or an issue's text is attacker-written; `${{ github.event.… }}` inside `run:` pastes it into the shell. Pass it through `env:` and quote the variable (`"$PR_TITLE"`).
- **`pull_request_target` and `workflow_run` never run the PR's code.** They carry secrets and a write token, so they only label, comment or check titles, without checking out the PR; anything that builds or tests PR code runs on `pull_request`.
- **`persist-credentials: false` on every checkout** that doesn't push, so later steps and the code they run can't reuse its token.
- **Least-privilege tokens.** Every workflow starts from `permissions: {}`; each job grants only what it uses (`contents: read`, `pull-requests: write`).
- **Every third-party action is pinned to a full commit SHA**, first-party ones included. A tag can be moved to point at different code.
- **Every job has `timeout-minutes`**, and every workflow a `concurrency` group that cancels a superseded run on the same ref.
- **Secret scanning with push protection** on the repository, and nothing secret in a workflow file.
- **Scanners on every PR:** CodeQL's default setup for the code, `dependency-review-action` to stop a PR that adds a vulnerable dependency, and `zizmor` or `actionlint` over the workflows themselves.
- **Advisories are reported on every run and fail CI only on a critical**: `pnpm audit --audit-level critical`, plus GitHub's dependency alerts. An advisory inside someone else's dependency is fixed by that dependency releasing it — never force a version into a third-party tree. Record each known advisory and where it lives beside the install settings.
- **Automated dependency updates** (Renovate or Dependabot, grouped and scheduled) keep versions and action SHAs current — Dependabot needs the `github-actions` ecosystem listed for the SHAs; a project that relies on alerts alone records that as a deviation.
- **Dependency build scripts stay blocked except the allowlisted few** — see `monorepo`.

## Branches and pull requests

- **Tier branches** — `dev` for development, `staging` for QA, `main` for production; `dev` is the default. They take pull requests only, never a direct commit or push — enforced by a ruleset on each: a pull request and the CI checks required, no force-push, no deletion.
- **Work happens on `type/short-description` branches cut from `dev`**, with pull requests into `dev`. Code moves up by pull request: feature → `dev` → `staging` → `main`.
- **A promotion PR (`dev` → `staging`, `staging` → `main`) merges with a merge commit, never a squash**, or the pull requests it carries never reach the higher branch's history.
- **Pull request titles are Conventional Commits**, checked by a workflow.
- **Small workflows, one job each:** labels by changed path and by commit type, auto-assign to the author, stale issues and PRs, issue labels from the template. **A label is created by a seeding script before any workflow applies it**, because a workflow can't add a label the repository doesn't have.

## Releases

- **Every push to `main` publishes a GitHub release and its `vX.Y.Z` tag through release-drafter**, the version bumped from the labels on the pull requests it carries.
- **A labelling workflow maps each PR's commit type to those labels, and marks a promotion PR `promotion`**, which the notes skip — so a release lists the feature PRs, not the promotions that carried them.
- **Changesets only for a package published to a registry**; an app-only repo doesn't need them. How the release notes read is a writing task, outside this skill.

## Deploying

- **One project or target per tier**, deployed from that tier's branch.
- **Automatic rollouts off** where every backend tracks the same branch, so a push doesn't rebuild every app; a deploy is a manual rollout of only the backends that changed.
- **Before a manual deploy:** format, lint and types pass; the app being deployed builds; every secret it reads exists in the target project, and the backend has access to each. How secrets are granted is `env`'s.
- **A rollback runbook** in the project's docs, tested once per tier: how to roll each backend back to its previous release (App Hosting, Cloud Run and Vercel all keep them), and how to revert rules or an index. A rollback restores the code, never the data, so a migration ships with its own way back.
- **Someone owns each deployed app's logs, health check and alerts**, named in the project's docs; an alert no one reads is the same as none.
- **When CI does deploy,** it authenticates to the cloud with short-lived OIDC (Workload Identity Federation), never a long-lived service-account key stored as a CI secret, and gates on a post-deploy health check with rollback one step away.
- Functions, security rules and indexes deploy from a machine with the Firebase CLI, never from CI. Rules and indexes are `firestore`'s; each worker's deploy is in its own README.

## Gates to add when a project needs them

Not house defaults; add each when the project's size or risk calls for it, and record it.

- **End-to-end tests** with Playwright against a per-PR preview deploy, the report and traces uploaded on failure.
- **Bundle budgets** (`size-limit` on `.next/static`) — deterministic and cheap, they catch dependency bloat first.
- **Lighthouse CI** against the preview on the pages that matter, with thresholds just above today's numbers to catch regressions. Interaction latency (INP) needs field data, not CI.
- **Preview deploys per PR**, where the host supports them, torn down on merge.
- **CODEOWNERS**, **deployment environments** with required reviewers on production, and a **merge queue** once concurrent PRs collide.
- **An SBOM, SLSA provenance and keyless signing** when the repo publishes a package or a signed artifact; npm packages publish with `--provenance`.
- **Error tracking with source maps, uptime checks, and deploy and budget alerts.**

## Do / Don't

- **Do** pass event text through `env:`; set `persist-credentials: false`; protect tier branches with rulesets; keep a tested rollback runbook; format everything with Prettier; fail lint on any warning; keep hooks to staged formatting and commit messages; share one setup action; run parallel jobs; pin actions to SHAs; start from `permissions: {}`; time-box every job; fail audits only on critical; merge promotions with a merge commit; release from `main` with release-drafter; keep deploys out of CI.
- **Don't** run builds or tests in a pre-commit hook; give a job permissions it doesn't use; pin an action to a tag; force a version into a third-party dependency; squash a promotion PR; commit straight to a tier branch; store a long-lived cloud key as a CI secret; put `${{ github.event.* }}` in a `run:`; check out PR code in `pull_request_target`.

## Related skills

**This skill sets the rules and never writes an audit report.** An audit of this area is `/dependency-audit`, `/env-audit`, and `/codebase-audit`, each written from its own template. Run it rather than writing a report from here.

- Workspace, catalog, `allowBuilds` and `--affected` → `monorepo`.
- Env, secrets and grants → `env`.
- Commit messages, branches and opening PRs → `ship-changes`; reviewing a PR → `review-pr`.
- Security headers and CSP → `frontend-security`.
- How the release notes read is a writing task, outside this skill.
- Reviewing dependencies → `dependency-audit`; the env setup → `env-audit`.
