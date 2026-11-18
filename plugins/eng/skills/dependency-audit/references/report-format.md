# Dependency audit — report format

Write to `_reports/dependency-audit.md`:

```
# Dependency audit — <app/scope>

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
- **Why it matters:** <impact / who it affects> <· optional standard or criterion ref, e.g. pnpm's supply-chain docs, `monorepo`'s catalog rule>
- **Fix:** <the specific remediation>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| One version per dependency | <X>/10 | <one-line justification> |
| Workspace packages and direction | <X>/10 | <one-line justification> |
| Unused, missing and misplaced | <X>/10 | <one-line justification> |
| Duplicates | <X>/10 | <one-line justification> |
| Deprecated and removed packages | <X>/10 | <one-line justification> |
| Build scripts, release age and advisories | <X>/10 | <one-line justification> |
| Supply chain in CI | <X>/10 | <one-line justification> |
| Turborepo | <X>/10 | <one-line justification> |
| Lockfile and tooling | <X>/10 | <one-line justification> |

## Action items
Tiers by phase — `development` → **Fix Now / Before Launch / Post-Launch**; `production` → **Fix Now / Next Release / Backlog**. Each task references a finding ID.

### <Tier>
| # | Priority | Task (finding ID) | Effort |
| --- | --- | --- | --- |

## Resolved since last audit
| ID | Issue | How it was resolved |
| --- | --- | --- |
```
