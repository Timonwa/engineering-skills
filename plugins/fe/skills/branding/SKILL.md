---
name: branding
description: >-
  An app's brand identity and its own product copy — brand foundations, voice and tone, and the UX/UI copy for buttons, empty states, errors, success, loading, labels and microcopy, plus logo usage across touchpoints. Use when building user-facing UI, writing product copy, creating brand assets, or reviewing for brand consistency. Not marketing, ad or landing-page copy.
---

# Branding

A brand is how the product **looks and sounds** — applied consistently everywhere. This skill owns brand _identity_ (as a concept), _voice & tone_, and the _product/UI copy_ that expresses it. It does not re-document palettes.

> **This owns the verbal brand + identity; specialists own the visual mechanics.** Design tokens/theming → `tailwind`; visual cohesion/governance → `design-system`; design quality/distinctiveness → `frontend-design`; producing the logo/icon/favicon set → `logos-and-icons`; other brand SVGs → `svg-generation`. **Persuasive marketing copy** (ads, landing pages, email) is a different job and out of scope — this covers the app's _own_ product copy. (A dedicated marketing suite is planned; until it ships, treat conversion copy as a separate task.)
>
> **Project facts → `AGENTS.md`:** the actual palette/fonts, the logo asset location, and the project's specific voice traits/vocabulary. This skill is the discipline; those are the brand's materials.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Brand foundations

A brand has two halves — define both per project, record the specifics in `AGENTS.md`:

- **Visual** — palette, typography, logo, imagery style, motion personality. This becomes the design system (tokens → `tailwind`; applied cohesively → `design-system`; made distinctive → `frontend-design`). Don't restate values here; reference the tokens.
- **Verbal** — voice, tone, and vocabulary (below). This is branding's core.

## Voice & tone

**Voice** is the constant personality; **tone** flexes with the moment (reassuring in an error, celebratory on success, calm in an empty state). House baseline (each project can sharpen its own traits in `AGENTS.md`):

- **Clear over clever** — plain language, no jargon; clarity beats wit.
- **Helpful** — guide the user to success, don't just state facts.
- **Confident, not arrogant** — lead with what the user gains, not superlatives ("get set up in minutes", not "the best tool out there").
- **Active voice** — "Save your changes", not "Changes can be saved".
- **Concise** — short sentences, scannable; cut filler.

## Writing the app's copy

The core. Write copy for every surface, not just the happy path:

- **Buttons / CTAs** — specific action verbs ("Save changes", "Create project"), never vague "Submit"/"OK". Match the button label to what happens.
- **Labels & placeholders** — the label says _what the field is_; the placeholder is an _example or hint_, never a replacement for the label.
- **Empty states** — say what belongs here and the next action ("Nothing here yet — add your first item"), not a dead "No data".
- **Errors** — what happened + how to fix it, in plain words; **blame the system, not the user** ("Something went wrong, try again", not "You entered it wrong"). Never show a raw code alone.
- **Success / confirmation** — confirm what happened ("Changes saved").
- **Loading** — be specific when you can ("Loading results…"), not a bare "Loading…".
- **Destructive confirmations** — name the consequence and its finality ("Delete 3 items? This can't be undone").
- **Microcopy** (tooltips, helper text, onboarding, toasts) — remove doubt at the point of action; concise and actionable.

**Capitalization** — default to **sentence case** across UI copy: buttons, labels, table headers, menu/nav items, tabs, headings, toasts ("Create project", "Last updated" — not "Create Project"/"Last Updated"). It reads friendlier and is far easier to keep consistent. Reserve Title Case for proper nouns and the product/brand name; use ALL CAPS only for tiny eyebrow labels, sparingly. Pick one policy and apply it **everywhere** — mixed casing across buttons/tables is the most visible copy inconsistency (the chosen policy → `AGENTS.md`).

**Principles across all copy:** one word per concept (don't mix "delete"/"remove" for the same action); write for scanning; no dark patterns or manipulative wording.

## Logo usage

Import the logo from the shared assets (location → `AGENTS.md`; producing or regenerating them → `logos-and-icons`); maintain clear space around it; never distort, recolor, stretch, or crop it; use the correct light/dark variant for the background.

A complete logo kit ships: the primary mark, a monochrome variant, light/dark variants, and a square icon for favicons/app icons/social avatars. Practical specs: clear space ≥ the height of the logo's smallest element on all sides; a minimum render size below which the icon variant replaces the full logo; and a square PNG/SVG ≥112×112 for the Organization `logo` that structured data references (→ `seo`).

## Copy that survives translation (i18n-ready)

Even a single-locale app should write copy that won't break if i18n arrives: externalize user-facing strings behind keys where the project has i18n (→ `AGENTS.md`); never concatenate sentence fragments or inject words into templates ("{count} items" as one string, not "items" appended); use proper pluralization forms, not "(s)"; format dates/numbers/currency with locale-aware APIs (`Intl.*`), never hand-assembled strings.

## Consistency across touchpoints

The same brand — visual _and_ verbal — shows up everywhere: UI, diagrams/SVGs (→ `svg-generation`), docs, email, and social. One vocabulary and one voice across all of them; a term or tone that drifts on one surface breaks the brand.

## Do / Don't

- **Do** define the voice traits and record brand specifics in `AGENTS.md`; write copy that guides the user; keep one term per concept; blame the system in errors; use specific CTAs and loading text; use the correct logo variant; pull colors/type from tokens.
- **Don't** choose cleverness over clarity; ship "No data" empty states; blame the user; write vague "Submit"/"Loading"; mix terms for one action; distort or recolor the logo; hardcode brand colors/fonts (→ `tailwind`); reuse marketing/sales copy as product copy.

> **Boundaries:** naming anything — components, tokens, assets, files → `naming`.
