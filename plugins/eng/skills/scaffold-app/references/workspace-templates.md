# Workspace templates

The workspace shell files `scaffold-app` writes. If a template here disagrees with an owning skill, the skill wins and this file is the bug.

## Contents

- Root — `.npmrc`, `package.json`, `pnpm-workspace.yaml`, `turbo.json`, hooks, CODEOWNERS, CI
- Shared packages — `typescript-config`, `ui`, `tailwind-config`, `eslint-config`, `hooks`, `contracts`, `utils`, `testing`
- `functions/*`
- Situation A — the moved app's `package.json`

`@<scope>` is a placeholder scope — substitute the repo's. Every version below is illustrative: keep whatever the scaffolder chose, and resolve genuinely new deps with `npm view <pkg> version`.

The templates assume the default UI foundation, Tailwind only. A part marked **(Adire)** applies only when the interview chose a design system on Adire; how each is set up is Adire's own skill. Another library is wired as the base library per its own docs or skill. The ticked house packages (`@timonwa/app-utilities`, `@timonwa/react-hooks`, and `@timonwa/firebase-hooks` with Firebase) go in the catalog and in the `package.json` of each workspace that uses them, each a manifest line for approval; no workspace re-implements what they export.

## Root — the shell files

### `.npmrc`

```ini
# corepack activates the exact packageManager version; this keeps installs honest.
engine-strict=true
# Workspace packages resolve to the local copy rather than the registry.
link-workspace-packages=deep
strict-peer-dependencies=false
resolution-mode=highest
```

Yarn Berry equivalent lives in `.yarnrc.yml` (`nodeLinker`, `enableGlobalCache`); there is no catalog protocol, so hold versions with `resolutions` + syncpack.

### Root `package.json` (`monorepo`, `devops`)

```jsonc
{
  "name": "@<scope>/root",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "turbo run build",
    // dev is orchestrated by pnpm filters, not turbo — turbo's dev task is persistent.
    "dev": "pnpm -r --parallel --filter @<scope>/site --filter @<scope>/dashboard --filter @<scope>/admin dev",
    "dev:site": "pnpm --filter @<scope>/site dev", // one dev:<app> per app
    "lint": "turbo run lint",
    "check-types": "turbo run check-types",
    "test": "turbo run test --concurrency=2", // two suites at a time, so none starves the others
    "format": "prettier --write \"**/*.{ts,tsx,js,mjs,json,md,mdx,css}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,mjs,json,md,mdx,css}\"",
    "deps:check": "pnpm dlx syncpack lint",
    "check:env": "node scripts/check-env.mjs",
    "prepare": "husky",
  },
  "packageManager": "pnpm@11.x.y", // an exact version; corepack refuses a range
  "engines": { "node": ">=24" }, // .nvmrc holds the version CI and every machine run
  "syncpack": {
    "source": ["package.json", "apps/*/package.json", "packages/*/package.json", "functions/*/package.json"],
    // Every place that can't use catalog: is a labelled group, so deps:check passes and the reason sits beside the rule
    "versionGroups": [
      {
        "label": "Workers pin resolved runtime versions: the cloud build's npm install cannot read catalog:",
        "packages": ["@<scope>/functions-*"],
        "dependencyTypes": ["prod"],
        "isIgnored": true,
      },
    ],
  },
}
```

Other recorded exceptions follow the same shape: a host that reads a framework's exact version from each app's `package.json`, or a tool aliased to an older major until a parser catches up (`monorepo`).

### `pnpm-workspace.yaml` (`monorepo`)

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "functions/*" # only when workers exist

# Records the versions the scaffolders resolved — one source of truth, nothing re-picked.
catalog:
  next: 16.x.y
  react: 19.x.y
  typescript: 7.x.y
  # the ticked house packages
  "@timonwa/app-utilities": x.y.z
  "@timonwa/react-hooks": x.y.z
  "@timonwa/firebase-hooks": x.y.z # only with Firebase
  # …

# Dependency build scripts are blocked by default — allow only what must build.
# pnpm 11 map form; onlyBuiltDependencies was the pnpm 10 form and is removed in 11.
allowBuilds:
  esbuild: true
  sharp: true

