---
name: storybook
description: >-
  Storybook 10 for a Next.js or React project, where every story is also a test — setting it up (the framework package, built-in essentials plus a11y, vitest and docs, Tailwind once, a preview with the tier order, providers, toolbar dark mode, module mocks, accessibility failing from day one, browser tests in CI) and writing stories in CSF3 (`satisfies Meta`, `fn()` spies, a control per prop, tier-first titles, a fixed story order, keyboard `play` stories asserting by role). Use when adding, configuring or writing stories.
---

# Storybook

A story is two things at once: the page where a person sees a component in each state that matters, and — run by the Vitest addon in a real browser — that component's test (`testing`). So every story earns its place by showing or proving something; one written to fill a list is noise in both. Setting Storybook up is a one-off, summarised below and detailed in [references/setup.md](references/setup.md).

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Setting it up

- **`pnpm create storybook@latest`** with the framework package that matches the consumers — `@storybook/nextjs-vite` for components rendered in Next.js, `@storybook/react-vite` otherwise. Storybook 10 is ESM-only; every Storybook package moves at one version.
- **The essentials are built in.** Install only `@storybook/addon-a11y`, `@storybook/addon-vitest` and `@storybook/addon-docs` — plus `eslint-plugin-storybook` in the shared lint config.
- **The preview** imports the global CSS, pins the tier order, supplies providers and a router as decorators, turns dark mode on from a toolbar global, mocks modules that do I/O, and sets `a11y: { test: "error" }`.
- **Stories run as tests** in CI through the Vitest addon, in headless Chromium.

In a monorepo the Storybook app is its own app pointed at the UI package; in a single app it's a `.storybook/` folder. Either way, **a story file lives beside its component**. The details, `main.ts`, the preview and troubleshooting are in [references/setup.md](references/setup.md).

## Done means the story too

- **A new component ships with its stories**, in the same change; **a changed component** updates them — a new, changed or removed prop, variant or state changes the controls and the stories that show it.
- **The file sits beside the component**, named like the component's file (`button.stories.tsx` beside `button.tsx` in a package that uses kebab-case files, `Button.stories.tsx` in an app — `naming`).

## The canonical story

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite"; // the framework package, never the renderer package
import { fn } from "storybook/test";
import { Button } from "./button";

