# Codebase audit — report format

Write to `_reports/codebase-audit.md`:

```
# Codebase audit — <app/scope>

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
- **Why it matters:** <impact / who it affects> <· optional standard or criterion ref, e.g. the TypeScript 6.0 notes, `testing`'s mock rule>
- **Fix:** <the specific remediation>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Tech debt | <X>/10 | <one-line justification> |
| Dead code | <X>/10 | <one-line justification> |
| TypeScript strictness | <X>/10 | <one-line justification> |
| Error handling | <X>/10 | <one-line justification> |
| Tests | <X>/10 | <one-line justification> |
| CI hygiene | <X>/10 | <one-line justification> |
| Branches, releases and deploys | <X>/10 | <one-line justification> |
| Git hygiene | <X>/10 | <one-line justification> |

## Deep audits to run next
<Triage pointer — for each domain that showed smells, name the audit to run and why. Keep this shallow; the depth lives there. If the owner audit isn't installed, flag the domain for a focused manual review instead.>

| Domain | Signal spotted | Run |
| --- | --- | --- |
| <e.g. authorization> | <e.g. route with no role guard> | `access-control-audit` |

## Action items
Tiers by phase — `development` → **Fix Now / Before Launch / Post-Launch**; `production` → **Fix Now / Next Release / Backlog**. Each task references a finding ID.

### <Tier>
| # | Priority | Task (finding ID) | Effort |
| --- | --- | --- | --- |

## Resolved since last audit
| ID | Issue | How it was resolved |
| --- | --- | --- |
```
