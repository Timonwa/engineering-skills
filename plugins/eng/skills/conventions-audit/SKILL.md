---
name: conventions-audit
description: >-
  Manually invoked. Audits an app or monorepo against the house naming and code-structure standards — identifier, file, test-file, field and error naming; thin route entries and app/ holding only Next's files; components by product area; kind-first lib/ and barrels; server boundaries; typed routes; promotion on the second consumer; duplicated helpers, oversized files, hardcoded values and cross-app config drift. Verifies each finding and writes a prioritised report.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Conventions audit

A **manually-invoked, red-team conventions audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/conventions-audit.md`.

> **Self-contained** — this checklist is comprehensive on its own and needs no other skill installed. Where the house skills **`naming`** and **`code-structure`** are installed, they are the fix target for what this finds.

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

Write to `_reports/conventions-audit.md` in the format in [references/report-format.md](references/report-format.md): the header line, the score change, the findings table with one section per finding, the scorecard, phase-tiered action items and "Resolved since last audit".

### Output

Every run produces two things:

- **Full report** → `_reports/conventions-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

The criteria below are the audit's full working rules. Check the shared packages and each app's `src/`.

### Naming

- **Functions lead with their verb** — `get` (local), `fetch` (network; never `getUser` for a request), `create`/`update`/`delete`/`save`, `build`/`make`, `parse`, `format` or `<x>To<y>`, `require` (a guard), `handle` (internal handler), `on` (callback prop). Booleans are `is`/`has`/`are`/`can`/`should`/`will`; hooks `use` + what they give.
- **Descriptive and owned** — no bare `data`, `item`, `temp`, `val`, `next`, `target`, `source` or `handle`, no cryptic abbreviations (`btn`, `qty`; `i` in a tight loop is fine); an unused value starts with `_`; a symbol one feature uses carries its name; one canonical name per symbol, never renamed on import; a wrapper never shadows a dependency's name with a near-copy.
- **Suffixes** — a Zod schema value ends in `Schema`, its inferred type takes the clean noun (no `Type`); `Props` only on component props; constants `UPPER_SNAKE_CASE`; a composed page is `…PageContent`; generics are a lone `T` or `TItem`-style names.
- **Data and the wire** — API paths plural `kebab-case`; JSON and stored fields `camelCase`; a timestamp ends in `At`, a date in `Date`, an id in `Id`, a count in `Count`, a number with a unit names it; a list is plural; stored enum values lowercase `snake_case`; collections plural, from one constants file; error classes `<Situation>Error` with `UPPER_SNAKE_CASE` codes; analytics events `object_action`, past tense, `snake_case` properties, from one catalogue.
- **Elsewhere** — route segments `kebab-case` with `[camelCase]` params; env vars `UPPER_SNAKE_CASE`; cache tags from one `CACHE_TAGS` constant in `entity:id` form; CSS classes `kebab-case` and unprefixed; tokens as ramps and roles; assets prefixed (`icon-<name>-<size>`, `illust-…`), a `logo-` suffix naming the artwork's colour.
- **The project's spelling** — identifiers, routes and product nouns follow the spelling the project records.

### File naming

- **Component files in an app** are `PascalCase` matching the export; in a shared UI package built on a registry-installed library, `kebab-case`, matching the registry. Folders are `kebab-case`, except an app component's own folder.
- **Everything else** is `kebab-case` with its kind as a singular suffix — `<domain>.<kind>.ts` (`auth.constant.ts`, `user.schema.ts`, `user.service.ts`) — except `config/` and `seo/` (bare names), a single-function util, framework-mandated names (`page.tsx`, `proxy.ts`) and the `index.tsx` composer. Hooks are `use-<subject>.ts`. The domain is a filename prefix at first; a domain that outgrows one file becomes a folder inside its kind, whose files carry only the concern (`services/event/crud.service.ts`).
- **Test files** — `<name>.test.ts(x)` beside the unit; `<domain>.fixture.ts`, `<service>.fake.ts`, `<service>.mock.ts`; manual mocks in `__mocks__/` mirroring the import path.

