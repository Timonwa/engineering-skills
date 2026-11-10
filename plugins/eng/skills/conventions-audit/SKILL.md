---
name: conventions-audit
description: >-
  Manually invoked. Audits an app or monorepo against the house naming and code-structure standards — hardcoded URLs versus route constants, schema, type and const placement, duplicated utilities and hooks across packages, identifier and file naming (Schema and Props suffixes, UPPER_SNAKE_CASE consts, use* hooks, kebab-case files), and thin route entries. Verifies each finding and writes a prioritized report.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Conventions audit

A **manually-invoked, red-team conventions audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/conventions-audit.md`.

> **Self-contained** — this checklist is comprehensive on its own and needs no other skill installed. Where the house standard(s) **`naming`** and **`code-structure`** ARE present, also apply their house-specific rules as an enhancement.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[phase]` — `development` | `production`; sets the action-item tiers. Omitted → `production` (assume the app is live until told otherwise — the safer default).
- `[path]` — a file, directory, or PR/diff to scope the audit to; omitted → the whole repo.

## Audit protocol

**Mindset — reviewer/attacker first.** Don't assume code is fine because it looks careful; find the sequence that breaks it. Report only findings you can justify as real, each verified before it lands.

### Method

1. **Resolve phase** — use a phase arg (`development` | `production`) if given; else default `production` — assume the app is live with real users until told otherwise, so a CRITICAL finding gets Fix-Now urgency instead of a pre-launch discount. Phase sets the action-item tiers.
2. **Load the previous report** — if `_reports/conventions-audit.md` exists, read it: carry unresolved findings forward (same ID, status `UNRESOLVED`), move fixed ones to "Resolved since last audit", and continue ID numbering. First run → skip Resolved and mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating.
5. **Write the report** to `_reports/conventions-audit.md` (overwrite) and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — actively exploitable or broken now: data loss/leak, security breach, or total failure of the audited concern. Fix immediately.
- **HIGH** — a serious defect that will bite in production or blocks launch. Fix before shipping.
- **MEDIUM** — a real issue with a workaround or limited blast radius. Schedule it.
- **LOW** — minor, polish, or defense-in-depth.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/conventions-audit.md`:

```
# Conventions audit — <app/scope>

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
- **Why it matters:** <impact / who it affects> <· optional standard or criterion ref, e.g. WCAG 2.1.2 / OWASP A01>
- **Fix:** <the specific remediation>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Naming | <X>/10 | <one-line justification> |
| File naming | <X>/10 | <one-line justification> |
| Placement | <X>/10 | <one-line justification> |
| Duplication | <X>/10 | <one-line justification> |
| Hardcoded values | <X>/10 | <one-line justification> |

## Action items
Tiers by phase — `development` → **Fix Now / Before Launch / Post-Launch**; `production` → **Fix Now / Next Release / Backlog**. Each task references a finding ID.

### <Tier>
| # | Priority | Task (finding ID) | Effort |
| --- | --- | --- | --- |

## Resolved since last audit
| ID | Issue | How it was resolved |
| --- | --- | --- |
```

### Output

Every run produces two things:

- **Full report** → `_reports/conventions-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

The criteria below are the audit's full working rules — self-contained. For house specifics, if installed → `naming` and `code-structure`. Check the shared packages (`@app/*` — `schemas`/`utils`/`hooks`/`ui`) and each app's `src/`.

### Naming

