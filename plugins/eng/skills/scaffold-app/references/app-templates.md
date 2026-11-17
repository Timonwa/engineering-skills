# App templates

The file contents `scaffold-app` writes into one app, grouped by what they're for. `SKILL.md` decides the order and links each section by name.

## Contents

- [Editing the scaffolder's files](#editing-the-scaffolders-files) — edited in place, never replaced
- [The `lib/` kinds](#the-lib-kinds) — the client-safe kinds
- [The `lib/server` boundary](#the-libserver-boundary) — the kinds the app's shape turns on
- [Standalone extras: CI, hooks and commitlint](#standalone-extras-ci-hooks-and-commitlint) — only for an app outside a workspace
- [The design-system proof](#the-design-system-proof) — style layers, one component, its story
- [Demo files to delete](#demo-files-to-delete) — per starter
- [The library-package variant](#package) — when the target is a shared package, not an app

Every block is real, runnable code with `// …` elisions where trimmed. Each names its owning skill; when a block and its owning skill disagree, **the skill wins and this file is the bug**. No version appears in any dependency here on purpose — the starter chose the versions, and only a genuinely new dependency gets one, resolved from the registry at scaffold time.

Two rules cut across every section: **a file the starter provided is edited, never overwritten**, and **nothing conditional is written unless an interview answer earned it**.

The blocks assume the default UI foundation, Tailwind only. A block marked **(Adire)** applies only when the interview chose a design system on Adire; how each is set up is Adire's own skill. Another library is wired as the base library per its own docs or skill.

## Editing the scaffolder's files

These exist already and hold decisions worth keeping. Every block below is an addition or a targeted change.

### `package.json` — add scripts, never replace the block

Keep `dev`, `build` and `start` exactly as the starter wrote them (they encode its bundler choice). Make `lint` fail on any warning, and add only what is missing (`devops`, `typescript`):

```jsonc
{
  "scripts": {
    // starter's dev/build/start stay untouched above
    "lint": "eslint --max-warnings 0",
    "check-types": "next typegen && tsc --noEmit", // typed routes and PageProps come from Next's generated types
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run", // only if unit tests were chosen
    "check:env": "node scripts/check-env.mjs", // standalone only: .env and .env.example name the same keys
    "prepare": "husky", // standalone only
  },
  // The ticked house packages, each a manifest line for approval; "catalog:" in a workspace.
  // The app never re-implements what they export.
  "dependencies": {
    "@timonwa/app-utilities": "x.y.z",
    "@timonwa/react-hooks": "x.y.z",
    "@timonwa/firebase-hooks": "x.y.z", // only if store = Firebase
  },
  "packageManager": "pnpm@11.x.y", // standalone only: the exact version, corepack refuses a range
  "engines": { "node": ">=24" },
}
```

The `x.y.z` versions are resolved from the registry at scaffold time. `storybook init` adds its own `storybook`/`build-storybook` scripts — if it ran, do not duplicate them. What pre-commit runs lives in `lint-staged.config.mjs` (see [Standalone extras](#standalone-extras-ci-hooks-and-commitlint)).

### `tsconfig.json` — add flags and the alias; keep everything the starter set

Leave `plugins: [{ "name": "next" }]`, `include`, `moduleResolution`, `jsx`, and `lib` alone. Add, per `typescript`:

```jsonc
{
  "compilerOptions": {
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./src/*"] }, // present already when created with --src-dir
  },
}
```

In a monorepo, replace the app's `compilerOptions` with `"extends": "@<scope>/typescript-config/nextjs.json"` plus only its own `paths` — the shared presets are in [workspace-templates.md](workspace-templates.md).

### `next.config.ts` — add house flags and headers (`nextjs`, `devops`)

The starter writes an empty `NextConfig`. Add into the existing object (all three are current top-level keys — verify against the installed major before writing):

```ts
// next.config.ts — freshness tiers named by how fresh the data must be, called by name
// from cacheLife(), and identical across every house app so a tier means one thing.
const nextConfig: NextConfig = {
  cacheComponents: true,
  typedRoutes: true,
  cacheLife: {
    realtime: { stale: 0, revalidate: 10, expire: 60 },
    frequent: { stale: 60, revalidate: 300, expire: 3600 },
    daily: { stale: 3600, revalidate: 86_400, expire: 172_800 },
    static: { stale: 86_400, revalidate: 604_800, expire: 2_592_000 },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
```

Internal/admin apps add `X-Robots-Tag: noindex, nofollow`; a public app also needs a CSP (policy → `frontend-security`). Leave `postcss.config.mjs` alone — the starter's `@tailwindcss/postcss` single-plugin config is already correct for v4. In a workspace, an app that consumes source-shipping packages lists them in `transpilePackages`.

### `globals.css` → the house layers (a split, not a rewrite)

The Next starter's Tailwind v4 entry is roughly this — **read the real file, it drifts**:

```css
/* app/globals.css — as shipped */
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
}
```

Keep the starter's font wiring and reshape the rest in place. A Tailwind-only app keeps **one `globals.css` entry** (`code-structure` puts it at `src/styles/globals.css`) and adds a layer file only when one is needed:

| Starter fragment                      | Destination                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `@import "tailwindcss"`               | stays first in the entry                                                                                     |
| `:root` vars                          | semantic roles (`--bg`, `--text`, `--accent`, `--border`, `--radius`, …) over ramps registered in `@theme`   |
| `@theme inline { … }`                 | stays last among the tokens — **keep the `--font-*` mappings**, they point at the starter's `next/font` vars |
| `@media (prefers-color-scheme: dark)` | **kept** — dark mode follows the OS by default; it overrides the same role names                             |
| `body` / element rules                | `@layer base` in the same file                                                                               |

```css
/* src/styles/globals.css — the only entry a layout imports */
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
  /* the roles as utilities; keep the --font-* mappings */
}
@layer base {
  /* element defaults */
}
```

**Only with a theme toggle:** the dark roles also go in a `[data-theme="dark"]` block, the media query narrows to `:root:not([data-theme="light"])`, and the `dark:` variant follows the attribute, which the pre-paint script writes on `<html>`:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

**(Adire)** The layers come from Adire's registry install — a theme file, overrides, base, typography, forms, animations, utilities, components — behind an entry that lists their order, with dark mode on `[data-mode="dark"]` set by Adire's `ThemeScript`:

```css
@import "tailwindcss";

@import "./themes.css"; /* ramps, roles, @theme inline */
@import "./overrides.css"; /* project tweaks; after the theme so source order wins */
@import "./base.css"; /* element defaults */
@import "./typography.css";
@import "./forms.css";
@import "./animations.css"; /* keyframes */
@import "./utilities.css"; /* @utility */
@import "./components.css"; /* repeated class patterns */

@custom-variant dark (&:where([data-mode="dark"], [data-mode="dark"] *));
```

In a monorepo the app entry imports the shared `@<scope>/tailwind-config` entry instead of local tokens or layers, then its own `components.css`, and adds `@source` for the UI package's `src` when there is one — without it the app build emits zero utilities for package components:

```css
@import "@<scope>/tailwind-config";
@import "./components.css";

@source "../../../../packages/ui/src";
@source not "../../../../packages/ui/src/**/*.stories.tsx";
```

### `src/app/layout.tsx` — repoint the CSS import, set real metadata, mount the providers

Change the starter's `import "./globals.css"` to `import "@/styles/globals.css"`, keep its `next/font` setup and the `className` it puts on `<html>`/`<body>`, and replace the placeholder `metadata`. Every client provider goes in `providers.tsx`, so the layout stays a server component:

```tsx
import type { Metadata } from "next";
import { Providers } from "./providers";
import "@/styles/globals.css";

export const metadata: Metadata = { title: "<App name>", description: "<One line>" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning only with a theme toggle (or Adire): the pre-paint
    // script writes the attribute on <html> before React hydrates
    <html lang="en" className={/* the starter's next/font variables */ ""} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```tsx
// src/app/providers.tsx — only once the app has a client provider
"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@timonwa/react-hooks";

export function Providers({ children }: { children: ReactNode }) {
  // Only with a theme toggle: writes data-theme on <html> and inlines the pre-paint script
  return <ThemeProvider attribute="data-theme">{children}</ThemeProvider>;
}
```

A Tailwind-only app links with plain `next/link`. **(Adire)** `ThemeScript` goes in the layout's `<head>`, and `providers.tsx` mounts Adire's theme provider and the root `LinkProvider`, which hands `next/link` to the router-agnostic `Link` so no call site passes it:

```tsx
// src/app/providers.tsx (Adire)
"use client";

import NextLink from "next/link";
import type { ReactNode } from "react";
import { LinkProvider, ThemeModeProvider } from "@/ui/base";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeModeProvider>
      <LinkProvider component={NextLink}>{children}</LinkProvider>
    </ThemeModeProvider>
  );
}
```

The layout never reads the session; a route group's layout gates behind `<Suspense>` (`auth`). Richer metadata (templates, OG, canonicals) → `lib/seo/` and `seo`, when that extra was selected.

### `src/app/page.tsx` — make it a thin entry

The starter's demo markup is replaced wholesale; the file itself is an EDIT, not a DELETE:

```tsx
// entry files import a composed …PageContent and nothing else
import { HomePageContent } from "@/components/marketing/home";

export default function HomePage() {
  return <HomePageContent />;
}
```

### `.gitignore` — append the gaps

The starter covers `node_modules`, `.next`, and `*.tsbuildinfo`. Append only what is missing:

```gitignore
 # env — .env.example is the only committed env file
.env
.env.*
!.env.example

 # caches / build output
.turbo/
storybook-static/
coverage/
playwright-report/
test-results/
```

### Files `storybook init` owns

Reshape rather than rewrite: point `stories` at the colocated stories (`../src/ui/**/*.stories.@(ts|tsx)` and `../src/components/**/*.stories.@(ts|tsx)`), trim `addons` to `@storybook/addon-a11y` + `@storybook/addon-vitest` + `@storybook/addon-docs` (controls/actions/interactions are core — installing `addon-essentials`/`addon-actions` breaks on Storybook 10), import the app's CSS entry in `preview`, and add the tier `storySort`. Details → `storybook`.

## The `lib/` kinds

Each kind flat, each with a barrel of explicit exports, and never an empty kind.

### `.env.example` (`env` — every key, names only)

**`.env` holds secrets and nothing else.** A credential, a signing key, a token issued by a third party — anything that must not be committed. Everything else is a constant, even when it changes per tier: base URLs, cookie domains, CORS origins, analytics ids, feature toggles, public keys. Those go in `config/site.ts`, keyed off `APP_ENV`, where they are reviewable in one diff instead of retyped into three dashboards.

`APP_ENV` is the one exception, because it is the key the constants are selected by, and it has to arrive from the environment to be known at all. It names the tier — `local`, `development`, `staging`, `production` — and is never `NODE_ENV`, which the framework owns.

`.env.example` lists every key the app and its scripts read, with no values and no comments:

```dotenv
APP_ENV=
SESSION_SECRET=
```

### `src/lib/config/env.ts` (`env` — validate at boot; a leaf module)

```ts
import "server-only";
import { z } from "zod";

// Leaf module on purpose: app code imports `env`, never process.env, so a missing
// var fails the boot instead of surfacing as undefined deep inside a request.
const EnvSchema = z.object({
  APP_ENV: z.enum(["local", "development", "staging", "production"]),
  SESSION_SECRET: z.string().min(32),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
export type Env = z.infer<typeof EnvSchema>;
```

A value optional locally but required on a deployed tier is `.optional()` plus a `superRefine` keyed on `APP_ENV` (`env`).

### `src/lib/config/routes.ts` + a kind barrel (`code-structure`, `typescript`, `naming`)

**Group by route group, never one flat object.** A single `ROUTES` with fifty keys is impossible to scan, merges badly, and gives no clue where a new path belongs. One nested group per route group, so a path's home is obvious before you look. **The `RouteTable` type is declared in this file, never shared:** `Route` is a real union of pages only inside an app, so a shared table would check nothing.

```ts
// src/lib/config/routes.ts — no hardcoded path strings anywhere else
import type { Route } from "next";

type RouteTable = {
  [key: string]: Route | RouteTable | ((...args: never[]) => string);
};

export const ROUTES = {
  marketing: {
    home: "/",
    pricing: "/pricing",
  },
  auth: {
    login: "/auth/login",
    signup: "/auth/signup",
  },
  dashboard: {
    overview: "/overview",
    settings: "/settings",
  },
  // one group per route group; a group gets a nested object, never a prefixed key
} as const satisfies RouteTable;
```

A path with a parameter is a function typed by its template, and lives beside the group it belongs to — never a template string assembled at the call site:

```ts
  dashboard: {
    overview: "/overview",
    project: (projectId: string): `/projects/${string}` => `/projects/${projectId}`,
  },
```

`endpoints.ts` is grouped the same way, but **by the backend's own shape — resource or service, not by which page calls it.** The API's structure is the thing that changes, so the config mirrors the API and not the UI:

```ts
// src/lib/config/endpoints.ts — every API path; no literal URL in a service or component

// The version lives here once. A v2 migration edits this line, not every endpoint —
// and because each path is built from it, none of them can be missed.
const API_BASE = "/api/v1";

export const API_ENDPOINTS = {
  users: {
    list: `${API_BASE}/users`,
    detail: (userId: string) => `${API_BASE}/users/${userId}`,
  },
  billing: {
    subscription: `${API_BASE}/billing/subscription`,
    invoices: `${API_BASE}/billing/invoices`,
  },
} as const;
```

When two versions run side by side during a migration, the base becomes a small map rather than a second copy of the file — the endpoints still read the same:

```ts
const API_BASE = { v1: "/api/v1", v2: "/api/v2" } as const;

export const API_ENDPOINTS = {
  users: {
    list: `${API_BASE.v2}/users`, // migrated
  },
  billing: {
    invoices: `${API_BASE.v1}/billing/invoices`, // still v1
  },
} as const;
```

Rules that keep either file honest as it grows:

- **A group earns its own file once it outgrows the shared one.** `routes.ts` splitting into `routes/dashboard.route.ts` is the same kind-first move as any other folder (`code-structure`); the barrel re-exports one `ROUTES`.
- **Never build a path by concatenation at the call site.** `` `${ROUTES.dashboard.overview}/${id}` `` defeats the point — add the function to the group instead, so every caller gets the same shape.
- **Never `as Route` on a literal** — the cast accepts a path that no longer exists, while `satisfies` fails the build. Keep `as Route` for a path known only at runtime, with a comment saying which.
- **No exported union of every path.** Flattening a nested tree into one string type needs a recursive helper that breaks the moment a group holds a function, and `typedRoutes` already type-checks `href` against the real file system.
- **With `typedRoutes` on, a prop that feeds a `Link href` is `Route`, not `string`.** Next narrows `href` to `UrlObject | RouteImpl<string>`, so a `string` prop fails with `Type 'string' is not assignable to type 'UrlObject | RouteImpl<string>'` the moment a shared component (a `Navbar`, a `Sidebar`, a nav-item type) passes one through. Import it from the framework — `import type { Route } from "next"` — and type the field `href: Route`. That is not the forbidden union above: `Route` is the framework's own type, generated from the real file system, not a hand-rolled flattening of `ROUTES`. A literal from `ROUTES` satisfies it, and a nav item pointing at a deleted page now fails the build instead of shipping.

  ```ts
  // src/lib/types/nav.type.ts
  import type { Route } from "next";

  export type NavItem = {
    href: Route;
    label: string;
  };
  ```

  Only props that reach a `Link`/`redirect` need this. A prop that is merely displayed, logged, or compared stays `string`.

`site.ts` holds the canonical name, OG defaults, and **every value that differs by tier** — derived from `APP_ENV` rather than added to `.env`:

```ts
// src/lib/config/site.ts — one place per-tier values are resolved
import { env } from "./env";

// Keyed off APP_ENV so a new deployment needs no new env vars, and so the values
// for every tier are reviewable in one diff instead of scattered across dashboards.
// Four tiers, and `local` is not a synonym for `development`: local is your machine,
// development is the deployed dev environment with a real URL and real cookies.
const PER_TIER = {
  local: { url: "http://localhost:3000", cookieDomain: "localhost", analyticsId: null },
  development: { url: "https://dev.example.com", cookieDomain: ".dev.example.com", analyticsId: null },
  staging: { url: "https://staging.example.com", cookieDomain: ".staging.example.com", analyticsId: null },
  production: { url: "https://example.com", cookieDomain: ".example.com", analyticsId: "TODO" },
} as const;

export const SITE = {
  name: "TODO: product name",
  description: "TODO: one sentence, used as the OG and meta default",
  ...PER_TIER[env.APP_ENV],
} as const;
```

**Only secrets earn a place in `.env`.** Everything above is a constant that happens to vary by tier — committing it is the point, because that is what makes it reviewable. A public analytics id is not a secret; a signing key is (`env`).

```ts
// src/lib/config/index.ts — server-only, because it re-exports env. Client code
// imports the one file it needs by path (`@/lib/config/routes`); the build catches the barrel.
export { API_ENDPOINTS } from "./endpoints";
export { env, type Env } from "./env";
export { ROUTES } from "./routes";
export { SITE } from "./site";
```

**One explicit export line per file, never `export *` from a directory** — the barrel is the kind's public surface, and a wildcard hides what joined it. Every kind gets this treatment; `src/lib/server/index.ts` gets its own and is **never** merged with these.

The one exception is a barrel that composes other barrels — `ui/index.ts` over the tiers, `lib/server/index.ts` over its kinds. Each thing it re-exports is already an explicit list, so nothing is hidden; `export *` over a _directory of files_ is what the rule forbids.

Domain files in the suffixed kinds follow `<domain>.<kind>.ts`, with the const and its inferred type in the same file:

```ts
// src/lib/constants/nav.constant.ts
import type { NavItem } from "@/lib/types";

export const NAV_ITEMS = [
  { href: "/about", label: "About" },
  // …
] as const satisfies readonly NavItem[];
```

### `src/lib/utils/cn.ts` (`reusables`)

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`clsx` and `tailwind-merge` are usually **new** deps — propose adding them, unresolved (`pnpm add clsx tailwind-merge`), and let the package manager pick the version. In a workspace the UI package ships its own `cn`, the same plain `twMerge`.

## The `lib/server` boundary

Its kinds follow the app's shape (`code-structure`), behind its **own** `server-only` barrel, never shared with client-safe code (`api-architecture`).

### The barrel

```ts
// src/lib/server/index.ts — an app with its own backend
import "server-only";

// Each kind barrel below is an explicit list, so this re-export is a composition
// of curated surfaces rather than a wildcard over files.
export * from "./actions";
export * from "./services";
```

`clients/`, `data/`, and `utils/` stay **out** of the top barrel — they are called by the layers above them, not by app code. Exporting them invites a page to query the store directly.

```ts
// src/lib/server/index.ts — a frontend over a separate API
import "server-only";

export * from "./actions";
export * from "./data";

// The identity helpers an entry's guard calls; the fetchers in utils/ stay out
export { getCurrentUser, requireAuth } from "./utils/api.utils";
```

### The vertical slice

One slice, in `api-architecture`'s build order **schema → service → route (or action)**, bodies as `// TODO:`. `data/` is not a step in that order — it is what the service calls. Over an API, the service is the API's, and the slice is schema → API read in `data/` → action.

```ts
// src/lib/schemas/user.schema.ts — the validated shape, written first (its own kind)
import { z } from "zod";

export const UserSchema = z.object({
  displayName: z.string().min(1).max(80),
  bio: z.string().max(500).optional(),
  role: z.enum(["member", "admin"]),
});
export type User = z.infer<typeof UserSchema>;

// A write schema is a .pick() allowlist of the full schema, so a new field is never
// writable until someone names it here.
export const UpdateProfileSchema = UserSchema.pick({ displayName: true, bio: true });
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
```

```ts
// src/lib/server/data/user.data.ts — own backend: store access only; no business rules
import { firestore } from "@/lib/server/clients/firebase";
import { COLLECTIONS } from "./collections.data";

export async function fetchUserById(userId: string) {
  const snapshot = await firestore.collection(COLLECTIONS.USERS).doc(userId).get();
  return snapshot.exists ? snapshot.data() : null;
}
```

```ts
// src/lib/server/data/user.data.ts — over an API: the read, with its caching (nextjs)
import { cacheLife, cacheTag } from "next/cache";
import { fetchFromApi } from "@/lib/server/utils/api.utils";

export async function fetchCurrentUser() {
  "use cache: private";
  cacheLife("frequent");
  cacheTag("user:current");
  // TODO: call the API through the typed fetcher and parse the response with its schema.
  return fetchFromApi("/account/profile");
}
```

```ts
// src/lib/server/services/user.service.ts — the only caller of user.data.ts
import { fetchUserById } from "@/lib/server/data";

export async function fetchUserProfile(userId: string) {
  // TODO: authorize the caller, then map the record to the response shape.
  throw new Error("Not implemented");
}
```

```ts
// src/lib/server/actions/user.action.ts — one file per domain, never one actions.ts
"use server";

import { requireCaller } from "@/lib/server/utils/auth-guard.utils";

export async function updateProfile(input: unknown) {
  const caller = await requireCaller(); // authorize first — actions are reachable by direct POST
  // TODO: parse `input` with the schema, call the service (or the API), update the tag,
  // and answer with the action result rather than throwing.
  throw new Error("Not implemented");
}
```

```ts
// src/lib/server/data/collections.data.ts — every collection path; no literal elsewhere
export const COLLECTIONS = {
  USERS: "users",
  // …
} as const;
```

## Standalone extras: CI, hooks and commitlint

In a monorepo these live once at the root — see [workspace-templates.md](workspace-templates.md).

### CI, hooks, commitlint (`devops`)

```yaml
 # .github/actions/setup/action.yml — one composite setup, reused by every job
 # NOTE: checkout is NOT here. A local composite action is read from the checked-out
 # workspace, so the runner cannot find this file until actions/checkout has run.
 # Each workflow checks out first, then calls this.
name: Setup
description: pnpm + Node, install
runs:
  using: composite
  steps:
    # pnpm before Node, so setup-node's pnpm cache finds the store
    - uses: pnpm/action-setup@<sha> # resolve at scaffold time; reads packageManager
    - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
      with: { node-version-file: .nvmrc, cache: pnpm }
    - run: pnpm install --frozen-lockfile
      shell: bash
```

```yaml
 # .github/workflows/ci.yml — parallel jobs that share nothing; CI checks and never deploys
name: CI
on: { pull_request: {}, push: { branches: [dev, staging, main] } }
permissions: {} # deny-all default; grant per job
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
env:
  APP_ENV: local # plus a placeholder for every secret the env guard requires, so next build passes
jobs:
  format:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions: { contents: read }
    steps:
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
        with: { persist-credentials: false }
      - uses: ./.github/actions/setup
      - run: pnpm check:env
      - run: pnpm audit --audit-level critical # reports every advisory, fails only on a critical
      - run: pnpm lint
      - run: pnpm check-types
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - uses: ./.github/actions/setup
      - run: pnpm build
  # test: the same steps running `pnpm test` — only for the runners chosen in the interview
  # stories: installs Playwright's Chromium (cached on its version), then runs the Storybook tests
```

Third-party actions are SHA-pinned with a version comment — **re-resolve the SHAs at scaffold time** instead of copying the ones above. Deploying is a manual step outside CI (`devops`).

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

## The design-system proof

The smallest end-to-end proof that tokens, tiers, aliases, barrels, and stories are all wired.

### The style layers (`tailwind`)

The tokens are filled in from the starter's own `globals.css` (reshaped in [Editing the scaffolder's files](#editing-the-scaffolders-files)) plus the house token roles. Hex or OKLCH, either way. **(Adire)** The theme file and layers come from the registry install instead, with `[data-mode]` in place of `[data-theme]`.

```css
/* src/styles/globals.css — ramps registered on Tailwind, mapped onto semantic roles
   for light and dark, then exposed as utilities. Components use the roles only. */
@theme {
  --color-primary-500: #2563eb;
  --color-primary-600: #1d4ed8;
  --color-neutral-50: #fafafa;
  --color-neutral-900: #171717;
  /* … each ramp 50–950 */
}

:root {
  --bg: var(--color-neutral-50);
  --text: var(--color-neutral-900);
  --accent: var(--color-primary-600);
  --border: #e5e5e5;
  --radius: 0.625rem;
  /* … */
}

/* Dark mode follows the OS. With a theme toggle the selector narrows to
   :root:not([data-theme="light"]), and the same overrides repeat under [data-theme="dark"]. */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: var(--color-neutral-900);
    --text: var(--color-neutral-50);
    --accent: var(--color-primary-500);
    --border: #2e2e2e;
    /* … */
  }
}

/* `inline` is load-bearing: utilities keep pointing at the live roles, so a mode change
   and any scoped override flow through. Never bake a literal in here. */
@theme inline {
  --color-bg: var(--bg);
  --color-text: var(--text);
  --color-accent: var(--accent);
  --color-border: var(--border);
  --radius-lg: var(--radius);
  /* keep the --font-* mappings the starter generated for its next/font vars */
}
```

```css
/* src/styles/globals.css, continued — base.css under Adire */
@layer base {
  * {
    border-color: var(--color-border);
  }
  body {
    background-color: var(--color-bg);
    color: var(--color-text);
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

### Page composer + section (`code-structure` — one file per section)

```tsx
// src/components/marketing/home/index.tsx — the composer owns the layout wrapper
import { Hero } from "./Hero";

export function HomePageContent() {
  return (
    <main>
      <Hero />
    </main>
  );
}
```

```tsx
// src/components/marketing/home/Hero.tsx — named export, no default
export function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-semibold text-text">{/* … */}</h1>
    </section>
  );
}
```

### Example component, folder-per-component (`reusables`, `naming`)

Each component owns a folder in `src/ui/<tier>/`: `index.tsx` is the component, with its story and a test **only when there is behaviour to assert** beside it — no per-component barrel. In a workspace, build on the shared UI package first and add here only what it lacks.

```tsx
// src/ui/base/Button/index.tsx
/**
 * @description Base button primitive. Renders a native <button>; use Link for navigation.
 */
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

const VARIANT_CLASSES = {
  primary: "bg-accent text-bg hover:opacity-90",
  ghost: "bg-transparent text-text hover:bg-accent/10",
} as const;

const SIZE_CLASSES = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
} as const;

export type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: keyof typeof VARIANT_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
};

export function Button({ variant = "primary", size = "md", className, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className, // merged last so a caller's class wins
      )}
      {...rest}
    />
  );
}
```

```ts
// src/ui/base/index.ts — the tier barrel, one line per component folder
// ("./Button" resolves to the folder's index.tsx)
export { Badge, type BadgeProps } from "./Badge";
export { Button, type ButtonProps } from "./Button";
```

```ts
// src/ui/index.ts — re-exports each tier the app has.
// Each tier barrel is already an explicit list, so re-exporting it is not a wildcard
// over a directory — it is the one place the rule reads as `export *` and means it.
export * from "./base";
export * from "./blocks";
export * from "./layouts";
```

A **compound component ships its parts as separate named exports**, never as static properties (`Accordion.Item`) — a static property defeats tree-shaking through the tier barrels:

```tsx
// src/ui/blocks/Accordion/index.tsx
export function Accordion({ children }: AccordionProps) { /* … */ }
export function AccordionItem({ children }: AccordionItemProps) { /* … */ }
```

### Example story (`storybook`)

```tsx
// src/ui/base/Button/Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Button } from ".";

const meta = {
  title: "Base/Button",
  component: Button,
  args: { children: "Button", onClick: fn() },
  argTypes: {
    variant: { control: "select", options: ["primary", "ghost"] },
    size: { control: "select", options: ["sm", "md"] },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Ghost: Story = { args: { variant: "ghost" } };
export const Disabled: Story = { args: { disabled: true } };
```

`storybook init` writes `.storybook/main.ts` itself — reshape it (see "Files `storybook init` owns" under [Editing the scaffolder's files](#editing-the-scaffolders-files)) rather than writing it from here.

## Demo files to delete

| Starter           | Paths                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-next-app` | `public/next.svg`, `public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg`, `README.md`, the generated `AGENTS.md` + `CLAUDE.md`, `app/favicon.ico` when the project has its own |
| `storybook init`  | its sample `src/stories/` folder (Button/Header/Page + their CSS and MDX) — the house colocates stories instead                                                                                          |

Confirm each path exists before listing it — the templates change between majors, and a DELETE line for a file that is gone is noise in the manifest.

<a id="package"></a>

## The library-package variant (not an app)

When the target is a shared package rather than an app, the two files below replace their app equivalents in [Editing the scaffolder's files](#editing-the-scaffolders-files). Everything else still applies — kinds, barrels, the `<domain>.<kind>.ts` grammar — except there is no `app/`, no route groups, and no `styles/` entry. **Who loads the package decides its form** (`code-structure`, `typescript`).

### `package.json` — a package every consumer bundles (UI, hooks, utils)

```jsonc
{
  "name": "@<scope>/<package>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "sideEffects": false,
  "exports": { ".": "./src/index.ts" }, // TypeScript source; each consumer's bundler compiles it
  "scripts": {
    "check-types": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
  },
}
```

No build step: its tsconfig extends `react-library.json`, and each Next.js consumer lists it in `transpilePackages`.

### `package.json` — a package plain Node loads too (contracts, testing)

```jsonc
{
  "name": "@<scope>/<package>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json", // tsconfig.build.json excludes the specs, so nothing test-only ships
    "check-types": "tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
  },
}
```

Its tsconfig extends `node-library.json`, so NodeNext requires the `.js` extension on relative imports and plain `tsc` emits a `dist/` Node can load — nothing post-processes the output. Rebuild after every change and restart whatever runs from `dist/` (`schemas-and-contracts`). In a workspace the version stays `0.0.0` and the tsconfig extends the shared config package.

### `src/index.ts` + layout

```ts
// The public surface — everything consumers may import. Anything not re-exported is internal.
export * from "./<kind>";
```

`src/<kind>/` folders are kind-first with a barrel each (`code-structure`); no `app/`, no `styles/`. A package that ships components follows the UI package's tiers (`design-system`), ships source, and is compiled by each app's own Tailwind run through its `@source` line.