# A version needed before pnpm's minimum release age, named exactly; remove it once it ages past.
minimumReleaseAgeExclude: []
```

Never add `overrides` to force a version inside a third-party dependency's tree; the fix is that dependency releasing it.

### `turbo.json`

The house shape in `monorepo`, written verbatim. Every env var a build reads goes in that task's `env` — `turbo/no-undeclared-env-vars` in the shared ESLint config fails lint on a missing one.

### Hooks (`devops`)

```sh
# .husky/pre-commit
pnpm lint-staged
```

```sh
# .husky/commit-msg
pnpm commitlint --edit "$1"
```

```js
// lint-staged.config.mjs — staged files only; lint, types and tests run in CI
export default { "*.{ts,tsx,js,mjs,json,md,mdx,css}": "prettier --write" };
```

```ts
// commitlint.config.ts
export default { extends: ["@commitlint/config-conventional"] };
```

Hooks live at the **repo root only**. An app-level `.husky/` left behind after a move never fires — git reads `core.hooksPath` from the repo, not the package.

### `.github/CODEOWNERS` (`devops` — placeholder owners; real handles are project facts)

```txt
# Later rules win, so order from broad to specific.
*                       @<org>/<team>

/.github/               @<org>/<platform-team>
/packages/typescript-config/     @<org>/<platform-team>
/packages/ui/           @<org>/<design-system-team>
/apps/site/             @<org>/<web-team>
/apps/dashboard/        @<org>/<web-team>
/apps/admin/            @<org>/<web-team>
```

### CI (`devops`, `monorepo`)

The composite setup action is the standalone one in [app-templates.md](app-templates.md). The workflow runs parallel jobs that share nothing; pull requests run only what changed, a push to a tier branch runs everything.

```yaml
# .github/workflows/ci.yml — CI checks and never deploys
name: CI
on:
  pull_request: {}
  push:
    branches: [dev, staging, main]
permissions: {} # deny-all default; grant per job
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
env:
  APP_ENV: local # plus a placeholder for every secret an env guard requires, so next build passes
  AFFECTED: ${{ github.event_name == 'pull_request' && '--affected' || '' }}
  # checkout leaves the base only as origin/<base>; without this turbo runs everything
  TURBO_SCM_BASE: origin/${{ github.base_ref }}
jobs:
  format:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions: { contents: read }
    steps:
      # Checkout must precede a LOCAL composite action — the runner reads it from the
      # workspace, so it does not exist until this step has run.
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - uses: ./.github/actions/setup
      - run: pnpm format:check
  lint-and-types:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { fetch-depth: 0, persist-credentials: false } # --affected diffs against the base, so it needs history
      - uses: ./.github/actions/setup
      - run: pnpm check:env
      - run: pnpm audit --audit-level critical # reports every advisory, fails only on a critical
      - run: pnpm turbo run lint check-types $AFFECTED
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { fetch-depth: 0, persist-credentials: false }
      - uses: ./.github/actions/setup
      - run: pnpm turbo run build $AFFECTED
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions: { contents: read }
    strategy:
      fail-fast: false
      matrix:
        package: [site, dashboard, admin, api, contracts, hooks, utils] # one job per app and package
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { fetch-depth: 0, persist-credentials: false }
      - uses: ./.github/actions/setup
      - run: pnpm turbo run test --filter=@<scope>/${{ matrix.package }} $AFFECTED
  # stories: installs Playwright's Chromium (cached on its version), then runs
  # `turbo run test --filter=@<scope>/storybook $AFFECTED` — only if Storybook = yes
