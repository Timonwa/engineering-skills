---
name: typescript
description: Use when writing or reviewing TypeScript — typing code, designing types, configuring tsconfig, typing Next.js routes, or fixing type errors. Enforces strict, inference-first TypeScript 7 — no any or unsafe casts, discriminated unions, satisfies, utility types, erasable syntax only, tsconfig presets chosen by who resolves the imports, and typed routes. Zod schemas live in `schemas-and-contracts`; identifier naming in `naming`.
---

# TypeScript

Strict, inference-first TypeScript. Types are documentation the compiler checks — make illegal states unrepresentable.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Non-negotiables

- **`strict: true`, always.** Never disable strict or a rule to make something pass.
- **No `any`.** Take `unknown` at boundaries and narrow; reach for a generic before `any`.
- **No unsafe casts.** No `as` to launder unknown data into a type, no non-null `!` to silence the compiler — narrow or fix the type. `as const`, and `as` for a narrowing you can prove, are fine.
- **Infer internally, annotate boundaries.** Annotate function parameters, exported return types and public APIs; let locals infer.
- **Data crossing a boundary is typed by its schema**, never by a hand-written type beside it. How the schemas are written is `schemas-and-contracts`'.

## Designing types

- **`satisfies`** checks a value against a type while keeping its literal type (config objects, lookup maps); a plain annotation widens it.
- **Discriminated unions** for one of several shapes (`{ status: "ok"; data } | { status: "error"; message }`); narrow on the discriminant and check the default is `never`.
- **`as const`** for literal, read-only data; derive the union from it (`type Status = (typeof STATUSES)[number]`).
- **Utility types** over hand-rolled ones: `Pick`, `Omit`, `Partial`, `Required`, `Record`, `ReturnType`, `Awaited`. Compose, don't duplicate.
- **Generics** with constraints (`<T extends …>`); don't over-generalise.
- **`type` over `interface`**, which composes, unions and infers; use `interface` only for declaration merging or `implements`.
- **Errors are `unknown`** — `catch (error: unknown)` and narrow (`instanceof Error`, a schema parse) before touching one.
- **Branded types** for ids where mixing two up is a real risk (`type UserId = string & { readonly __brand: "UserId" }`) — not for everything.
- **`NoInfer<T>`** locks an inference site so a second argument can't widen what the first inferred.
- **Template-literal types** for string grammars the compiler can check (`` type CacheTag = `${Entity}:${string}` ``).

## Erasable syntax only

Every file must run by deleting its types — Node runs `.ts` that way natively, and single-file transpilers (SWC, esbuild) compile each file on its own. Node's TypeScript docs recommend two compiler options for it:

- **`erasableSyntaxOnly: true`** refuses the features that generate code: `enum`, a `namespace` with values, parameter properties (`constructor(private name: string)`), `import =`. Use an `as const` object with a derived union instead of an enum, and an explicit field assigned in the constructor instead of a parameter property.
- **`verbatimModuleSyntax: true`** keeps every import exactly as written, so a type-only import must say so (`import type { User }`, or `import { save, type User }`). A tool that strips types per file can then drop it safely.

Turning them on in an existing codebase: the first passes as soon as no file uses the four features; the second needs type-only imports marked, which `@typescript-eslint/consistent-type-imports` fixes automatically.

## tsconfig presets

**Who resolves a workspace's imports decides its module settings**, so a monorepo keeps one shared preset per kind of consumer, never one setting for every package. A wrong choice builds cleanly and fails at import time.

| Preset          | For                              | Module settings                                                                                   |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `base`          | everything; the others extend it | `strict`, `noUncheckedIndexedAccess`, `isolatedModules`, `skipLibCheck`, a `target`               |
| `nextjs`        | a Next.js app                    | `module: "ESNext"`, `moduleResolution: "Bundler"`, `jsx: "preserve"`, `noEmit`, the `next` plugin |
| `react-library` | a package every consumer bundles | `module: "ESNext"`, `moduleResolution: "Bundler"`, `jsx: "react-jsx"`                             |
| `node-library`  | a package plain Node loads       | `module: "NodeNext"`, `moduleResolution: "NodeNext"`                                              |

- **`NodeNext` requires the `.js` extension on relative imports** (`import { x } from "./x.js"`). That's the ESM spec, and it's what makes plain `tsc` output loadable by Node.
- **An app's own `tsconfig.json`** extends its preset and adds the path alias (`"@/*": ["./src/*"]`). Add a second alias only with a reason.
- **Strictness worth adopting knowingly:** `noUncheckedIndexedAccess` (indexed access yields `T | undefined`) is in the base; `exactOptionalPropertyTypes` (`?:` no longer accepts an explicit `undefined`) is a project's choice.
- **A Next.js app type-checks with `next typegen && tsc --noEmit`,** because typed routes and `PageProps`/`LayoutProps` come from Next's generated types.
- **When the linter's TypeScript parser lags a major version,** alias the linter package's own `typescript` dependency to the last major it supports, record why in the lint config's docs, and remove the alias once the parser catches up. Lint and the compiler then check with slightly different versions, so the compiler stays the authority.

## Typed routes

With `typedRoutes: true` in `next.config`, Next checks every `href` against the app's real pages.

- **Each app declares its own `RouteTable` type in its routes file** and ends the table with `} as const satisfies RouteTable`. `Route` is a real union of pages only inside an app, where Next's generated types declare it; in a shared package it is a stub that accepts any string, so a shared `RouteTable` would check nothing.

  ```ts
  import type { Route } from "next";

  type RouteTable = {
    [key: string]: Route | RouteTable | ((...args: never[]) => string);
  };

  export const ROUTES = {
    home: "/",
    events: {
      root: "/events",
      detail: (eventId: string): `/events/${string}` => `/events/${eventId}`,
    },
  } as const satisfies RouteTable;
  ```

- **A path with a parameter is a function typed by its template** (`` `/events/${string}` ``), never a bare `Route`: `Route` excludes dynamic routes, so a `Link` fed a bare `Route` from a function would stop being checked.
- **Type a nav item's `href` as `Route`**, so every navigation link is checked when it compiles.
- **Never `as Route` on a literal** — the cast accepts a path that no longer exists, while `satisfies` fails the build. Keep `as Route` for a path known only at runtime (a `returnTo` read from the URL, a path the API sends), with a comment saying which.

## Avoid

- `any`, unsafe `as`, non-null `!` to silence errors, and `@ts-ignore`. Use `@ts-expect-error` with a reason only when truly unavoidable.
- `enum`, namespaces with values and parameter properties — `erasableSyntaxOnly` refuses them.
- A hand-written type that duplicates a schema or an already-inferred shape.

## Related skills

- Zod schemas, write and read shapes, and the shared contracts package → `schemas-and-contracts`.
- Names of types, schemas and generics → `naming`.
- Where route and endpoint files live → `code-structure`.
- Reviewing a codebase against this skill → `codebase-audit`.
