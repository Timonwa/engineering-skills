---
name: storybook-audit
description: >-
  Manually invoked. Storybook coverage and story-quality audit — cross-references shared UI components against existing stories to find gaps, and checks stories against Storybook 10 practice — CSF3 with satisfies Meta and framework-package types, tier-first titles, a control per prop, keyboard plays that assert behaviour, axe failing the run, no dark-mode or coverage-only stories. Verifies each finding and writes a prioritized report.
argument-hint: "[phase] [path]"
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Storybook audit

**Run this only when the user asks for it by name. It writes a report and changes no code; fixing a finding is a separate request.**

A **manually-invoked, red-team Storybook audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/storybook-audit.md`.

> **Self-contained** — every check is spelled out below, so it runs with no other skill installed. It mirrors **`storybook`**, and **`design-system`** for the tiers; both are the fix targets when installed.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[phase]` — `development` | `production`; sets the action-item tiers. Omitted → the phase the project's `AGENTS.md` records, else `production` (assume the app is live until told otherwise — the safer default).
- `[path]` — a file, directory, or PR/diff to scope the audit to; omitted → the whole repo.

## Audit protocol

**Mindset — reviewer/attacker first.** Don't assume code is fine because it looks careful; find the sequence that breaks it. Report only findings you can justify as real, each verified before it lands.

### Method