```

Third-party actions are SHA-pinned with a version comment — re-resolve the SHAs at scaffold time. Remote caching is optional (`TURBO_TOKEN` and `TURBO_TEAM`); a repo without it says so. Deploying is a manual rollout of only the apps that changed, each tier from its own branch, never a CI job (`devops`).

## Shared packages

### `packages/typescript-config` (`typescript`)

```jsonc
// packages/typescript-config/package.json
{
  "name": "@<scope>/typescript-config",
  "version": "0.0.0",
  "private": true,
  "files": ["base.json", "nextjs.json", "node-library.json", "react-library.json"],
}
```

```jsonc
// packages/typescript-config/base.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
  },
}
```

**`base.json` deliberately sets no `module` or `moduleResolution`** — those depend on who resolves the imports, so each target config declares its own:

| Target config        | Adds                                                                                                     | For                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `nextjs.json`        | `module: "ESNext"`, `moduleResolution: "Bundler"`, `jsx: "preserve"`, `noEmit`, `lib`, the `next` plugin | an app the framework bundles                                |
| `react-library.json` | `module: "ESNext"`, `moduleResolution: "Bundler"`, `jsx: "react-jsx"`, `lib`                             | a package every consumer bundles (`ui`, `hooks`, `utils`)   |
| `node-library.json`  | `module: "NodeNext"`, `moduleResolution: "NodeNext"`                                                     | a package **Node** loads (`contracts`, `testing`, a worker) |

**`outDir`/`rootDir` never go in a shared config.** Relative paths in an extended tsconfig resolve relative to the file that DECLARES them, so a shared `rootDir: "src"` points at `packages/typescript-config/src` and every consumer fails with TS6059 ("not under rootDir"). Each consuming package sets its own:

```jsonc
// packages/contracts/tsconfig.json — same shape for testing
{
  "extends": "@<scope>/typescript-config/node-library.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"],
  "exclude": ["node_modules", "dist"],
}
```

```jsonc
// packages/contracts/tsconfig.build.json — what `build` runs; the specs sit beside what they test and never ship
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "src/**/*.test.ts"],
}
```

Under `node-library.json` TypeScript requires the `.js` extension on relative imports and errors without one, so `"build": "tsc -p tsconfig.build.json"` emits output Node can load with no post-processing. Set `Bundler` on one of those packages instead and the build passes while `dist/` cannot be imported — `ERR_MODULE_NOT_FOUND` naming a file that exists. That is a compiler-option bug; do not paper over it with a script that rewrites the emitted imports.

An app's own `tsconfig.json` becomes:

```jsonc
// apps/<app>/tsconfig.json — paths stay relative to the APP, not the old repo root
{
  "extends": "@<scope>/typescript-config/nextjs.json",
  "compilerOptions": { "paths": { "@/*": ["./src/*"] } },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"],
}
```

### `packages/ui` — the package boundary (`design-system`, `tailwind`, `reusables`)

```jsonc
// packages/ui/package.json — ships source; per-tier subpath exports keep the import site honest about the tier
{
  "name": "@<scope>/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": "./src/index.ts",
    "./base": "./src/base/index.ts",
    "./blocks": "./src/blocks/index.ts",
    "./layouts": "./src/layouts/index.ts",
    "./lib/*": "./src/lib/*.ts",
    // (Adire) also "./assets", "./components", "./icons" and "./pages", and a
    // "./<tier>/*": "./src/<tier>/*.tsx" deep path for every tier, since its files are flat
  },
  "scripts": {
    "check-types": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
  },
  "peerDependencies": { "next": "catalog:", "react": "catalog:", "react-dom": "catalog:" },
  "devDependencies": {
    "@<scope>/eslint-config": "workspace:*",
    "@<scope>/typescript-config": "workspace:*",
    // the colocated *.stories.tsx import Meta and StoryObj, so this package's own
    // check-types needs them. Every "catalog:" spec needs a matching catalog entry —
    // a missing one fails install with ERR_PNPM_CATALOG_ENTRY_NOT_FOUND_FOR_SPEC.
    "@storybook/react-vite": "catalog:",
    "storybook": "catalog:",
  },
}
```

**(Adire)** A `.ts` module inside a tier needs its own explicit `exports` entry: the `/*` wildcards resolve `.tsx` only. The base library's components are installed into the tiers with its registry CLI, configured by the package's `components.json`; a reinstall overwrites them, so a project edit on an installed file is re-applied afterwards.

```ts
// packages/ui/src/lib/utils/cn.ts — reached by subpath (`@<scope>/ui/lib/utils/cn`)
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

The package has no CSS build. Each consuming app compiles it in its own Tailwind run, so the app's CSS entry adds `@source` for the package's `src` (and `@source not` for its stories) — without it the app build emits zero utilities for package components.

### `packages/tailwind-config` (`tailwind`)

```jsonc
// packages/tailwind-config/package.json — CSS only, nothing to build
{
  "name": "@<scope>/tailwind-config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/styles/globals.css",
    "./fonts/*": "./fonts/*",
    "./postcss.config.js": "./postcss.config.js",
  },
  "devDependencies": { "@tailwindcss/postcss": "catalog:", "tailwindcss": "catalog:" },
}
```

```css
/* packages/tailwind-config/src/styles/globals.css — the entry every app imports. Tailwind only:
   the tokens, as a single app's globals.css holds them, and dark mode on the OS setting. */
@import "tailwindcss";

@theme {
  /* the ramps */
}
:root {
  /* the semantic roles */
}
@media (prefers-color-scheme: dark) {
  :root {
    /* the same roles, dark */
  }
}
@theme inline {
  /* the roles as utilities */
}
@layer base {
  /* element defaults */
}

/* Only with a theme toggle: the attribute ThemeProvider writes on <html> before first paint. */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

