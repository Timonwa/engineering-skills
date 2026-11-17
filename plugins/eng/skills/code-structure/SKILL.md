---
name: code-structure
description: >-
  The file and folder structure of a Next.js App Router app — thin page and layout entries, components/ organised by product area, section-based pages composed by an index, a flat kind-first lib/ using the `<domain>.<kind>.ts` grammar, the server folders for each app shape (an app with its own backend, a frontend over a separate API, the API app itself), and where shared code goes in a monorepo. Use when adding or refactoring a page, building a screen, splitting UI, organising lib/ or server code, or deciding whether code belongs in a package.
---

# Code structure — pages, components, lib and server code

Every page is built from small files in predictable places, so a path can be guessed before it is opened. **Never write a page as one large inline file.** The rules for pages, components and `lib/` apply to every app; the server folders depend on the app's shape; the monorepo section applies only when there are packages.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Pages

1. **Thin entries.** `app/**/page.tsx` only imports a composed `…PageContent` and renders it — no markup, data or logic inline. A `layout.tsx` is an entry too: it renders a shell from `ui/layouts/` and passes this app's regions (nav items, footer) in as props. The one thing an entry may hold beyond that is a guard; what the check does and where the real check belongs are `auth`'s.
2. **One file per section.** Split the page into section components — PascalCase, **named export**, one concern each (`Hero.tsx`, `HowItWorks.tsx`, `Pricing.tsx`). Named, not default, so the file name, the export and every import match.
3. **`index.tsx` composes.** It imports the sections and stacks them into a named-exported `…PageContent` that owns the page's layout wrapper.
4. **Sections are self-contained.** A section owns its wrapper and markup; `index.tsx` and the entry only import and stack. Section-local data and constants live with the section, never in the entry.
5. **Extract repeated UI.** Anything two pages share becomes a component with props for what differs; anything every page in a route group shares goes in that group's layout.

## Small, isolated files (≤ ~200 lines)

When a file passes ~200 lines or mixes concerns, **split it**: one file per modal or overlay, one per section, stateful logic into a `use-*.ts` hook. A hook used by exactly one section may sit beside it; a shared one goes in the `hooks` kind. A hook that returns JSX (a provider) is a component file. The orchestrator only composes. As soon as the same UI or logic is used twice, extract one piece — how to build it is `reusables`.

## Where things live

All source sits under `src/`, with the path alias `@/*` → `./src/*`.

