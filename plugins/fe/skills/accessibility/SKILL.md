---
name: accessibility
description: >-
  Building UI that meets WCAG 2.2 AA beyond the markup — text alternatives, contrast checked on the tokens in both themes, reflow and zoom, keyboard and focus (order, visibility, dialogs, skip link, not obscured), target size, pointer and motion, labels, errors people see, accessible sign-in, ARIA states and live regions, and the gates that verify it: lint, Storybook axe at error, keyboard stories and screen-reader passes. Use when building or reviewing any interactive UI, a form, a dialog or a colour token.
---

# Accessibility

UI everyone can use — with a screen reader, a keyboard alone, magnification, voice control, or low-vision, motor or cognitive needs — and **verified**, not asserted. The target is **WCAG 2.2 level AA**. It starts from the right element (`semantic-html`); this skill adds what markup alone can't promise: how things look, move, take focus and announce.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Native first, ARIA last

- **Use the element that already behaves** — a `<button>`, a link, a `<dialog>`, `<details>` (`semantic-html`). ARIA changes only what assistive technology is told, never behaviour: a `role` you add commits you to that role's whole keyboard contract.
- **For a composite widget no element covers** — tabs, a combobox, a menu, a tree, a listbox — follow the WAI-ARIA Authoring Practices pattern for it exactly (keys, roles, states), or use a library that does. Bad ARIA is worse than none.

## Perceivable

- **Text alternatives (1.1.1).** An informative image's `alt` says what it conveys, not what it is; a decorative one is `alt=""`; an icon-only control gets its name from `aria-label` or visually hidden text; a chart or diagram gets its data in text nearby.
- **Contrast (1.4.3, 1.4.11):** text at least **4.5:1**, large text (24px, or 18.66px bold) **3:1**, and UI parts that convey state — borders of inputs, focus rings, icons that carry meaning — **3:1**. Text in a logo or brand name, purely decorative text and disabled controls are exempt. Checked by a script over the **colour tokens, in light and dark mode**, so a palette change fails before it ships (`design-system`, `tailwind`); a measured pair, never an eyeballed one.
- **Never colour alone (1.4.1)** — an error, a status, a selected item also carries text, an icon or a pattern. **Instructions never rely on shape, colour, size or position alone (1.3.3)** — "the button on the right" also names it.
- **Reflow and zoom (1.4.4, 1.4.10, 1.4.12):** at 200% zoom and at a 320px-wide viewport nothing is clipped or overlapped and nothing needs horizontal scrolling, except data tables and maps; text survives larger letter, word and line spacing. The viewport meta never blocks zoom: no `user-scalable=no` and no `maximum-scale` below 2.
- **Content on hover or focus (1.4.13)** — a tooltip or popover can be dismissed with Escape, stays while the pointer moves onto it, and doesn't vanish on its own.
- **Media:** captions on recorded and live video (1.2.2, 1.2.4), audio description of what's only shown (1.2.5), a transcript for audio, nothing playing sound on its own.
- **Orientation (1.3.4):** never lock a page to portrait or landscape. **No images of text (1.4.5)** where real text would do.
- **Links and headings say where they go and what follows (2.4.4, 2.4.6)** — no bare "Read more"; a link in prose is told apart without colour — underlined (the house default), or 3:1 against the surrounding text plus a cue on hover and focus (WCAG technique G183) — and the same function keeps the same name everywhere (3.2.4).

## Operable

- **Everything works from the keyboard (2.1.1), and nothing traps it (2.1.2).** Enter and Space on buttons, Escape to dismiss, arrow keys inside composites (one tab stop per widget, a roving `tabindex`). `tabindex="0"` joins the natural order, `-1` takes focus only from code, a positive value never.
- **Focus is always visible (2.4.7)** — a `:focus-visible` ring with 3:1 contrast against what's behind it (1.4.11), in both themes; removing the outline only with a replacement — Tailwind's `outline-hidden`, never `outline-none`, so forced-colours mode still draws one.
- **Focus order follows the reading order (2.4.3)**, so the DOM order is the visual order; CSS `order` and absolute positioning never reorder meaning.
- **Focus isn't entirely hidden (2.4.11)** under a sticky header, footer or cookie banner (fully unobscured is 2.4.12, AAA): `scroll-padding` on the scrolling container matches their height.
- **Dialogs and drawers:** focus moves in when they open, stays inside while modal (the page behind is `inert`), Escape closes, and focus returns to the control that opened them. Native `<dialog>` with `showModal()` does most of this; the Popover API is always non-modal, so it suits menus and tooltips, never a modal drawer. Every dialog is named by its heading (`aria-labelledby`).
- **After an in-app navigation**, focus and the announcement land on the new page's heading or main region, so a screen-reader user knows the page changed (Next.js's route announcer reads the page title; it doesn't move focus, so the project decides where focus goes and keeps it consistent).
- **A skip link (2.4.1)** is the first focusable element on pages with repeated navigation, visible when focused, leading to `<main>`. Landmarks and headings also meet 2.4.1; the skip link is the house's way.
- **More than one way to reach a page (2.4.5)** — navigation plus search, a sitemap page or links between related pages — except a step in a process.
- **In-page navigation** marks the current section with `aria-current="location"`; site navigation marks the current page with `aria-current="page"`.
- **Targets are at least 24×24 CSS px (2.5.8)**, or spaced so a 24px circle around each touches no other; aim for 44×44 on touch.
- **Pointer:** anything done with a drag has a single-pointer alternative (2.5.7); a path or multi-finger gesture has a simple one (2.5.1); actions fire on release, not press (2.5.2).
- **A control's visible label is in its accessible name (2.5.3)**, so voice users can say what they see.
- **Single-key shortcuts (2.1.4)** can be turned off or remapped, or only work when their component has focus.
- **Anything triggered by shaking or tilting the device (2.5.4)** also has an on-screen control, and the motion response can be turned off.
- **Motion and time:** nothing flashes more than three times a second (2.3.1); anything that moves, scrolls or updates on its own for over five seconds can be paused (2.2.2); animation respects `prefers-reduced-motion`; a time limit — a session about to end — warns and lets the person extend it (2.2.1).