```css
/* packages/tailwind-config/src/styles/globals.css (Adire) — the only file that lists the
   layer order. Tailwind first: its @layer declaration sets the precedence every later block
   relies on. */
@import "tailwindcss";
@import "./themes.css";
@import "./overrides.css";
@import "./base.css";
@import "./typography.css";
@import "./prose.css";
@import "./forms.css";
@import "./animations.css";
@import "./utilities.css";
@import "./components.css";

/* Dark mode is the attribute ThemeScript sets on <html> before first paint. */
@custom-variant dark (&:where([data-mode="dark"], [data-mode="dark"] *));
```

```js
// packages/tailwind-config/postcss.config.js — each app's postcss.config.mjs re-exports this
export default { plugins: { "@tailwindcss/postcss": {} } };
```

Apps import `@<scope>/tailwind-config` (the entry). Token values, the theme's three layers and the layer jobs → `tailwind`; the theme files and contrast check under Adire are Adire's.

### `packages/eslint-config` and `packages/hooks`

```jsonc
// packages/eslint-config/package.json — config only, nothing to build
{
  "name": "@<scope>/eslint-config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "files": ["base.js", "next.js", "react-internal.js"],
  "exports": {
    "./base": "./base.js",
    "./next": "./next.js",
    "./react-internal": "./react-internal.js",
  },
  "peerDependencies": { "eslint": "catalog:" },
}
```

`base.js` loads `eslint-config-prettier` (so Prettier and ESLint never argue), `eslint-plugin-only-warn`, `turbo/no-undeclared-env-vars`, `no-console` allowing only `info`, `warn`, `error` and `debug`, and unused names ignored only with a leading underscore; every workspace's `lint` runs `eslint --max-warnings 0` (`devops`).

```jsonc
// packages/hooks/package.json — react is a PEER, never a dependency: two copies of
// React in one app is the invalid-hook-call error
{
  "name": "@<scope>/hooks",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "sideEffects": false,
  "exports": {
    "./auth": "./src/auth/index.ts",
    "./data": "./src/data/index.ts",
    "./profile": "./src/profile/index.ts",
    "./ui": "./src/ui/index.ts",
  },
  "scripts": { "check-types": "tsc --noEmit", "lint": "eslint . --max-warnings 0", "test": "vitest run" },
  // the ticked house hook packages; this package holds only what they lack
  "dependencies": {
    "@timonwa/react-hooks": "catalog:",
    "@timonwa/firebase-hooks": "catalog:", // only with Firebase; its auth/ group wraps these hooks
  },
  "peerDependencies": { "react": "catalog:" },
  "devDependencies": { "@<scope>/testing": "workspace:*", "@<scope>/typescript-config": "workspace:*", "react": "catalog:" },
}
```

`hooks` is consumed by bundlers only, so it extends `react-library.json` and ships source rather than `dist` — the same reason `ui` does. Its concern folders and what belongs in each → the tree.

### `packages/contracts` (`schemas-and-contracts` — the four kinds)

```txt
packages/contracts/src/
  constants/     # shared enums, status unions, limits, data paths
  schemas/       # Zod schemas with their inferred types — the cross-boundary contract
  types/         # only shapes no schema or const infers
  permissions/   # permission verbs, role → permission maps, can() (only with RBAC)
  index.ts       # the whole public surface
```

```jsonc
// packages/contracts/package.json
{
  "name": "@<scope>/contracts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  // plain tsc — node-library.json makes TypeScript emit the .js extensions Node needs,
  // so there is nothing to post-process. Consumers import dist/, so after a change
  // rebuild and restart whatever runs from it.
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "check-types": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "test": "vitest run",
  },
  "dependencies": { "zod": "catalog:" },
  "devDependencies": { "@<scope>/typescript-config": "workspace:*" },
}
```

### `packages/utils` (`code-structure` — the `@<scope>/<kind>` shared-kind form)

Flat `<domain>.utils.ts` files with a single `src/index.ts` public surface, plus a `server/` subfolder with its own `server-only` barrel for anything that must never reach a browser. It ships source like `hooks` — `exports` maps `"."` to `./src/index.ts` and `"./server"` to `./src/server/index.ts`, with no build — and extends `react-library.json`, because every consumer is a bundler. With `@timonwa/app-utilities` ticked it depends on that package (`"catalog:"`) and holds only the helpers it lacks.

**`server-only` caveat:** the marker package throws under Node's _default_ export condition — it is inert only under `react-server`. So the `server/` barrel is safe in Next.js server code, but a plain `node scripts/foo.mjs` importing it crashes by design. A workspace script that needs one of those helpers keeps its own copy in the script's `lib/` — never weaken the barrel to accommodate the script.

Only genuinely cross-app helpers belong here — app-local helpers stay in that app's `src/lib/utils/` ([app-tree.md](app-tree.md)).

