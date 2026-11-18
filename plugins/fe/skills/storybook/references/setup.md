# Storybook — setup

Storybook documents the UI and, through its Vitest addon, **is the UI's test suite**: every story renders in a real browser, its `play` function runs, and an accessibility violation fails the run (`testing`). Two decisions are often confused, so keep them apart:

- **Where the Storybook app lives** — in a monorepo, its own app (`apps/storybook`) with its own config and dependencies, pointed at the shared UI package; in a single app, a `.storybook/` folder inside it.
- **Where a story file lives** — always **beside the component it documents**, named like the component's file. The sidebar is built from each story's `title` and the preview's sort order, never from the path, so a component and its story move, rename and delete together.

## Contents

- [Install](#install)
- [`main.ts`](#maints)
- [`preview.tsx`](#previewtsx)
- [Stories as tests](#stories-as-tests)
- [Lint](#lint)
- [Optional](#optional)
- [Story format](#story-format)
- [Troubleshooting](#troubleshooting)

## Install

- **`pnpm create storybook@latest`** (the `create` command; `init` is for versions before 8.3), choosing the framework package that matches the consumers: **`@storybook/nextjs-vite`** when the components render in Next.js apps, so `next/link`, `next/image` and `next/font` behave as they do there; **`@storybook/react-vite`** for React on Vite. Delete the sample stories it writes.
- **Storybook 10 is ESM-only** and needs Node 20.19+ or 22.12+; every Storybook package moves together, at one version through the catalog in a monorepo (`monorepo`). Each install is approved by the owner first.
- **Controls, actions, interactions, backgrounds, viewport and the other essentials are built in.** Never install `@storybook/addon-essentials` or the separate controls, actions or interactions addons — their last releases are for Storybook 8. Spies come from `storybook/test` (`fn()`), never `@storybook/test`.
- **The addons worth installing:** `@storybook/addon-a11y` (axe in every story), `@storybook/addon-vitest` (stories as tests), `@storybook/addon-docs` (docs pages). `@chromatic-com/storybook` only if the project takes visual tests.

## `main.ts`

```ts
import type { StorybookConfig } from "@storybook/nextjs-vite";
import tailwindcss from "@tailwindcss/vite";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: [
    "../src/**/[A-Z]*.stories.@(ts|tsx)", // the app's own stories; [A-Z] skips _Template.stories.tsx
    "../../../packages/ui/src/**/*.stories.@(ts|tsx)", // monorepo: the UI package's, beside each component
  ],
  addons: ["@storybook/addon-a11y", "@storybook/addon-vitest", "@storybook/addon-docs"],
  viteFinal: (viteConfig) => {
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()]; // one Tailwind compilation
    return viteConfig;
  },
};

export default config;
```

- **Tailwind through its Vite plugin**, so stories and the components they render share one compilation of the same CSS the apps import (`tailwind`); the Storybook app's CSS needs the `@source` line for the UI package, like any app's. **Compile it once:** if the Storybook app also has a PostCSS config with `@tailwindcss/postcss`, remove one of the two, or every story pays for two passes.
- **A UI package installed from a registry** may import through the registry's own aliases; mirror them in `viteFinal`'s `resolve.alias`, as the package's tsconfig does for its type check.
- **A single app** points `stories` at its own source and drops the package glob.
- **Async Server Components** render in stories only with `features: { experimentalRSC: true }` in `main.ts` — an experimental flag; keep such components thin and test their data function instead (`testing`).

## `preview.tsx`

- **The global CSS**, imported once — the same entry the apps use.
- **The tier order**, pinned with `storySort.order` — `Foundations`, `Assets`, `Icons`, `Base`, `Components`, `Blocks`, `Layouts`, `Pages`, with any subcategories nested under their tier. Leave out `method: "alphabetical"`: it sorts the stories too, and each file's reading order (Default first) is lost. The tiers themselves are `design-system`'s.
- **Providers as global decorators** — theme, link provider, anything a component's hooks need — so no story wraps itself. **A router decorator** supplies the apps' link component, and `parameters.nextjs.appDirectory: true` lets components that use `next/navigation` render.
- **Dark mode from a toolbar global**, which a decorator turns into the same class or attribute the apps set on `<html>`. The backgrounds tool is disabled (`backgrounds: { disable: true }`): it paints over the token model. A story never exists just to show dark mode.
- **`tags: ["autodocs"]`** globally, so every component gets a docs page.
- **Accessibility fails from day one:** `parameters: { a11y: { test: "error" } }`. Never turn an axe rule off or mark a story `"todo"` to get green — fix the component, or wrap a third-party one so the wrapper passes (`accessibility`).
- **Modules that do I/O are mocked once**, with `sb.mock(import("…"))` in the preview — a session read, a server action, an analytics call — never workspace logic or pure dependencies (`testing`). The path is relative to the preview file and includes the extension (`sb.mock(import("../src/lib/session.ts"))`); an alias or subpath import (`@/lib/session.ts`, `#lib/session`) doesn't work. Next.js's own modules are mocked through the framework: `@storybook/nextjs-vite/headers.mock`, `cache.mock`, `navigation.mock` and `router.mock`.

## Stories as tests

- **`storybook add @storybook/addon-vitest`** installs and wires it. The Vitest project uses `storybookTest({ configDir })` and browser mode with the Playwright provider (`playwright()` from `@vitest/browser-playwright`), headless Chromium, and `.storybook/vitest.setup.ts`.
- **CI installs Chromium** (`playwright install --with-deps chromium`), cached on Playwright's version, and runs the suite like any other (`devops`). A browser test waits on paint, so its timeout is raised above Vitest's default rather than letting a busy runner fail it.
- **The UI package declares its framework package (`@storybook/nextjs-vite` or `@storybook/react-vite`) and `storybook` as devDependencies**, because its story files import their types and spies; story files are excluded from its build, so nothing ships to consumers. The Storybook app depends on the UI package, never the reverse.

## Lint

**`eslint-plugin-storybook`'s recommended config** sits in the shared ESLint config, applied to `*.stories.*` files. Its rules catch the common slips — a renderer-package import (`no-renderer-packages`), a story without a default export, an `await` missing in `play` — and stay at error like every rule.

## Optional

- **Visual tests** — Chromatic, through its addon, on the stories that matter.
- **A hosted Storybook** — `storybook build`, deployed behind the team's auth when designers or reviewers need a URL (`devops`); solo, it stays local.

## Story format

**CSF3 with `satisfies Meta`** is the house format (see `SKILL.md`). **CSF Next** (factory functions) is a preview feature in Storybook 10 whose API may still change; adopt it once it's stable, for the whole project at once, never mixed.

## Troubleshooting

| Symptom                                      | Fix                                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Unstyled components                          | The preview doesn't import the global CSS, or the Tailwind plugin or `@source` is missing |
| A hook throws (`useTheme`, a router hook)    | The provider or router decorator is missing, or `nextjs.appDirectory` isn't set           |
| Dark mode does nothing                       | The decorator isn't setting the class or attribute the tokens read                        |
| A story is missing from the sidebar          | The `stories` glob or the `title` doesn't match; restart after adding files               |
| A mocked module still runs for real          | The `sb.mock` path uses an alias or lacks its extension                                   |
| Tests time out only when suites run together | The runner is oversubscribed; raise the browser timeout and keep two suites at a time     |
