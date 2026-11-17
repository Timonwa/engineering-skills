---
name: scaffold-feature
description: >-
  Scaffolds one feature slice inside an existing app — schema, the store's paths, indexes and rules, the server layer for the app's shape, page and components with their error and not-found states, skeletons, stories and tests — with paths and helpers read from AGENTS.md and the code. Plans the file list first, writes compile-ready stubs with TODOs, and never invents business logic. Use when asked to scaffold or spin up a feature, endpoint, page, CRUD slice, schema or hook.
argument-hint: "[feature-name] [scope hints]"
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(ls:*), Bash(pnpm:*), Bash(npx:*)
---

# Scaffold feature

Creates one feature's files in the right places with the right imports from day one. This skill only sequences the work: every convention comes from the skill that owns that layer, and every fact (paths, aliases, helper names) from the project's `AGENTS.md` and its code.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[feature-name]` — the feature or resource, e.g. `notifications`.
- `[scope hints]` — a subset or context: `api only`, `page + action`, `schema`, `hook`, `component`, or which app in a workspace. Omitted → plan the full slice and confirm its scope in the plan.

## Guardrails

- **Plan before files.** Present the full list of files to create and modify, and wait for approval.
- **The skills set the shape; the code supplies the facts.** Read two or three neighbouring features for real paths, aliases and which helpers exist, and take the dominant pattern. Where they disagree with each other or with an owning skill, follow the skill and say so in the plan — copying drift multiplies it once per feature.
- **Stubs only.** Compile-ready bodies with `// TODO:` markers; never invent business logic, copy or a data model the owner didn't describe.
- **Use what exists.** Helpers and hooks come from the project's packages first — including the house packages where the project uses them — then its own `lib/`. A new one is written only after checking they lack it.
- **No new dependency without approval.** A feature that needs a package lists it in the plan.
- **Never commits** — committing is `ship-changes`'.

## Step 0 — Orient

From `AGENTS.md` and the code: single app or workspace, and **the app's shape** — an app with its own backend, a frontend over a separate API, or the API app itself (`code-structure`). Also: where schemas live (the app's `lib/schemas/` or a shared contracts package), whether Storybook and tests exist, and which route group or area the feature belongs to.

## Step 1 — Plan the slice

The slice follows the app's shape:

| Shape                       | The slice                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| An app with its own backend | schema → store files → service → data → Server Action (or route) → page and components   |
| A frontend over an API      | schema (or the contract's) → API read in `data/` and Server Action → page and components |
| The API app                 | schema → store files → service → data → route, with its docs entry                       |

A scope hint can cut it down. Present the plan: each file with a one-line purpose, the files modified (barrels, route and endpoint constants, the docs registry, the store's index and rules files, the navigation), and any package the feature needs. Wait for approval.

## Step 2 — Schema

Per `schemas-and-contracts`: the full schema with its inferred type, a `.pick()` write schema, a partial-update schema built so omitted fields keep their values, and a list projection if the feature lists things. **Placement by consumer count** — the app's own `lib/schemas/` while one app uses it; the shared contracts package only once a second does.

## Step 3 — The store

When the feature stores data (own backend, API app), its store files are part of the slice, never a follow-up:

- **The path** — the collection name or path builder added to the shared constants (`COLLECTIONS` or the project's equivalent), never a literal in the data file.
- **The indexes** — an entry in the committed index file for every query the data file runs that filters and orders, or filters on more than one field (`firestore`). A query without its index fails in production, not in the emulator.
- **The rules** — the collection's entry in the security rules: deny-all when every read and write goes through the API, otherwise the ownership and membership checks the guard makes (`access-control`).
- **A SQL store** gets a migration file instead, with its indexes in it.

## Step 4 — The server layer

Per `api-architecture` and `nextjs`, for the app's shape:

- **Service and data** (own backend, API app) — one service file per resource holding the business logic, the only caller of its `data/` file; typed errors, no transport concerns.
- **Route** (API app) — the house route order, a guard, a rate limit, a docs entry (`openapi-registry`) and a colocated `route.test.ts`, in the same change.
- **API read** (frontend over an API) — a `data/` read through the project's typed fetcher, cached per `nextjs`.
- **Server Action** — validates with the schema and answers with an action result, never a thrown error; every mutation calls `updateTag` on what it changed, which re-renders the route and clears the client cache (`nextjs`). In an app with its own backend the action checks the caller itself; over a separate API, the API's guard is the real check (`access-control`).

## Step 5 — Page and components

Per `code-structure`: the route constant first, then a thin `page.tsx` in the right group or area rendering a `…PageContent`, sections one per file in the feature's product-area folder, and client parts isolated in small `"use client"` leaves. Anything that waits on data gets a `<Component>Skeleton` and its own `<Suspense>`. Metadata matches the audience — public pages indexable, signed-in pages noindex (`seo`).

- **A detail route** calls `notFound()` when the resource doesn't exist or the caller can't see it, and its segment gets an `error.tsx` rendering the app's error view (`code-structure`).
- **A page people reach from the menu** gets its navigation item; a public one, its sitemap entry (`seo`).
- **A feature released gradually** sits behind a flag, checked on the server (`feature-flags`).

## Step 6 — Stories and tests

- **A new reusable component ships its story** in the same change (`storybook`).
- **Tests per `testing`:** a spec beside each new service, data module, action, route and hook, covering the success path and each refusal as `// TODO:` cases; only the I/O boundaries are mocked.

## Step 7 — Verify and hand off

Run the project's type check and the test suites the slice reaches, and report the real output. Then list every file created or modified, and keep only the follow-ups that apply:

- rate limits on sensitive operations, audit logging on privileged ones, and a permission registered for a gated route (`api-architecture`, `audit-log`, `access-control`);
- the rules and indexes deployed before the code that needs them;
- the schema moved to the contracts package if a second consumer appears;
- the page in the area whose layout carries the right gate;
- every `// TODO:` left to implement.

## Output

In chat: the approved plan, the files created and modified, the type-check and test output, and the remaining TODOs. Nothing committed; that's `ship-changes`'.

## Boundaries

- **Features inside an existing app only.** A new project is shaped first by `scaffold-app`.
- **Never implements business logic** — it scaffolds the shape and stops.
- Owning skills: placement `code-structure` · API layer `api-architecture` · caching and actions `nextjs` · schemas `schemas-and-contracts` · the store's files `firestore` · names `naming` · components `reusables` · stories `storybook` · tests `testing` · permissions `access-control`. Framework or major-version moves → `migrate`.
