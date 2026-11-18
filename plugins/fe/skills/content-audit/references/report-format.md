# Content audit — report format

Write to `_reports/content-audit.md`:

```
# Content audit — <app/scope>

**Date:** <YYYY-MM-DD> · **Phase:** <phase> · **Mode:** Report-only · **Branch:** `<branch>` · **Scope:** <what was audited; the voice docs read, or "baseline voice — none recorded"> · **Overall:** <X>/10

## Score change (previous → current)
| Metric | Previous | Current | Δ | Trend |
| --- | --- | --- | --- | --- |
| Overall | <prev/10 or N/A> | <cur/10> | <+N / -N / 0> | <▲ / ▼ / ■ / N/A> |

## Findings
| ID | Severity | Category | Status | Issue | Location |
| --- | --- | --- | --- | --- | --- |
| 1 | HIGH | <category> | NEW | <one-line issue> | `file/path:line` |

### F1 — <title>
- **What:** <the defect, and the string as the reader sees it>
- **Why it matters:** <who it confuses or misleads, and how> <· the rule: the project's voice doc, word list or banned words, a standard such as WCAG 3.3.3 or GOV.UK error messages, or "house rule">
- **Fix:** `<current text>` → `<proposed text>`

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Voice and word list | <X>/10 | <one-line justification> |
| Writing for the web | <X>/10 | <one-line justification> |
| Marketing pages | <X>/10 | <one-line justification> |
| Buttons and links | <X>/10 | <one-line justification> |
| Forms and errors | <X>/10 | <one-line justification> |
| States and notifications | <X>/10 | <one-line justification> |
| Style and mechanics | <X>/10 | <one-line justification> |
| Accessible words | <X>/10 | <one-line justification> |
| Emails | <X>/10 | <one-line justification> |

A category with nothing in scope (no marketing pages, no emails) is marked N/A and left out of the overall score.

## Action items
Tiers by phase — `development` → **Fix Now / Before Launch / Post-Launch**; `production` → **Fix Now / Next Release / Backlog**. Each task references a finding ID.

### <Tier>
| # | Priority | Task (finding ID) | Effort |
| --- | --- | --- | --- |

## Resolved since last audit
| ID | Issue | How it was resolved |
| --- | --- | --- |
```