### Structure

- **`app/` holds only the files Next reads by name** — no components, data, helpers or private folders. A `page.tsx` imports a `…PageContent` and renders it; a `layout.tsx` renders a shell; neither holds more than a guard. Every parallel slot has a `default.tsx`; one segment holds a `page.tsx` or a `route.ts`, never both; `global-error` sits only in `app/`; nothing in `public/` duplicates a generated `robots`, `sitemap` or `favicon`. All source sits under `src/` with `@/*`, and `proxy.ts` and `instrumentation.ts` beside `app/`.
- **Route groups** — a prefixed group keeps a real inner segment (`(auth)/auth/`); a route never repeats its app's name.
- **`components/` by product area**, pages nested as their URLs are, sections one named export per file composed by `index.tsx`; only `.tsx` (plus colocated stories, tests, CSS modules where the project uses them, and an approved stub). Error, not-found and unauthorised views group in `components/errors/`, client gates in `components/guards/`; there's no root `_shared/index.ts`. Cross-feature widgets in `_shared/` groups, each with an explicit barrel; a **server-coupled component stays out of its barrel**.
- **`lib/` is kind-first** — one folder per kind, no domain folders or loose files at the root, no mini `hooks/` or `types/` inside a feature, no empty kinds, no `types/` re-declaring a schema's or constant's type. A kind may group its files by domain or concern once it grows (`hooks/auth/ data/ ui/`). Every barrel lists each file by name, never `export *` from a directory. Fixtures and fakes sit in `src/testing/`.
- **The `config/` barrel is server-only**; client code imports `@/lib/config/routes` by path.
- **Server code behind one boundary** for the app's shape, with a `server-only` barrel exporting only what app code may call — an app with its own backend: `actions` and `services`; a frontend over an API: `actions` and `data`, plus the identity helpers a guard calls, never the fetchers; the API app: `src/server/` with `services` and `guards` only. No mixed server and client barrel; browser-only entry points are `client-only`; the action-result type sits in its own file.
- **Imports point one way** — `app/` → `components/` → `ui/` → `lib/` — enforced by a lint rule.
- **UI tiers** — `foundations`, `assets`, `icons`, `base`, `components`, `blocks`, `layouts` (and `pages` in a shared package); no `patterns` or `composite` tier.
- **Hooks** — one used by a single section may sit beside it; a shared one lives in the `hooks` kind.

### Routes

- **`typedRoutes: true`**; each app's `routes.ts` ends `} as const satisfies RouteTable`, a type declared in that file. A path with a parameter is a function typed by its template. **`as Route` on a literal** is a finding; it's kept only for a path known at runtime, with a comment. A nav item's `href` is typed `Route`.
- **`routes.ts` and `endpoints.ts` are grouped**, not one flat map, and endpoints build from one API version constant.

### Placement across a monorepo

- **Consumer count decides** — code two or more apps use is in a package; code one app uses stays in that app. **Early hoisting** (a package with one consumer) is a finding, as is a copy kept in an app after a package exists.
- **Cross-app config drift** — per-app lint and tsconfig presets differing with no recorded reason. (Security headers are `security-audit`'s, env guards `env-audit`'s.)

### Duplication and size

- **Helpers and hooks re-implemented** across apps, packages or features, or re-implementing one a dependency or house package already ships (an unused or duplicate dependency is `dependency-audit`'s).
- **The same UI or logic in two places**, which should be one component or hook.
- **Oversized files** — well past ~200 lines or mixing concerns; one file per section or modal, stateful logic in a hook.

### Hardcoded values

- **URLs and paths** hardcoded where a route, endpoint or site constant exists. Ignore the files that define them, `.env.example`, comments, the bare `/`, and Storybook demo data.
- **Magic values** that should be named constants.
- **Per-tier facts in code** — a base URL, cookie domain, CORS origin or project id hardcoded at a call site instead of the per-tier constant. (What belongs in `.env` is `env-audit`'s.)

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
