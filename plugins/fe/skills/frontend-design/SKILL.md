---
name: frontend-design
description: >-
  The craft of a web UI built from the project's design system — plan, critique and build from existing tokens; hierarchy; type measure, leading and scale; colour, contrast and dark surfaces; charts; spacing and layout; depth; imagery; every state with skeletons that mirror the layout; motion and reduced motion; the template defaults to choose deliberately; and checking in a browser. Use when building or improving a page, section or component, or making a UI look designed rather than assembled.
---

# Frontend design

The design system supplies the materials — tokens, components, the type and spacing scales (`design-system`, `tailwind`). This skill is the judgement that turns them into a UI that looks intentional: a clear hierarchy, a considered rhythm, every state designed, and one or two choices that make it unmistakably this product rather than a template.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## How to work

1. **Plan.** Read the brief and what the page must make someone do; decide what's primary, secondary and tertiary before choosing a colour or a border.
2. **Choose from the system.** Every size, colour, radius, shadow and duration is an existing token; a value the system lacks is a question for `design-system` — a token if it will recur, or a commented one-off if it genuinely won't.
3. **Build rough, then refine** — layout, then spacing and hierarchy, then colour and detail, then states. Judge it in greyscale first: if the structure doesn't read without colour, colour won't save it.
4. **Critique against the brief and the system**: does the primary action win, does it look like the rest of the product, is anything there that carries no information?
5. **Check it in a browser** when a tool is available — at a phone width and a wide one, in light and dark, with a long name and an empty list — rather than trusting the code.

## Hierarchy

- **Not everything can stand out.** Emphasise one thing per view and deliberately quieten the rest — labels, metadata, helper text.
- **Weight and colour before size:** a heavier weight or the muted foreground separates levels without inflating the type.
- **Quieten by lowering contrast**, never by shrinking text past readability or boxing it in borders — and never below 4.5:1 for muted, helper or placeholder text; only disabled controls are exempt.
- **Convention for the furniture** — where navigation, search and actions sit; spend novelty on the one thing that should feel distinctive.

## Type

- **The project's type scale only**; hierarchy comes from steps on it.
- **Measure:** 45–75 characters for body copy, never past 80 (WCAG 1.4.8, level AAA) — a `ch`-based max width, not the full container.
- **Leading falls as size rises:** about 1.5 for body text (WCAG's figure for readable blocks), tighter for large headings; longer lines need more.
- **Balance display headings** (`text-wrap: balance`) and only those; it's for a few lines, not paragraphs.
- **Numbers that compare** — tables, prices, counters — use tabular figures (`tabular-nums`).
- **Emphasis by weight**, not italics or underline in UI (a link in prose keeps its underline); avoid light weights at small sizes; one or two families at most; centre no more than a couple of lines.

## Colour

- **Ramps, not picks:** each hue is a full ramp in the tokens (OKLCH keeps steps even), with greys tinted towards the brand; call sites use semantic tokens (`foreground`, `muted`, `border`, `accent`), never shades (`tailwind`).
- **Restraint:** one dominant brand colour, the neutrals, and status colours used only for their meaning. Accent colours are never statuses (`design-system`).
- **Contrast** at least 4.5:1 for body text and 3:1 for large text, for the boundaries of controls, for focus indicators and for meaningful graphics (WCAG 1.4.3, 1.4.11). Meaning never rests on hue alone (`accessibility`).
- **Dark surfaces step lighter as they rise** — a card sits on a lighter surface than the page, a dialog lighter again — because shadows barely show on dark. Saturated accents are toned down for dark backgrounds.

## Charts

- **Categorical colours in one fixed order**, from the system, so a series keeps its colour across charts; a handful of categories at most, with the rest gathered into an "Other" bucket.
- **Label directly** where possible and never rely on colour alone; gridlines and axes stay quiet, the data loud.

## Spacing and layout

- **Start with more space than feels necessary**, then remove; cramped reads cheap.
- **The spacing scale only**, with a consistent rhythm between sections and within components.
- **Proximity groups:** a label sits closer to its field than to the next one; equal gaps leave a reader guessing.
- **Don't fill the width** — cap content for reading and let the canvas breathe. Align to a grid and keep edges true.
- **Responsive by intent:** decide what each width emphasises, from the smallest up; truncated text in a flex row needs `min-w-0`.

## Depth

- **One elevation scale** — cards below popovers below dialogs — with light from above, and no scattered one-off shadows.
- **Fewer borders:** separate with space or a background shift first; a decorative border, when used, is low-contrast — but the border that is the only edge of an input or control keeps 3:1 against its background (WCAG 1.4.11).

## Imagery and icons

- **One icon set** at one stroke weight, kept at its intended sizes; a large visual is an illustration, not a scaled-up icon.
- **Text over a photo** sits on a scrim or gradient that guarantees contrast.
- **One aspect ratio and treatment per set**; user images are cropped to it (`object-cover`).

## States

- **Design every state**, not the happy path: default, hover, visible focus, active, disabled, loading, empty, error, and partial — some of the page loaded and some failed, each part saying which.
- **Skeletons mirror the real layout** — the same boxes in the same places — so nothing jumps when data arrives; every component that waits on data has its `<Component>Skeleton` (`design-system`).
- **An empty state says what belongs here and the next step**, and a first-run empty state differs from "no results for this filter".
- **Errors say what happened and what to do**, beside the thing that failed. The words are `copywriting`'s.

## Motion

- **Motion explains** — what changed, where it came from — and never decorates; short (a couple of hundred milliseconds), eased, from the system's duration tokens.
- **Animate `transform` and `opacity`**, never layout properties, and never `transition: all`.
- **Respect `prefers-reduced-motion`:** non-essential motion is removed or reduced to a fade (`accessibility`).

## Defaults to choose deliberately

Each of these is fine when it carries information and a tell of a template when it's habit. Use one only on purpose:

- an accent colour on one word of every headline;
- tracked all-caps labels, and an eyebrow above every heading;
- middle-dot detail strings ("12 photos · 3 days left");
- "→" on links and buttons;
- numbering on things that aren't a sequence;
- a grid of identical cards with one radius and one shadow;
- decorative gradients;
- a fade-up on every section and a hover lift on every card;
- the big-number hero.

**Borders, numbers and labels earn their place by carrying information**; remove one and see if anything was lost.

## Distinctiveness

- **The base library is a starting point to restyle within**, not something to avoid — but a screen that still looks like the library's demo is unfinished.
- **Commit to a point of view** — calm, dense, editorial, playful — and make every choice serve it: type pairing, how generous the space is, motion, one signature accent.
- **Be bold in one place** per view, and quiet everywhere else.
- **Understand why a common pattern works**, then make a considered version of it rather than a copy.

## Do / Don't

- **Do** plan hierarchy before colour; build from tokens; check in greyscale and in a browser; keep body text to a readable measure; meet contrast for text, controls and focus; step dark surfaces lighter; design every state with skeletons that mirror the layout; keep motion short and reducible; be bold in one place.
- **Don't** make everything stand out; invent an off-scale value; rely on hue alone; box everything in borders; ship only the happy path; use `transition: all`; reach for a template default out of habit; leave the base library's look untouched.

## Related skills

**This skill sets the rules and never writes an audit report.** An audit of this area is `/frontend-audit`, written from its own template. Run it rather than writing a report from here.

Tokens and theming `tailwind` · the system, tiers and skeletons `design-system` · building a reusable component `reusables` · markup `semantic-html` · contrast, focus and motion rules `accessibility` · the logo and icons `logos-and-icons` · checking in the running app `next-dev-loop` (official) · the audit `frontend-audit`.