### `packages/testing` (`testing`)

```jsonc
// packages/testing/package.json — dev-only; built to dist/ because workers and Node-run suites load it
{
  "name": "@<scope>/testing",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./firestore": { "types": "./dist/firestore.fake.d.ts", "import": "./dist/firestore.fake.js" },
    // one subpath per fake or mock
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "check-types": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
  },
  "dependencies": { "vitest": "catalog:" }, // plus the SDKs it fakes
  "devDependencies": { "@<scope>/typescript-config": "workspace:*" },
}
```

A fake moves here on its second consumer. Each consumer takes it as a devDependency, and its `__mocks__/<package>/…` file re-exports it, because Vitest reads a manual mock only from the workspace's own folder.

`contracts` and `testing` extend `node-library.json`; `ui`, `hooks` and `utils` extend `react-library.json`. Getting that backwards builds clean and fails at import time.

## `functions/*` (only when the tier exists)

```jsonc
// functions/<worker>/package.json — one codebase per folder, with its own deps, so a
// cold start loads this worker's tree and nothing else
{
  "name": "@<scope>/functions-<worker>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "deploy/index.js",
  "engines": { "node": "24" },
  "scripts": {
    // esbuild into deploy/: the workspace packages are inlined, and a generated package.json
    // lists only the runtime dependencies
    "build": "node ../../scripts/bundle-function.mjs",
    "check-types": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "test": "vitest run",
  },
  // resolved versions, matching the catalog: the cloud build runs a plain npm install,
  // which reads neither catalog: nor workspace:
  "dependencies": { "firebase-admin": "x.y.z", "firebase-functions": "x.y.z" },
  "devDependencies": { "@<scope>/contracts": "workspace:*", "@<scope>/typescript-config": "workspace:*" },
}
```

```jsonc
// functions/<worker>/tsconfig.json
{
  // NOT react-library: a Cloud Function is loaded by Node, so it needs the same
  // NodeNext resolution packages/contracts does. esbuild writes the bundle; tsc only checks.
  "extends": "@<scope>/typescript-config/node-library.json",
  "compilerOptions": { "rootDir": "src", "noEmit": true },
  "include": ["src/**/*"],
}
```

Add `- "functions/*"` to the workspace globs; the house `turbo.json` already lists `deploy/**` in `build.outputs`. The workers' production dependencies sit in the ignored syncpack group in the root `package.json`. Every folder here must also appear in `firebase.json`'s `codebases` map — one that is missing simply never deploys, silently. A worker has no `.env`: each secret is a `defineSecret(...)` (`env`). Deploy wiring → `devops`.

## Situation A — the moved app's `package.json`

```jsonc
// apps/<app>/package.json — after the move
{
  "name": "@<scope>/<app>",
  "private": true, // never publish an app
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "next dev --port 3000", // the port from the interview
    "build": "next build",
    "start": "next start",
    "lint": "eslint --max-warnings 0",
    "check-types": "next typegen && tsc --noEmit",
    "test": "vitest run",
  },
  "dependencies": {
    "next": "catalog:", // was the literal version the scaffolder picked — now recorded in the catalog
    "react": "catalog:",
    "react-dom": "catalog:",
    "@<scope>/ui": "workspace:*",
    "@<scope>/contracts": "workspace:*",
    "@timonwa/app-utilities": "catalog:", // the ticked house packages
    "@timonwa/react-hooks": "catalog:",
  },
  "devDependencies": { "@<scope>/typescript-config": "workspace:*", "@<scope>/tailwind-config": "workspace:*" },
}
```

`packageManager` and `engines` are **removed** from here and set once at the root. Cataloging a version is not re-picking it — the catalog records exactly what the scaffolder resolved. A host that reads `next`'s exact version from each app keeps it pinned here, in the same change as the catalog, with a labelled syncpack group (`monorepo`).

Also removed from the app during the move, because they now govern the whole workspace and live at its root: `commitlint.config.*`, `.husky/`, `.github/`, `.nvmrc`, `renovate.json`, `lint-staged.config.*`, the Prettier config, and the lockfile. An app-level copy of any of these is dead config — it never runs, and it drifts from the one that does.

What each app keeps, because it genuinely differs per deployment: its `.env`/`.env.example`, its `next.config.ts`, its hosting config, its `eslint.config.mjs` (three lines, extending `@<scope>/eslint-config/next`), its own `_docs/`, and its `README.md` + `AGENTS.md`. **Every app and every package carries that pair, config-only packages included** — the root files cover the workspace, the local ones add what only that folder knows, read after the root (`agents-md`).