## Understandable

- **The page's language is set (3.1.1)** on `<html lang>`, and passages in another language carry their own `lang` (3.1.2). Brand names and codes that mustn't be machine-translated take `translate="no"`.
- **Every page has a title that says what it is (2.4.2)**, unique per page (`seo-aeo-geo`).
- **Labels and instructions (3.3.2)** are visible and stay visible — a placeholder is a hint, never the label; required fields say so in text.
- **Errors (3.3.1, 3.3.3)** are named in text, say how to fix them, sit beside their field (`aria-describedby`, `aria-invalid`), and are **seen**: a summary near the submit button, or the page scrolls to and focuses the first invalid field.
- **Legal, financial and data-changing submissions (3.3.4)** can be reviewed, corrected or undone; leaving a form with unsaved changes asks first.
- **No surprises (3.2.1, 3.2.2):** focusing or changing a field never submits, navigates or opens something on its own.
- **Consistent navigation and help (3.2.3, 3.2.6)** — the same place on every page.
- **Don't ask twice (3.3.7)** — information already given in the flow is filled in or selectable.
- **Accessible sign-in (3.3.8):** no puzzle, transcription or memory test to get in; paste and password managers work, and passkeys or an emailed link are offered (`auth`).

## Robust

- **Every control exposes its name, role and state (4.1.2)** — native elements do; a custom one sets them: `aria-expanded` and `aria-controls` on a disclosure, `aria-pressed` on a toggle, `aria-selected` in tabs and listboxes, `aria-checked` on a custom checkbox.
- **Status messages are announced without moving focus (4.1.3)** — a live region (`role="status"`, or `role="alert"` for errors) that exists **before** its content changes, or the change isn't read. A computed result goes in `<output>`.
- **Loading:** a skeleton is `aria-hidden`, the region it fills carries `aria-busy` while it loads, and the result — loaded, or failed — is announced through the status region.
- **Decorative or duplicated content** is hidden from assistive technology with `aria-hidden="true"`, never on anything focusable.

## Verifying it

Automated checks find only part of the problems; every layer runs.

- **Lint:** `eslint-plugin-jsx-a11y` catches missing names, invalid ARIA and click handlers on non-interactive elements as code is written. `eslint-config-next` turns on only a handful of its rules, as warnings, so the shared config adds `jsx-a11y`'s recommended set at error.
- **Components:** each story runs axe through Storybook's a11y addon with `parameters.a11y.test: "error"`, so a violation fails the test run, and interactive components carry a keyboard `play` story — Tab to it, operate it, check focus (`storybook`). Together with lint, that's the component gate.
- **Pages:** where the project runs end-to-end tests, each key route also runs `@axe-core/playwright` and asserts no violations. `@axe-core/react` doesn't support React 18 or later; don't add it.
- **By hand, before a UI ships:** the flow with the keyboard alone; with a screen reader — VoiceOver with Safari, NVDA with Firefox or Chrome, and TalkBack on Android, where most of an African audience is; at 200% zoom and 320px wide; with reduced motion and forced colours on.
- **Contrast** runs as a script over the tokens in CI, in both themes.

Browser snippets for checking a rendered page — unlabelled inputs, small targets, contrast, focus order — are in [references/audit-snippets.md](references/audit-snippets.md). A full review against WCAG is `accessibility-audit`.

## Do / Don't

- **Do** start from the native element; follow the APG pattern for composites; check contrast on the tokens in both themes; keep focus visible, ordered and unobscured; move focus into dialogs and back; give every target 24px; make errors seen; announce status changes from a region that already exists; test with a keyboard and a screen reader, Android included.
- **Don't** add a `role` without its keyboard behaviour; remove a focus ring without a replacement; use a positive `tabindex`; convey meaning by colour alone; block zoom; let a placeholder be the label; put `aria-hidden` on something focusable; trust an automated score as proof.

## Related skills

Element choice, headings, labels and landmarks `semantic-html` · colour tokens and contrast pairs `design-system`, `tailwind` · component behaviour and focus management `reusables` · keyboard and axe stories `storybook` · route announcements and titles `nextjs`, `seo-aeo-geo` · sign-in `auth` · end-to-end checks `testing` · the review `accessibility-audit`.
