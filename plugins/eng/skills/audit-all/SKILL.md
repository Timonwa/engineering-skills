---
name: audit-all
description: >-
  Manually invoked. Runs the house audit suite across the eng, fe and be plugins — detects what the repo has, runs every installed audit that applies (codebase, conventions, dependencies, env, security, accessibility, frontend, performance, SEO/AEO/GEO, Storybook, content, API, access control, Firestore, Redis), and rolls their reports into one health report with an overall score and cross-cutting priorities. Each audit still writes its own report.
argument-hint: "[phase]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Audit all

The **orchestrator** for the house audits. It works out what the repo contains, runs each audit that is **installed and applies**, and rolls the results into one report — one health picture instead of a dozen. Each audit still writes its own `_reports/<name>.md`; this adds `_reports/audit-all.md`.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[phase]` — `development` | `production`. Optional. Without it, the phase is the one the project's `AGENTS.md` records (an "audit phase" line); with neither, `production` — assume the app is live until told otherwise. The same phase goes to every audit, so their tiers line up.

Severity levels (CRITICAL / HIGH / MEDIUM / LOW) are each audit's own; this skill only aggregates them.

## The audits

Each is its own manually invoked command, in the plugin that owns its domain. Run only the ones installed — a project may have one plugin and not the others — and say in the report which weren't available.

| Audit                                                          | Plugin | Run when                                                                                                         |
| -------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `codebase-audit`                                               | `eng`  | always — broad triage first                                                                                      |
| `conventions-audit`                                            | `eng`  | always                                                                                                           |
| `dependency-audit`                                             | `eng`  | a lockfile or workspace exists (its deepest checks target pnpm workspaces; other managers scope to what applies) |
| `env-audit`                                                    | `eng`  | the code reads environment variables                                                                             |
| `security-audit`                                               | `eng`  | always — scoped to frontend, backend or both                                                                     |
| `accessibility-audit` · `frontend-audit` · `performance-audit` | `fe`   | there's browser UI                                                                                               |
| `seo-aeo-geo-audit`                                            | `fe`   | an app is public and meant to be found                                                                           |
| `storybook-audit`                                              | `fe`   | Storybook is configured                                                                                          |
| `content-audit`                                                | `fe`   | there's user-facing copy — pages, help articles, UI strings — or email templates                                 |
| `api-audit` · `access-control-audit`                           | `be`   | there's an API or route-handler layer                                                                            |
| `firestore-audit`                                              | `be`   | Firestore is used — rules, indexes or Admin SDK queries                                                          |
| `redis-audit`                                                  | `be`   | Redis is used                                                                                                    |

Security rules files themselves are reviewed by the official `firebase-security-rules-auditor`, which this skill **doesn't run** — it's a separate, official skill with its own invocation. Where rules files exist, the suite summary lists it as "run separately" (or "not installed"); `firestore-audit` and `access-control-audit` check the code around the rules.

## Method

1. **Resolve the phase once**, as above.
2. **Detect the scope** — single app or workspace, which apps are public and which internal, and which of the data, tooling and copy above are present — and pick the audits that apply and are installed.
3. **Run them in parallel**, one subagent per audit. Every audit sets `disable-model-invocation`, so a subagent never loads one by name: tell each subagent to **Read that audit's `SKILL.md` by path** (in the plugin's `skills/<audit>/` folder) and follow it, writing its own report. Every audit is **report-only**: none changes code.
4. **Aggregate** — each report's score, finding counts and top items. A finding two audits both raise (a missing guard in `api-audit` and `access-control-audit`) is reported once, naming both.
5. **Write** `_reports/audit-all.md`, overwriting the whole file, so no resolved history accumulates; read the previous roll-up only for its scores, for the trend.

## Report format

```
**Date:** YYYY-MM-DD  **Phase:** <phase>  **Mode:** Report-only  **Branch:** `<branch>`  **Scope:** <apps / packages covered>  **Overall:** <X>/10

## Suite summary
| Audit | Score | Critical | High | Med | Low | Fixed | Won't fix | Trend | Report |
| accessibility-audit | 7/10 | 0 | 2 | 3 | 1 | 4 | 1 | ▲ | _reports/accessibility-audit.md |
| … | | | | | | | | | |
| (skipped: storybook-audit — no Storybook) |
| (not installed: redis-audit — the be plugin isn't installed) |
| (run separately: firebase-security-rules-auditor — rules files present) |

## Top priorities (cross-cutting, worst first)
Consolidated open CRITICAL and HIGH items across all audits, each pointing to its report and finding ID.

## Action items
Phase-aware tiers (`development` → Fix Now / Before Launch / Post-Launch; `production` → Fix Now / Next Release / Backlog), merged across audits.
```

Critical, High, Med and Low count each audit's open findings (`NEW` + `UNRESOLVED`); Fixed and Won't fix count its `FIXED` and `WON'T FIX` findings beside them.

The overall score is the mean of the audits that ran, pulled down to the lowest one when any has an open CRITICAL — a single critical hole outweighs a tidy average.

## Fixing what it found

Fixes are made through each audit's own report, which is updated in place. To bring the roll-up up to date after fixes, read the updated reports and rewrite `_reports/audit-all.md` from them — never re-run an audit to update it: a re-run re-checks the whole codebase, costs a full audit and raises new findings mid-fix.

## Boundaries

- **Report-only.** Audits never change code; this skill only aggregates their reports, and never commits or pushes.
- **Don't duplicate depth.** The roll-up summarises; the detail lives in each audit's report.
- **Nothing is skipped silently.** An audit that didn't apply or isn't installed is listed with the reason.