1. **Resolve phase** — the phase argument if given; else the audit phase `AGENTS.md` records; else `production`, so a CRITICAL finding gets Fix-Now urgency instead of a pre-launch discount. Phase sets the action-item tiers.
2. **Load the previous report** — if `_reports/storybook-audit.md` exists, read it, but still run every check against the source. Use it only to keep the ID of each finding still present (status `UNRESOLVED`), carry its `WON'T FIX` findings forward unchanged — never re-raised as new findings — drop its `FIXED` findings and any no longer present, continue ID numbering from its highest ID, and take its scores for the score-change row. First run → mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating. Drop one the project records as a deviation, with its reason, in `AGENTS.md` or a doc it links.
5. **Write the report** to `_reports/storybook-audit.md` — overwriting the whole file, so no resolved history accumulates — and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — the stories no longer test anything: they don't run in CI, axe is off, or Storybook doesn't build.
- **HIGH** — a component the shared package ships has no story, or an interactive one has no keyboard story; a story that turns an axe rule off or marks it `"todo"`. Fix before shipping.
- **MEDIUM** — a story that misleads or can't be used: a frozen controlled component, a missing control, a wrong tier, assertions on markup. Schedule it.
- **LOW** — naming, order and tidiness.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/storybook-audit.md`, with one Overall row in the score change:

```
# <Domain> audit — <app/scope>

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
- **Why it matters:** <impact / who it affects> <· the `storybook` rule it breaks>
- **Fix:** <the specific remediation>
- **Note:** <only once `FIXED` (the commit and what changed) or `WON'T FIX` (the owner's reason)>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Coverage | <X>/10 | <one-line justification> |
| Story quality | <X>/10 | <one-line justification> |
| Titles and tiers | <X>/10 | <one-line justification> |
| Which stories | <X>/10 | <one-line justification> |
| Interactions and accessibility | <X>/10 | <one-line justification> |
| Setup | <X>/10 | <one-line justification> |

## Action items
Tiers by phase — `development` → **Fix Now / Before Launch / Post-Launch**; `production` → **Fix Now / Next Release / Backlog**. Each task references a finding ID.

### <Tier>
| # | Priority | Task (finding ID) | Effort |
| --- | --- | --- | --- |
```

### Output

Every run produces two things:

- **Full report** → `_reports/storybook-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

Everything needed to run the audit is inlined here; `storybook` is the fix target if installed, and the tiers are `design-system`'s.

### Coverage

- **Detect the layout first** — the component source of truth (a shared UI package's tier folders and barrels, or an app's own `src/ui/` and `components/`) and where stories live. Stories belong **beside their component**, the file named like the component's file; a separate `stories/` tree is one layout finding, never re-flagged per story.
- **Enumerate components** from the tier barrels (resolving each `export *`) or the component folders; skip type-only, defaults-only and internal helpers.
- **Enumerate stories** — every `*.stories.tsx`, mapped to the component it imports (ignore `_Template.stories.tsx`).
- **Components with no story**, grouped by tier — each is a coverage finding.
- **Shipped without its story** — a new or changed component in the diff whose stories weren't added or updated in the same change (a new, changed or removed prop, variant or state).
- **Orphan stories** — a story whose component no longer exists or moved tier.

### Story quality

- **CSF3 with TypeScript** — `satisfies Meta<typeof X>` (not `: Meta`), `type Story = StoryObj<typeof meta>`, every story typed `: Story`; no `Template.bind({})`, no untyped stories. A file with no single component may annotate `Meta` plainly.
- **Types from the framework package** (`@storybook/nextjs-vite`, or `@storybook/react-vite` outside Next.js) — an import from `@storybook/react` fails `eslint-plugin-storybook`'s `no-renderer-packages`; any `@storybook/test` import is removed in Storybook 9 and later.
- **Callbacks are `fn()` spies** from `storybook/test`; flag `{ action: "…" }` argTypes.
- **Every public prop has a working control** — inferred, or an `argTypes` entry for a union or a ranged number, with a `description` where the name doesn't say enough; callbacks (spies), `children` and `ref` need none. Flag other props with no control, and controls for props that no longer exist.
- **Shared args on the meta**, not repeated in every story; data from shared fixtures, never a fetch; wrapper JSX built from design-system components and tokens.
- **A JSDoc `/** … */` comment on each story**, which the docs page uses; a `//` comment isn't picked up.
- **Controlled components** (`open`/`onOpenChange`, `value`/`onChange`) keep the arg in step with `useArgs` or a stateful `render` wrapper — a bare spy freezes them.

### Titles and tiers

- **Tier first**, from the tiers the project's design system defines (typically `Foundations`, `Assets`, `Icons`, `Base`, `Components`, `Blocks`, `Layouts`, `Pages`). A title in a tier the system doesn't have — such as `Patterns` — or a component titled in the wrong tier is a finding.
- **Subcategories are by behaviour** (`Disclosure`, `Display`, `Feedback`, `Forms`, `Navigation`, `Overlay`), allowed in any tier that has grown; a new one is fine when the project records it. Flag product-domain subcategories in a shared package and shape buckets ("Cards").

### Which stories

- **In this order, as they apply, named in whole words (`Small`, not `SmallSize`):** `Default`; one story per variant or size that differs in more than colour (otherwise one overview); each reachable state (disabled, loading, empty, error); `With…` parts; real configurations (real-length text, a full list, the usual container).
- **Not stories:** dark mode (the toolbar covers it), right-to-left, combinations nothing uses, or a story that exists only to raise a count. Flag them.

### Interactions and accessibility

- **A keyboard story for every interactive component** — reached with Tab, operated with its pattern's keys, asserting where focus goes.
- **`play` asserts behaviour, never markup** — `canvas` and `userEvent` from its context, `screen` for portals; queries by role, label or text; flag assertions on tag names, classes, landmarks or hard-coded structure.
- **One behaviour per interaction story**, named for it; test-only stories carry `tags: ["!dev", "!autodocs"]`.
- **Axe fails the run** — `a11y: { test: "error" }` in the preview; flag any story that turns a rule off or sets `test: "todo"` or `"off"` (a third-party component is fixed or wrapped so the wrapper passes).

### Setup

- **Storybook 10 packages at one version**, the framework package matching the consumers, only the a11y, vitest and docs addons on top of the built-in essentials — plus `@chromatic-com/storybook` where the project takes visual tests (flag `@storybook/addon-essentials`). The UI package declares its framework package and `storybook` as devDependencies and keeps stories out of its build.
- **The preview** imports the global CSS, pins the tier order (no `method: "alphabetical"`), sets a dark-mode toolbar global with `backgrounds: { disable: true }` and `nextjs.appDirectory: true`, supplies providers and a router as decorators, and mocks I/O modules with `sb.mock` (paths relative to the preview, with the extension, no alias); a story never wraps itself in providers or mocks the project's own logic.
- **Stories run as tests in CI** through the Vitest addon; `eslint-plugin-storybook`'s recommended rules are on at error; Tailwind compiles once — the Vite plugin or PostCSS, never both.
- **`tags: ["autodocs"]`** set once in the preview, globally.

## Fixing what it found

Fixing is a separate request, after the report is written, and covers only the findings the owner chose. Then **update the report in place — never re-run the audit to update it**: a re-run re-checks the whole codebase, costs a full audit and raises new findings mid-fix. Mark each fixed finding `FIXED` with its commit and a one-line note of what changed, mark a finding the owner rules out `WON'T FIX` with their reason, and leave everything else as it stands. Recompute the scorecard categories the fixes touched and the Overall, and rewrite the one score-change row (previous → current) — never add a second row.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
