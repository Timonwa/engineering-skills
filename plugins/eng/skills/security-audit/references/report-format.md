# Security audit — report format

Write to `_reports/security-audit.md`, with one Overall row in the score change:

```
# Security audit — <app/scope>

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
- **Why it matters:** <impact / who it affects> <· optional standard or criterion ref, e.g. OWASP A01:2025, API1:2023>
- **Fix:** <the specific remediation>
- **Note:** <only once `FIXED` (the commit and what changed) or `WON'T FIX` (the owner's reason)>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Access control, SSRF and CSRF | <X>/10 | <one-line justification> |
| Misconfiguration | <X>/10 | <one-line justification> |
| Cryptography and field encryption | <X>/10 | <one-line justification> |
| Uploads and user files | <X>/10 | <one-line justification> |
| Injection and XSS | <X>/10 | <one-line justification> |
| Abuse cases and limits | <X>/10 | <one-line justification> |
| Authentication and sessions | <X>/10 | <one-line justification> |
| Integrity, audit trail and errors | <X>/10 | <one-line justification> |
| Cookie consent | <X>/10 | <one-line justification> |
| Headers and CSP | <X>/10 | <one-line justification> |
| Supply chain (SRI; the rest in dependency-audit) | <X>/10 | <one-line justification> |

## Action items
Tiers by phase — `development` → **Fix Now / Before Launch / Post-Launch**; `production` → **Fix Now / Next Release / Backlog**. Each task references a finding ID.

### <Tier>
| # | Priority | Task (finding ID) | Effort |
| --- | --- | --- | --- |
```