| Folder            | Holds                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/app/`        | the files Next.js reads by name and nothing else — no components, data or helpers                                 |
| `src/proxy.ts`    | the request proxy, beside `src/app/`; `src/instrumentation.ts` beside it for startup and error reporting          |
| `src/components/` | the app's pages and features, organised by product area                                                           |
| `src/ui/`         | the app's own shared UI, in the tiers `design-system` defines — only what no package already provides             |
| `src/lib/`        | everything that isn't a component, kind-first (below)                                                             |
| `src/styles/`     | one entry plus one file per layer, never a single growing stylesheet; the layers and their order are `tailwind`'s |
| `src/testing/`    | fixtures, fakes and render helpers shared by the app's tests; how to write them is `testing`                      |
| `public/`         | at the app's root: files served as they are from the site root                                                    |

### `components/`

- **It's organised by product area** — the part of the product a page belongs to, the way you'd name it when saying what you're working on: `auth/`, `marketing/`, `billing/`, `events/`. A route group that is one area (marketing, auth, legal) is one folder; a group that holds many areas, such as a dashboard or a whole admin app, gives each feature its own folder rather than nesting them under the group's name. Inside an area, one folder per page, named and nested the way its URL is, so `billing/plans/` holds the sections of `/billing/plans`.
- **Imports point one way** — `app/` → `components/` → `ui/` → `lib/`; nothing imports from `app/`, and client code never from the server boundary. A lint rule (`import/no-restricted-paths` zones, or `eslint-plugin-boundaries`) enforces it, so a wrong import fails lint rather than review.
- **Framework boundaries group by kind**, not by the route that hosts them: `components/errors/` holds the error, not-found and unauthorised views; `components/guards/` holds client-side gates.
- **`components/_shared/`** holds cross-feature widgets, grouped by concern (`otp/`, `layout/`). Each group has a barrel with one explicit export per file and is imported as `@/components/_shared/<group>`. A **server-coupled component** (its import chain reaches server code) stays out of its group barrel and is imported by path, so a client import of the barrel can never drag server code into the bundle. There is no root `_shared/index.ts`.
- **`components/<area>/_shared/`** holds what one area's pages share.
- **It holds only component `.tsx`**, plus colocated stories and tests, CSS modules where a project uses them, the barrels, and a stub `data.ts` beside the component it feeds while the real source isn't wired. Real static content goes in `lib/data/`. A `const` whose values are React components is UI and lives in a `.tsx`.

### `lib/`

**Strictly kind-first, and flat inside each kind.** Every top-level folder is a _kind_ — exactly one folder per kind, never a domain or feature folder at the `lib/` root, never a mini `hooks/` or `types/` rebuilt inside a feature, no loose files at the root. **The domain is a filename prefix, not a subfolder**: `constants/auth.constant.ts`, not `constants/auth/index.ts`.

| Kind         | Grammar                | Holds                                                                                    |
| ------------ | ---------------------- | ---------------------------------------------------------------------------------------- |
| `config/`    | bare names             | one-per-app settings: `env`, `routes`, `endpoints`, `site`                               |
| `constants/` | `<domain>.constant.ts` | frozen domain values; the const and its inferred type together                           |
| `data/`      | `<domain>.data.ts`     | static content records — pricing tiers, FAQs, team                                       |
| `hooks/`     | `use-<subject>.ts`     | one hook per file, named for what it gives you                                           |
| `schemas/`   | `<domain>.schema.ts`   | Zod schemas with their inferred types, in the same file                                  |
| `seo/`       | bare names             | the app's metadata factory and structured-data builders; what goes in is `seo-aeo-geo`'s |
| `types/`     | `<domain>.type.ts`     | shapes with no const or schema behind them                                               |
| `utils/`     | `<domain>.utils.ts`    | pure helpers; a single-function file may keep a bare name (`cn.ts`)                      |

- **`schemas/`, `constants/` and `types/` each own their inferred type.** `types/` holds only what neither a schema nor a const produces; re-declaring one there is how the kinds drift. How schemas are written is `schemas-and-contracts`'.
- **Every kind has a barrel with one explicit export line per file** (`@/lib/<kind>`), never `export *` from a directory — a wildcard hides what joined it.
- **The `config/` barrel is server-only**, because it re-exports `env`, which reads secrets. Client code imports the one file it needs by path (`@/lib/config/routes`); a lint rule or type check won't catch the barrel, the build will.
- **Never create an empty kind.** Add a kind when its first file exists.
- **No hardcoded paths.** Page paths come from `config/routes.ts`, API paths from `config/endpoints.ts`. Both are objects grouped by area, never one flat map: `routes.ts` by route group, `endpoints.ts` by the backend's own resource. A path with a parameter is a function inside its group, so no caller concatenates, and the API version is one constant the endpoints are built from. Typing the routes is `typescript`'s.

### Growing a kind

- **A domain that outgrows one file becomes a folder inside its kind**, and the files inside carry only the concern, because the folder already names the domain. An `index.ts` re-exports them, so callers import the domain, never its parts:

  ```txt
  services/
    user.service.ts              one concern, stays a file
    event/                       outgrew one file
      crud.service.ts            not event-crud.service.ts
      publishing.service.ts
      index.ts
  ```

  Start flat; split past ~200 lines or when two concerns change for different reasons.

- **A kind whose files pile up groups them by what a reader scans for**, which for some kinds is a concern rather than a domain. `hooks/` groups as `auth/ data/ profile/ ui/`, because nobody looks for "the event hook", they look for "the hook that closes a menu". Concerns split where they change for different reasons: "are you signed in" and "may you do this" are two groups. Flat while a listing is still scannable at a glance, grouped past that.

## Server code, by app shape

Server-only code sits behind one boundary with its own barrel marked `server-only`, kind-first and flat inside, like the rest of `lib/`. **Never share a barrel between server-only and client-safe code** — a client importing a mixed barrel drags server code into the bundle or fails the build. Everything outside the boundary is client-safe; mark browser-only entry points `client-only`. Which kinds the boundary holds depends on where the app's data comes from.

### An app with its own backend

One Next.js app that talks to its database and services itself. The boundary is `lib/server/`:

| Kind        | Grammar               | Holds                                                                  |
| ----------- | --------------------- | ---------------------------------------------------------------------- |
| `actions/`  | `<domain>.action.ts`  | Server Actions by domain — never one giant `actions.ts`                |
| `services/` | `<domain>.service.ts` | business logic; the only caller of `data/`                             |
| `data/`     | `<domain>.data.ts`    | store access only — plus the collection-path registry and batch writer |
| `clients/`  | `<service>.client.ts` | one configured SDK singleton per external service                      |
| `utils/`    | `<domain>.utils.ts`   | server-only helpers: the guard, response builders, logger, errors      |

The barrel exports `actions` and `services`. `clients/`, `data/` and `utils/` are called by the layers above them, and exporting them invites a page to query the store directly.

### A frontend over a separate API

An app that reads and writes only through an API it doesn't contain — a sibling API app, or an external backend. The boundary is `lib/server/`, and it holds no business logic:

| Kind       | Grammar              | Holds                                                              |
| ---------- | -------------------- | ------------------------------------------------------------------ |
| `actions/` | `<domain>.action.ts` | Server Actions by domain, each calling the API                     |
| `data/`    | `<domain>.data.ts`   | the API reads, with their caching; how they cache is `nextjs`'     |
| `utils/`   | `<domain>.utils.ts`  | the typed fetchers, the session helpers, the action-result builder |

The barrel exports `actions` and `data`, plus the identity helpers an entry's guard calls. The fetchers stay out: actions and reads call them, app code never does.

### The API app

A Next.js app that only serves the API. The whole app is server code, so the boundary is `src/server/`, not `lib/server/`:

| Kind        | Grammar               | Holds                                                  |
| ----------- | --------------------- | ------------------------------------------------------ |
| `services/` | `<domain>.service.ts` | business logic; the only caller of `data/`             |
| `data/`     | `<domain>.data.ts`    | store access only                                      |
| `clients/`  | `<service>.client.ts` | one configured SDK singleton per external service      |
| `guards/`   | `<name>.guard.ts`     | the auth, permission and resource checks a route calls |
| `utils/`    | `<domain>.utils.ts`   | response builders, errors, logger, cookies             |

The barrel exports `services` and `guards` only, so a route can never reach `data/` or a client. The route order and the guards themselves are `api-architecture`'s. The app's other kinds (`config/`, `constants/`, `schemas/`) sit at `src/` beside `server/`.

- **A client is not a util, a config or a query.** A configured SDK singleton holds a live connection, so it gets its own kind. A client that outgrows one file becomes a folder (`clients/redis/` with `client.ts`, `keys.ts`, `locks.ts`).
- **Server Actions group by domain in separate files**; the shared action-result type lives in its own file.

## In a monorepo

Skip this section for a single app.

- **Consumer count decides placement.** Code two or more apps use becomes a workspace package (`packages/ui`, `packages/hooks`, `packages/utils`, a shared schemas package); code one app uses stays in that app's `lib/`. Promote on the second consumer, never before — you can't know something is shared until a second app asks, and promoting is a file move plus an import swap. Hoisting early is the more expensive mistake: every sibling app then rebuilds for changes it doesn't care about.
- **A package sits beside the app's own folder; it doesn't replace it.** Each app keeps its full kind-first `lib/` and its own `src/ui/` for what only it uses. A package keeps the same `<domain>.<kind>.ts` grammar as the in-app kind.
- **A package ships source or builds to `dist/`.** It ships TypeScript source when every consumer's bundler compiles it (UI, hooks, utils for Next.js apps). It builds to `dist/` when plain Node loads it as well as bundlers, such as a schemas package that serverless workers import too; then every consumer reads the build, with NodeNext resolution. A `dist/` package is rebuilt after every change, and anything running from it restarts.
- How the workspace, the catalog and the task graph are set up is `monorepo`'s.

## Next.js placement

Every file Next.js reads by name — route files, metadata files, the ones beside `app/` — and the house content of each, with the entry examples, is in [references/next-files.md](references/next-files.md).

- **`app/` holds no private folders.** Next allows `_components/` there, but the house puts route-local pieces in `components/` under the page's folder, so `app/` reads as the URL map and nothing more.
- **Special files sit beside their segment** — `loading`, `error`, `not-found`, `template` — except `global-error`, which sits only in `app/` and renders its own `<html>` and `<body>`.
- **A modal or drawer with its own URL** is a search param when it only needs to survive a reload, and a parallel slot plus an intercepting route when it's also a page of its own; every slot has a `default.tsx`.
- **A route group that needs a URL prefix keeps a real segment inside it.** `(auth)/auth/`: the parentheses buy the shared layout, the inner folder buys the `/auth` prefix. A group that only groups (`(marketing)`, `(legal)`) has no inner segment, because its pages sit at the root of the URL.
- **A route never repeats its app's name.** One app holding every area divides them by URL: main pages at the root, `/dashboard/...` and `/admin/...` for the other areas. Where each area is its own app, the app already is the area, so its pages sit at the root — the admin app's users page is `/users`, not `/admin/users`. Only an API keeps its prefix (`/api/v1/...`).

## Checklist before finishing

- [ ] Each `page.tsx` is ~3 lines (import + render) and each `layout.tsx` renders a shell; neither holds more than a guard.
- [ ] `app/` holds only files Next.js reads by name; every parallel slot has a `default.tsx`.
- [ ] Imports point one way, enforced by a lint rule.
- [ ] Every visual section is its own file with a named export, composed by `index.tsx`.
- [ ] `components/` is organised by product area, pages nested as their URLs are, and holds only `.tsx` (plus colocated stories, tests and an approved stub).
- [ ] `lib/` is kind-first and flat inside each kind, files named `<domain>.<kind>.ts`, every kind barrel one explicit export per file.
- [ ] Nothing in `types/` re-declares a type a schema or constant already infers.
- [ ] Server code sits behind the boundary for this app's shape, and its barrel exports only the layers app code may call.
- [ ] Client code imports config files by path, never the `config/` barrel.
- [ ] In a monorepo, nothing moved into a package before its second consumer.

## Related skills

- Names of files, symbols and suffixes → `naming`.
- UI tiers and how components are organised in them → `design-system`; building one reusable → `reusables`.
- The `"use client"` boundary, data fetching and caching → `nextjs`.
- Where the auth check belongs → `auth`.
- Reviewing a codebase against this skill → `conventions-audit`.