- **Identifiers** — functions verb-first (`get`/`fetch`/`create`/`build`/`format`/`parse`/`handle`/`on`) and ownership-revealing (feature-prefixed unless genuinely shared).
- **Suffixes** — Zod schema value ends in `Schema` (`UserSchema`); its inferred type takes the clean noun (`type User = z.infer<…>`, **no** `Type` suffix); component props type ends in `Props`.
- **Constants** — `UPPER_SNAKE_CASE` (`EVENT_STATUSES`), including `as const` arrays.
- **Casing** — `camelCase` for variables/functions/props/hooks, `PascalCase` for components and types, `UPPER_SNAKE_CASE` for constants, `kebab-case` for files and CSS classes.
- **Components** — PascalCase noun phrase for what it renders; feature-local ones carry the feature prefix (`SeoMetaHero`, not a bare second `Hero`).
- **Descriptive, no rename-on-import** — full words over cryptic abbreviations or vague `data`/`item`/`temp`; one canonical name per symbol (no `import X as Y`).
- **Hooks** — `use` + Capital (`useCurrentUser`).
- **Page content** — a composed page export ends in `PageContent` (`LandingPageContent`).
- **Booleans** — `is`/`has`/`are`/`can`/`should`/`will` (variables, props, boolean-returning fns).
- **File name = export name = usage** — no rename-on-import; the file's kebab name matches its primary export's concept.

### File naming

- **Code files** — `kebab-case` matching the primary export (`search-input.tsx`, `use-click-outside.ts`); framework-mandated names (`page.tsx`, `layout.tsx`) exempt.
- **Kinded files** where the project uses them — `*.schema.ts` for schema files, `*.constant.ts` / `*.constants.ts` for constant files.

### Placement

- **Kind-first barrels** — schemas/types/consts live in the right kind folder and export through its barrel (`@/lib/<kind>` or `@app/<kind>`), not scattered loose.
- **Barrels list explicit exports** — one named line per file, never `export *` over a directory of files; a wildcard hides what joined the surface. A barrel that composes other barrels (`ui/index.ts` over its tiers) is the documented exception.
- **A Zod schema and its inferred type live together** in the `schemas` kind — not re-declared in `types/`, which holds only shapes no const or schema produces.
- **Shared vs app** — a symbol used by more than one app/feature belongs in the shared package (`@app/schemas`/`utils`/`hooks`); a genuinely app-local one (form/UI state, env schema, app config) stays in the app. Domain schemas/entities don't belong inline in component/page files.
- **Server boundary** — server-only code sits behind `lib/server/` with its own `server-only` barrel; no server code reachable from a client-safe barrel.
- **Thin route/entry** — `page.tsx`/route files only import a `…PageContent` and render it; no markup, data, or logic inline. Sections are one-per-file named exports; `index.tsx` composes.
- **`components/` holds only `.tsx`** — no schemas/types/utils/consts hiding there (allowed exceptions: a stub `data.ts`, the `ui/index.ts` barrel, framework-mandated `manifest`/`robots`/`sitemap`). `components/ui/` follows the tiers where used (`base`/`blocks`/`patterns`/`layouts`).
- **Small, isolated files** — no oversized files (~200-line guide) mixing many concerns; one file per section/modal, stateful logic extracted to a `use-*` hook in the `hooks` kind, not beside the component.

### Duplication

- **Utilities/hooks** re-implemented across apps/packages/features — identical or near-identical copies should be consolidated into the shared package (`@app/utils` / `@app/hooks`) and imported. Truly app-specific helpers (server-lib-bound, app-context-bound) stay put.
- **Repeated UI/logic** — the same section or logic in two places should be one reusable component/hook (see `reusables`).

### Hardcoded values

- **URLs/paths** — page paths or full URLs hardcoded where a route/endpoint constant or `site.url`/env value exists. Ignore `routes`/`site.metadata`/config files that _define_ these, `.env.example`, comments/JSDoc, the bare `/` root, and Storybook demo data.
- **Magic values** — unexplained literals (limits, keys, statuses) that should be named constants.
- **`routes.ts` / `endpoints.ts` are grouped, not one flat map** — routes group by route group, endpoints by the backend's own resource; a parameterised path is a function inside its group so no caller concatenates. Flag a single object carrying dozens of keys.
- **The API version is a constant the endpoints build from**, never repeated on every line — a version bump should be one edit no endpoint can be missed by.
- **Nothing in `.env` that isn't a secret** — apply the gate from `devops`: would leaking it hurt? A base URL, cookie domain, CORS origin, analytics id, or project id answers no, so it belongs in a committed config module keyed off `APP_ENV`.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