const meta = {
  title: "Base/Button",
  component: Button,
  parameters: { layout: "centered" }, // centered · padded · fullscreen
  args: { children: "Save", onClick: fn() }, // a spy for every callback prop
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost"], description: "Visual weight" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The button as most screens use it. */
export const Default: Story = {};

/** Waiting on a request: the label stays, a spinner joins it, and clicks do nothing. */
export const Loading: Story = { args: { isLoading: true } };
```

- **Types come from the framework package** (`@storybook/nextjs-vite`, or `@storybook/react-vite` outside Next.js) — `eslint-plugin-storybook`'s recommended `no-renderer-packages` rule fails an import from `@storybook/react`.
- **`satisfies Meta<typeof X>`, never `: Meta<typeof X>`**: it ties `meta` to `StoryObj<typeof meta>`, so args set on the meta or the story stay type-checked. A file with no single component (an icon gallery, a composition) may annotate `Meta` plainly.
- **Every story is typed `: Story`**, and shared args live on the meta, so each story holds only what differs.
- **Callbacks are `fn()` spies** from `storybook/test` — they log in the Actions panel and can be asserted in `play`. Never `argTypes: { onClick: { action: "…" } }`.
- **Every public prop has a working control** — inferred from its type where that's right, an `argTypes` entry where it isn't (a union as a `select`, a number with its range) — with a `description` when the name doesn't say enough.
- **A JSDoc comment (`/** … */`) on each story** says what it shows; the docs page uses it as the story's description. A `//` comment isn't picked up.

## Controlled components

A spy never updates the arg it replaces, so a controlled component (`open` with `onOpenChange`, `value` with `onChange`) would freeze. Its stories keep the arg in step with `useArgs` from `storybook/preview-api`, or render through a small wrapper that holds the state:

```tsx
import { useArgs } from "storybook/preview-api";

export const Controlled: Story = {
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return <Dialog {...args} onOpenChange={(open) => { args.onOpenChange?.(open); updateArgs({ open }); }} />;
  },
};
```

## Titles

- **Tier first:** `Foundations/…`, `Assets/…`, `Icons/…`, `Base/…`, `Components/…`, `Blocks/…`, `Layouts/…`, `Pages/…` — the tiers `design-system` defines, in the order the preview sorts them.
- **A tier that grows takes subcategories by behaviour** — `Disclosure`, `Display`, `Feedback`, `Forms`, `Navigation`, `Overlay` (`Components/Overlay/Dialog`). Never by product domain in a shared package, and never by shape: there's no "Cards" bucket. A new subcategory is a decision recorded with the tiers, not drift.

## Which stories, in what order

1. **Default** — the baseline: required props supplied, everything else at its default.
2. **Variants and sizes** — one story each, when they differ in more than colour; otherwise one overview story.
3. **States** — disabled, loading, empty, error, and any state the component can reach that looks or behaves differently.
4. **With…** — optional parts (`WithIcon`, `WithDescription`).
5. **Real configurations** — the component as the product actually uses it: real-length text, a long name, a full list, inside the block it usually sits in.
6. **Interaction stories** — below.

**Not a story:** dark mode (the toolbar shows every story in it), right-to-left, a prop combination nothing uses, or a story whose only purpose is to raise a count. Names are whole words, without the kind repeated (`Small`, not `SmallSize`).

## Interactions

```tsx
import { expect, screen } from "storybook/test";

export const ClosesOnEscape: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.tab(); // keyboard first: reach the trigger the way a keyboard user does
    await userEvent.keyboard("{Enter}");
    await expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeVisible(); // portals render outside the canvas
    await userEvent.keyboard("{Escape}");
    await expect(canvas.getByRole("button", { name: "Edit profile" })).toHaveFocus(); // focus returns to the trigger
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
  },
};
```

- **`play` takes `canvas` and `userEvent` from its context**; `screen` reaches what renders outside the story, like a dialog's portal.
- **A keyboard story for every interactive component**: reach it with Tab, operate it with the keys its pattern defines (Enter, Space, arrows, Escape), and assert where focus goes (`accessibility`).
- **Assert behaviour, never markup.** Query by role, label or text, the way a person finds things; assert what they'd notice — a callback fired, focus moved, text appeared. Never assert a tag name, a class, a landmark or a hard-coded structure: the test then breaks on a refactor that changes nothing a person sees, and passes when the behaviour is wrong.
- **One behaviour per interaction story**, named for it (`ClosesOnEscape`, `SubmitsTheForm`). A story that exists only to test is hidden from the sidebar and the docs page with `tags: ["!dev", "!autodocs"]`; it still runs.

## Accessibility

Axe runs on every story and fails the run ([references/setup.md](references/setup.md)). Fix the component; never switch a rule off in a story's `parameters.a11y` to make it pass. A violation in a third-party component is fixed in the copy the project owns, or tracked against that story with a reason.

## Data and dependencies

- **Props carry the data**: a fixture from the shared testing package, not a fetch (`testing`).
- **Modules that do I/O are mocked in the preview** with `sb.mock`; a story never mocks the project's own logic.
- **Providers come from the global decorators** — a story never wraps itself in a theme or router.
- **Wrapper JSX in a story uses the design system's own components and semantic token classes**, never literals (`tailwind`).

## Avoid

- CSF2's `Template.bind({})`; `@storybook/test`; a renderer-package import; `{ action: "…" }` argTypes; untyped stories.
- Args repeated in every story instead of hoisted to the meta; a controlled component driven by a bare spy.
- A story for dark mode, right-to-left or coverage; a `play` that asserts tags or classes; an axe rule turned off.

## Related skills

Stories as the UI tests `testing` · tiers `design-system` · keyboard patterns and axe `accessibility` · building the component `reusables` · tokens and CSS `tailwind` · file and story names `naming` · catalog and versions `monorepo` · CI and hosting `devops` · the audit `storybook-audit`.
