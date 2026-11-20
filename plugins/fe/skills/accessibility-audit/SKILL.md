---
name: accessibility-audit
description: >-
  Manually invoked. Red-team accessibility audit of an app or a diff against WCAG 2.2 AA, organised by POUR with each check citing its success criterion — structure and landmarks, contrast on the tokens in both themes, reflow and zoom, keyboard, focus and dialogs, pointer and target size, forms and errors that are seen, status messages, and the lint, Storybook and end-to-end gates. Verifies each finding and writes a prioritized report.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Accessibility audit

A **manually-invoked, red-team accessibility audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/accessibility-audit.md`.

> **Self-contained** — every check is spelled out below, so it runs with no other skill installed. It mirrors **`accessibility`** and **`semantic-html`**, which are the fix targets when installed. Each check names its WCAG 2.2 success criterion; a check marked **house rule** goes beyond WCAG and is reported as LOW, never as a WCAG failure.

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
2. **Load the previous report** — if `_reports/accessibility-audit.md` exists, read it, but still run every check against the source. Use it only to keep the ID of each finding still present (status `UNRESOLVED`), carry its `WON'T FIX` findings forward unchanged — never re-raised as new findings — drop its `FIXED` findings and any no longer present, continue ID numbering from its highest ID, and take its scores for the score-change row. First run → mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating. Drop one the project records as a deviation, with its reason, in `AGENTS.md` or a doc it links.
5. **Write the report** to `_reports/accessibility-audit.md` — overwriting the whole file, so no resolved history accumulates — and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — someone using a keyboard, screen reader, zoom or voice control can't complete a core task (sign in, pay, submit a form, read the main content). Fix immediately.
- **HIGH** — a WCAG 2.2 A or AA failure on a key page or in a shared component many pages use. Fix before shipping.
- **MEDIUM** — an A or AA failure with a workaround, or on a page few people reach. Schedule it.
- **LOW** — a house rule beyond WCAG, an AAA criterion, or polish.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/accessibility-audit.md`, with one Overall row in the score change:

```
# Accessibility audit — <app/scope>

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
- **Why it matters:** <who is blocked and how> <· the success criterion, e.g. WCAG 2.1.2 No Keyboard Trap, or "house rule">
- **Fix:** <the specific remediation>
- **Note:** <only once `FIXED` (the commit and what changed) or `WON'T FIX` (the owner's reason)>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Perceivable | <X>/10 | <one-line justification> |
| Operable | <X>/10 | <one-line justification> |
| Understandable | <X>/10 | <one-line justification> |
| Robust | <X>/10 | <one-line justification> |
| Gates | <X>/10 | <one-line justification> |

## Action items
Tiers by phase — `development` → **Fix Now / Before Launch / Post-Launch**; `production` → **Fix Now / Next Release / Backlog**. Each task references a finding ID.

### <Tier>
| # | Priority | Task (finding ID) | Effort |
| --- | --- | --- | --- |
```

### Output

Every run produces two things:

- **Full report** → `_reports/accessibility-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

Audit the **rendered** page where possible — the accessibility tree, a keyboard-only pass, contrast, 200% zoom and 320px reflow, a screen reader (VoiceOver, NVDA, TalkBack) — and the source. Automated checks (axe, `jsx-a11y`) catch only part of WCAG; the manual passes find the rest. `accessibility` and `semantic-html` are the fix targets if installed, with runnable browser snippets.

### Perceivable

- **Text alternatives (1.1.1)** — informative images have descriptive `alt`, decorative ones `alt=""` (never missing); icon-only controls have an accessible name; no "image" or "photo" alt; a chart or diagram has its data in text nearby.
- **Media (1.2.1–1.2.5)** — a transcript for recorded audio-only and a text or audio alternative for video-only; captions on recorded and live video; audio description of what's only shown; `<video>` has `controls` and a `<track kind="captions">`. **Audio control (1.4.2)** — sound that plays on its own for more than three seconds can be paused or muted apart from the system volume; house rule: nothing plays sound on its own.
- **Structure (1.3.1)** — landmarks and one `<main>`, with everything visible inside a landmark; every `<nav>` labelled when there are several; lists as lists (a list styled without markers keeps `role="list"`); label–value pairs as `<dl>` with `<dt>` before its `<dd>` and at most one wrapping `<div>`; data tables with `<th scope>`, a sortable header holding a `<button>` with `aria-sort`; wide tables in a labelled, keyboard-reachable scroll region. House rules: one `<h1>` and no skipped levels; every `<section>` has a heading tied by `aria-labelledby`; a table caption.
- **Reading order (1.3.2)** — the DOM order is the visual order; CSS `order` or positioning never reorders anything focusable.
- **Sensory characteristics (1.3.3)** — instructions never rely on shape, colour, size or position alone.
- **Orientation (1.3.4)** never locked; **input purpose (1.3.5)** — `autocomplete` on fields about the person.
- **Colour (1.4.1)** never the only signal — a link in prose is underlined, or 3:1 against the surrounding text with a cue on hover and focus (technique G183).
- **Contrast (1.4.3, 1.4.11)** — text 4.5:1, large text 3:1, control boundaries, focus indicators and meaningful graphics 3:1, checked on the colour tokens in both themes, muted, helper and placeholder text included. Exempt: text in a logo or brand name, purely decorative or invisible text, text in a photo, and disabled controls. House rule: a script checks the tokens in CI.
- **Images of text (1.4.5)** avoided where real text would do.
- **Zoom and reflow (1.4.4, 1.4.10, 1.4.12)** — the viewport never blocks zoom (`user-scalable=no`, or `maximum-scale` below 2); 200% zoom, 320px reflow (data tables and maps exempt) and increased text spacing lose nothing.
- **Content on hover or focus (1.4.13)** is dismissible, hoverable and persistent.

### Operable

- **Keyboard (2.1.1, 2.1.2)** — everything works by keyboard, with no trap; no click handler on a bare `<div>` or `<span>`; no positive `tabindex`; composite widgets follow their APG pattern. **Single-key shortcuts (2.1.4)** can be turned off, remapped, or are active only when their component has focus.
- **Time and motion (2.2.1, 2.2.2, 2.3.1)** — time limits can be extended; content that starts on its own and moves, scrolls or updates for more than five seconds can be paused; nothing flashes more than three times a second. House rule: `prefers-reduced-motion` honoured (2.3.3 is AAA).
- **Bypass blocks (2.4.1)** — met by landmarks and headings; house rule: a skip link, first focusable and visible on focus, on pages with repeated navigation. **Page titles (2.4.2)** describe the page; house rule: unique per page.
- **Focus (2.4.3, 2.4.7, 2.4.11)** — a logical order; a visible indicator with 3:1 contrast in both themes; `outline-none` is a finding (forced-colours mode loses the ring — use `outline-hidden` with the ring); a focused element is never entirely hidden behind a sticky header, cookie banner or panel, with `scroll-padding` matching a sticky header's height.
- **Dialogs** — native `<dialog>` with `showModal()` (or an equivalent that moves focus in, keeps it there with the page `inert`, closes on Escape and returns focus to the trigger), named by its heading. A Popover API element used as a modal is a finding. Disclosure is `<details>`/`<summary>`, not a toggled `<div>`.
- **Navigation focus** — after an in-app navigation, focus and the announcement reach the new page as the project decided, consistently.
- **Link purpose, multiple ways and headings (2.4.4, 2.4.5, 2.4.6)** — no bare "Read more"; more than one way to reach a page; headings and labels describe. A control that navigates is a link and one that acts is a button; a row of filter pills that changes the URL is a `<nav>` of links.
- **Pointer (2.5.1, 2.5.4, 2.5.7, 2.5.8)** — no path or multi-point gesture without a single-pointer alternative; anything triggered by device motion has a control and can be turned off; dragging has an alternative; targets at least 24×24 CSS px, or spaced so a 24px circle around each touches no other (inline links, an equivalent control elsewhere and essential sizes exempt).
- **Pointer cancellation (2.5.2)** — nothing completes on the down-event: an `onPointerDown`, `onMouseDown` or `onTouchStart` that submits, deletes, navigates or toggles is a finding (failure F101) unless moving off before release aborts it, release undoes it, or it's essential — a key on an on-screen keyboard or keypad counts as essential. A drag that starts on press is fine when dropping outside a target cancels it.
- **Label in name (2.5.3)** — a control's accessible name contains its visible label's words, in order, best at the start: an `aria-label` that replaces the visible text ("Submit" shown, "Send form" named) is failure F96, and visible text with no name at all is F111. The label is the button's text, the text beside an input or next to a checkbox, or the text under an icon button; a symbolic glyph (a bold "B") is named for its job, and case and most punctuation don't count.

### Understandable

- **Language (3.1.1, 3.1.2)** — `<html lang>`, a `lang` on phrases in another language; house rule: `translate="no"` on brand names and codes.
- **Predictable (3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.6)** — no context change on focus or input; navigation and help in the same place on every page; the same function keeps the same name.
- **Forms (3.3.1, 3.3.2, 3.3.3)** — every input has a programmatic label (a placeholder is not one); groups use `<fieldset>` and `<legend>`; required fields marked in text; the right `type` and `inputmode` (`tel` for phone, `text` with `inputmode="numeric"` for a code or card number); constraint attributes kept, with `noValidate` on the form; every `<button>` has a `type`; a form that changes data is a `<form>` with an action. Errors are in text, say how to fix them, are tied to the field with `aria-describedby` and `aria-invalid`, are announced, and are **seen** — a summary near the submit button, or focus moved to the first invalid field.
- **Error prevention (3.3.4)** — legal, financial and data-changing submissions can be reviewed, corrected or undone; house rule: leaving a form with unsaved changes asks first. **Redundant entry (3.3.7)** avoided; **accessible sign-in (3.3.8)** — no memory or transcription test, paste and password managers work; house rule: passkeys or an emailed link offered.

### Robust

- **Name, role, value (4.1.2)** — native elements first; custom widgets expose all three: `aria-expanded` and `aria-controls` on a disclosure, `aria-pressed` on a toggle, `aria-selected` in tabs and listboxes, `aria-checked` on a custom checkbox, `aria-current` (`page` for site navigation, `location` for in-page); no redundant or invalid ARIA; every `<iframe>` has a `title`; `aria-hidden` never on anything focusable.
- **Status messages (4.1.3)** — announced from a live region that exists before its content changes; a computed result in `<output>`; skeletons `aria-hidden`, loading regions with `aria-busy`, and the result announced.
- **Markup** — house rules from `semantic-html`: a `<span>` never contains a `<span>`; `<search>` around site search; `<time dateTime>` for dates.
- **Shared components** — audit each interactive primitive once (button, dialog, menu, tabs, combobox, accordion, tooltip, table, toast) for its keyboard contract, roles, states, focus and name; a fix there covers every consumer.

### The gates

- **Lint:** `eslint-plugin-jsx-a11y`'s recommended set at error in the shared config — `eslint-config-next` turns on only a few of its rules, as warnings, so relying on it alone is a finding.
- **Tokens:** the contrast script over the colour tokens runs in CI, in both themes.
- **Components:** Storybook's a11y addon with `test: "error"` and a keyboard story per interactive component; any story that turns a rule off or marks it `"todo"` is a finding.
- **Pages:** where the project runs end-to-end tests, `@axe-core/playwright` on each key route. `@axe-core/react` doesn't support React 18 or later — its presence is a finding.
- **Hands-on:** keyboard-only, 200% zoom, 320px reflow, forced colours and reduced motion, and a screen reader (VoiceOver, NVDA, TalkBack) on the key flows.

## Fixing what it found

Fixing is a separate request, after the report is written, and covers only the findings the owner chose. Then **update the report in place — never re-run the audit to update it**: a re-run re-checks the whole codebase, costs a full audit and raises new findings mid-fix. Mark each fixed finding `FIXED` with its commit and a one-line note of what changed, mark a finding the owner rules out `WON'T FIX` with their reason, and leave everything else as it stands. Recompute the scorecard categories the fixes touched and the Overall, and rewrite the one score-change row (previous → current) — never add a second row.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
