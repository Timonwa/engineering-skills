---
name: tailwind
description: >-
  Tailwind CSS v4 set up CSS-first — one compilation per app with `@source` for packages, CSS split into ordered layer files with installed layers kept apart, three token layers (ramps in `@theme`, roles per mode, `@theme inline`), dark mode on `[data-mode]` with an OS fallback and a pre-paint script, complete class names in a scales file, `cn()` with custom scales registered, `@utility`, container queries and v3 migration. Use when setting up Tailwind, adding a token or utility, theming, or styling a component.
---

# Tailwind

Tailwind CSS v4 is configured in CSS: `@import "tailwindcss"`, `@theme`, `@source`, `@utility` and `@custom-variant` replace the JavaScript config. Components style from **semantic tokens** — `bg-surface`, `text-heading`, `border-border` — so a rebrand, a dark mode or a second theme is a change to variables, never to components.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Setup

- **The bundler's plugin:** `@tailwindcss/postcss` as the only PostCSS plugin in Next.js, `@tailwindcss/vite` in Vite. No `tailwind.config.js`, `content` array, `postcss-import` or `autoprefixer`; `@config` loads a legacy JavaScript config only while migrating.
- **One compilation per app**, from one CSS entry that starts with `@import "tailwindcss"`. A shared UI package isn't compiled on its own: the app compiles it, with no prefix.
- **`@source` brings in files outside the app.** Source detection skips `node_modules` and gitignored files, so an app's entry names the UI package's source, relative to the stylesheet (`@source "../../packages/ui/src";`), or it gets no CSS for any package component. In a monorepo whose builds run from the root, `@import "tailwindcss" source("../src")` sets the base path. `@source not "…/**/*.stories.tsx"` keeps stories out, and `@source inline("…")` forces a class that appears nowhere as a literal.

## The CSS files

- **One entry, small files, imported in order** — the theme, then element defaults, typography, utilities, animations, then components and section families. Every authored rule sits in a layer (`@layer base`, `@layer components`) or an `@utility`: CSS outside any layer beats every layer, utilities included, so an unlayered class can't be overridden by a utility. Within one layer the later rule wins. Skeletons for each file, and which file a new rule goes in: [references/layer-files.md](references/layer-files.md).
- **Installed layers stay apart from owned ones.** Files a base library's CLI installs are reinstalled with `--overwrite`; the project's own rules live in separate files the reinstall doesn't touch, and the entry's header lists what to add back after one (`design-system`).
- **In a monorepo** the files live once in a shared config package that every app's entry imports; a rule only one app uses stays in that app.

## Tokens, in three layers

1. **Ramps in `@theme`** — the brand's palette steps (`--color-jade-50 … -950`), the type scale, radius and spacing steps. Clear the defaults you replace (`--color-*: initial`) so stray `bg-red-500` stops existing.
2. **Roles per mode** — semantic variables on `:root` and `[data-mode="dark"]` pointing at ramp steps (`--surface: var(--color-neutral-50)`), named by job, never by value. A rebrand edits layer 1; a dark-mode fix edits layer 2.
3. **`@theme inline`** exposes the roles as utilities (`--color-surface: var(--surface)`). `inline` writes the variable reference into each utility, so a role overridden on `[data-mode]` or inside one section flows through; without it the value resolves where the theme variable is defined and the override is lost. `@theme static` emits every variable even when unused, for code that reads them.

- **Components use roles only.** A palette step in a component (`bg-jade-600`) is drift; the exceptions — brand artwork — are listed in the project's docs.
- **Hex or OKLCH, consistently.** OKLCH's lightness is perceptual, which makes ramps and dark variants easier to step; either way, every text and surface pair passes contrast in both modes (`accessibility`).
- **Tokens shared with design tools** are sourced once in the Design Tokens format (DTCG, `$value` and `$type` in JSON) and generated into these files, so the CSS and the design file can't disagree.

## Dark mode

