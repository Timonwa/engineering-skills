---
name: audit-all
description: >-
  Manually invoked. Orchestrates the full house audit suite — detects what the repo has, runs every applicable domain audit (accessibility, seo, storybook, conventions, dependencies, environment, frontend, performance, api, access-control, firestore, redis, codebase, security), and aggregates them into one health report with an overall score and cross-cutting priorities. Each domain audit also writes its own report.
argument-hint: "[phase]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Audit all

The **orchestrator** for the house audit family. It figures out what the repo actually contains, runs each **applicable** audit, and rolls everything up into a single consolidated report — so you get one health picture instead of fifteen. Each domain audit still writes its own `_reports/<name>.md`; this adds `_reports/audit-all.md` on top.

> **The family** (each is its own manually-invoked command): `accessibility-audit`, `seo-audit`, `storybook-audit`, `conventions-audit`, `dependency-audit`, `env-audit`, `frontend-audit`, `performance-audit`, `api-audit`, `access-control-audit`, `firestore-audit`, `redis-audit`, `codebase-audit`, `security-audit`. Firestore/Storage **rule** internals → `firebase-security-rules-auditor`.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[phase]` — `development` | `production`. Optional; defaults to `production` (assume the app is live until told otherwise). Passed unchanged to every sub-audit.

Severity levels (CRITICAL/HIGH/MEDIUM/LOW) are as defined in each domain audit — this skill only aggregates them.

## Which audits apply

Detect from the repo, then run only what fits (skip the rest and say so in the report):

| Audit                                                          | Run when                                                                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `codebase-audit`                                               | always (broad triage first)                                                                                            |
| `conventions-audit`                                            | always                                                                                                                 |
| `dependency-audit`                                             | a lockfile / workspace exists (its deepest checks target pnpm workspaces; on npm/yarn repos it scopes to what applies) |
| `env-audit`                                                    | there are environment variables / `.env.example`                                                                       |
| `security-audit`                                               | always (scoped to frontend / backend / both)                                                                           |
| `frontend-audit` · `performance-audit` · `accessibility-audit` | there's browser/UI code                                                                                                |
| `seo-audit`                                                    | a public-facing app                                                                                                    |
| `storybook-audit`                                              | Storybook is configured                                                                                                |
| `api-audit` · `access-control-audit`                           | there's an API / route-handler layer                                                                                   |
| `firestore-audit`                                              | Firestore is used — rules, indexes, or Admin-SDK queries                                                               |
| `redis-audit`                                                  | Redis / Upstash is used                                                                                                |

## Method

1. **Resolve phase once** — a phase arg (`development` | `production`) if given; else default `production` (assume the app is live until told otherwise). Pass the same phase to every sub-audit so tiers line up.
2. **Detect scope** — single app vs monorepo, which apps are public/internal, and which data/infra (Firestore, Redis, Storybook, API) are present, to pick the applicable audits above.
3. **Run the applicable audits** — prefer running them **in parallel** (one subagent per audit), each following its own skill and writing its own `_reports/<name>.md`. Every audit is **report-only** — none modify code.
4. **Aggregate** — collect each sub-report's score, finding counts, and top items; de-duplicate cross-cutting findings (a missing auth guard may surface in both `api-audit` and `access-control-audit` — report it once, note both).
5. **Write** `_reports/audit-all.md` (overwrite; carry forward the previous roll-up for trend). Never commit or push without explicit approval.

## Report format

```
**Date:** YYYY-MM-DD  **Phase:** <phase>  **Mode:** Report-only  **Branch:** `<branch>`  **Scope:** <apps / packages covered>  **Overall:** <X>/10

## Suite summary
| Audit | Score | Critical | High | Med | Low | Trend | Report |
| accessibility-audit | 7/10 | 0 | 2 | 3 | 1 | ▲ | _reports/accessibility-audit.md |
| … | | | | | | | |
| (skipped: storybook-audit — no Storybook) |

## Top priorities (cross-cutting, worst-first)
Consolidated CRITICAL/HIGH items across all audits, each pointing to the owning sub-report + finding ID.

## Action items
Phase-aware tiers (`development` → Fix Now / Before Launch / Post-Launch; `production` → Fix Now / Next Release / Backlog), merged across audits.

## Resolved since last run
```

## Boundaries

- **Report-only** — audits never modify code; `audit-all` only aggregates their reports.
- **Don't duplicate depth** — the roll-up summarizes; the detail lives in each sub-report. De-duplicate shared findings.
- Verify sub-audits actually ran (skipped ones are stated, not silently dropped). Never commit or push without explicit approval.