- **On an attribute:** `@custom-variant dark (&:where([data-mode="dark"], [data-mode="dark"] *));`, with the roles overridden under `[data-mode="dark"]`. Components never hard-code light and dark pairs.
- **No choice follows the OS:** the same overrides inside `@media (prefers-color-scheme: dark) { :root:not([data-mode="light"]) { … } }`, and `color-scheme` set in each mode so form controls and scrollbars match.
- **A pre-paint script** in `<head>` reads the saved choice — or, with none, `matchMedia("(prefers-color-scheme: dark)")` — and sets `data-mode` on `<html>` before the first paint, so `dark:` utilities follow the OS too and nothing flashes. The root element takes `suppressHydrationWarning` in Next.js, because the server can't know the attribute. It's an inline script, so the page's CSP must allow it (`frontend-security`).

## Writing classes

- **Tokens, not literals:** no hex, `rgb()` or arbitrary values (`bg-[#1a1a1a]`, `p-[13px]`) except a genuine one-off, commented.
- **Complete class names only.** Tailwind finds classes as literal strings in source, so `` `bg-${tone}` `` produces no CSS. A prop maps to complete strings in one scales file (`SIZES`, `RADII`, `TONES` → classes); to accept fewer values, narrow the prop's type (`Exclude<Radius, "full">`) rather than write a second map.
- **`cn()` merges** — `clsx` plus `tailwind-merge`, so a caller's `className` wins. Custom theme scales the merge can't know (a `--text-display` size, a `--shadow-raised`) are registered with `extendTailwindMerge`'s `theme`, or `text-display` and `text-heading` are treated as one conflict group and one silently drops; a custom `@utility` (`gap-rhythm-*`) needs its own `classGroups` entry.
- **State through data attributes:** style `data-[state=open]:`, `data-[disabled]:` and a component's `data-slot` parts, rather than conditional class strings.
- **`@utility` for a reusable low-level rule**, so it takes variants (`hover:`, `md:`) like a built-in; functional utilities read their value with `--value()`. **`@layer components`** only for repeated arrangement that isn't a component — anything with props or state is a component (`reusables`).
- **`@reference` the entry** before `@apply` or `@variant` in a CSS module or a `<style>` block, which compiles separately. Read theme values as CSS variables (`var(--color-primary)`); `theme()` is deprecated.
- **Mobile first**, one breakpoint per component where possible; **container queries** (`@container`, `@md:`) for a component that can't know how wide its slot is.
- **Motion respects the OS:** `motion-safe:` on decorative animation, or `motion-reduce:` to stop it (`accessibility`).

## Fonts

The UI package chooses the families and loads them (`next/font`, self-hosted files); each app maps them to roles in `@theme inline` (`--font-sans: var(--font-body)`, `--font-heading: var(--font-display)`), keeping the variable names the loader generated.

## From v3

Run `npx @tailwindcss/upgrade` (Node 20+) on a branch, then check by hand: `theme.extend` becomes `@theme`, `@tailwind` directives become `@import "tailwindcss"`, `darkMode: "class"` becomes `@custom-variant`, `content` goes, and renamed utilities (`shadow-sm` → `shadow-xs`, `ring` → `ring-3`, `outline-none` → `outline-hidden`) are checked visually. Behaviour changes the tool can't see: borders, dividers and `ring` default to `currentColor` (and `ring` to 1px); `bg-[--x]` is `bg-(--x)`; the `!` important modifier goes at the end; stacked variants apply left to right; `hover:` applies only on devices that hover; `space-*` uses a new selector; and the floor is Safari 16.4, Chrome 111 and Firefox 128.

## Do / Don't

- **Do** compile once per app with `@source` for packages; keep installed layers apart; layer tokens as ramps, roles and `@theme inline`; switch dark mode on `[data-mode]` with an OS fallback and a pre-paint script; map props to complete classes in a scales file; register custom scales with `tailwind-merge`; use container queries for reusable components.
- **Don't** add a JavaScript config or a prefix; leave an authored class outside a layer; put a palette step or a literal in a component; build a class name from a template string; hard-code a light/dark pair; reach for `@layer components` when it's a component; skip `@reference` in a CSS module.

## Related skills

Governance, tiers and when something earns a token `design-system` · visual quality `frontend-design` · building one component `reusables` · contrast and motion `accessibility` · documenting tokens as stories `storybook` · class and token names `naming`.
