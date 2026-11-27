---
name: naming
description: Use whenever naming or renaming anything — code (functions, hooks, components, variables, booleans, types, Zod schemas, constants, files), test files and fixtures, API paths, JSON and stored fields, enum values, collections, error codes, analytics events, CSS classes, design tokens and assets. Enforces descriptive, verb-first, ownership-revealing names with the house casing, the `<domain>.<kind>.ts` file suffixes, and structured patterns. Apply when writing new code, creating assets/tokens, reviewing names, or refactoring.
---

# Naming

Every name says **what the thing does and what it belongs to** — never vague, never cryptic. A reader should know a symbol's job from its name alone.

**Principles:** every name is **predictable · consistent · scalable · scannable · unambiguous.**

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Golden rules

- **Descriptive over terse.** Full words: `createGeminiClient`, not `getGemini`; `currentUser`, not `usr`. Never `data`, `item`, `temp`, `val`, `next`, `target`, `source` or `handle` on their own, and no cryptic abbreviations (`btn`, `qty`) — `i` in a tight loop is the one exception.
- **File name = export name = usage.** One canonical name per symbol, everywhere — never rename on import (`import X as Y`).
- **Ownership.** A symbol one feature uses carries that feature's name (`UpdatePasswordOutcome`, not `UpdateOutcome`); only genuinely shared symbols keep a bare generic name.
- **Never shadow a dependency.** A wrapper around a library function is named for what it adds, not a near-copy of the original (`sendVerificationEmailIfUnverified`, not `sendEmailVerification`). Two names that differ by a letter send readers to the wrong one.
- **The project's spelling.** Identifiers, routes and product nouns follow the spelling the project records (British or American); a name the platform or a dependency fixes keeps the platform's spelling.
- **Casing.** `camelCase` for variables, functions, props and hooks; `PascalCase` for components and types; `UPPER_SNAKE_CASE` for constants; `kebab-case` for files, folders and CSS classes, with the component-file exceptions under [Files and folders](#files-and-folders).
- **Every name, everywhere.** These rules cover tests, fixtures, fakes and scripts exactly as they cover production code; a test helper named `data` is as unclear as a service named `data`.

## Functions — verb first

Lead with the verb that names the action, then the subject:

| Prefix                                  | Meaning                         | Example                      |
| --------------------------------------- | ------------------------------- | ---------------------------- |
| `get`                                   | sync / local read or derive     | `getUserId`, `getFullName`   |
| `fetch`                                 | async / remote (network) read   | `fetchCurrentUser`           |
| `create` / `update` / `delete` / `save` | mutations                       | `createEvent`, `deleteAlbum` |
| `build` / `make`                        | construct an object/config      | `buildMetadata`              |
| `format` / `<x>To<y>`                   | transform; state input → output | `formatIsoToString`          |
| `parse`                                 | string → structured             | `parseFrontmatter`           |
| `require`                               | a guard that throws or refuses  | `requireSession`             |
| `handle`                                | internal event handler          | `handleSubmit`               |
| `on`                                    | event **callback prop**         | `onOpenChange`               |

`get` vs `fetch`: `get` is synchronous or local; `fetch` crosses the network. Never call a network read `getUser`.

## Hooks — `use` + subject/behaviour

`useCurrentUser`, `useClickOutside`, `useMountTransition`. The name states what it gives you or does.

## Booleans — read as assertions

Prefix with `is` / `has` / `are` / `can` / `should` / `will`: `isOpen`, `hasAccess`, `canEdit`, `shouldRender`. Applies to variables, props, refs (`isInFlightRef`) and boolean-returning functions (`isValidEmail`).

## Unused values

An intentionally unused parameter or variable starts with an underscore (`_request`). A stub signature is a contract, and `^_` is the pattern the linter ignores, so the underscore says "unused on purpose" instead of a disabled rule.

## Components — PascalCase noun phrase

Name for what it renders: `SearchInput`, `UserCard`, `EmptyState`. A feature's own components carry the feature's name, so two features never ship a bare `Hero` each (`PricingHero`). A component's props type is `<Component>Props`; a page component is `<Page>PageContent`.

## Types, schemas, constants

- **Component props** → `Props` suffix (`ButtonProps`) — and only component props; a non-prop type never takes `Props`.
- **Zod schema (the value)** → `Schema` suffix (`UserSchema`); the inferred type takes the clean name (`type User = z.infer<typeof UserSchema>`), in the same `<domain>.schema.ts` file.
- **Inferred / domain / union types** → clean PascalCase noun, **no `Type` suffix** (`User`, `EventStatus`).
- **Constants** → `UPPER_SNAKE_CASE` (`EVENT_STATUSES`); an `as const` union's type stays a clean noun (`EventStatus`).
- **Generic type params** → a lone `T`, or descriptive `T`-prefixed names (`TItem`, `TResponse`) once a signature has more than one.

## Files and folders

- **Component and story files in an app** — `PascalCase`, matching the primary export: `SearchInput.tsx`, `SearchInput.stories.tsx`, `Hero.tsx`.
- **Component and story files in a shared UI package** — `kebab-case` (`search-input.tsx`, `search-input.stories.tsx`) when the package is built on a base library installed from a registry. The registry writes kebab-case files, and matching it keeps every reinstall from renaming files.
- **Everything else** — `kebab-case`, matching the primary export's concept. Framework-mandated names (`page.tsx`, `layout.tsx`, `proxy.ts`) keep their own convention.
- **A `lib/` file carries its kind as a suffix — `<domain>.<kind>.ts`, singular.** The folder names the kind and the filename repeats it so an import line stands alone: `auth.constant.ts`, `nav.type.ts`, `plan.data.ts`, `string.utils.ts`, `user.schema.ts`, and on the server `user.action.ts`, `user.data.ts`, `user.service.ts`, `redis.client.ts`, `require-session.guard.ts`. Two exceptions: `config/` uses bare names (`env.ts`, `routes.ts`, `site.ts` — one per app, so a suffix adds nothing), and a single-function util may keep a bare name (`cn.ts`).
- **Hooks are the one kind whose grammar is a prefix** — `use-<subject>.ts` (`use-click-outside.ts`), because `use` is what makes it a hook.
- **The domain is a filename prefix, never a subfolder.** `utils/seo.utils.ts`, not `utils/seo/index.ts`. When a domain outgrows one file, where its folder goes is `code-structure`'s.
- **Folders** — `kebab-case`, except a component's own folder in an app, which is `PascalCase` matching the component (`ui/blocks/HeroSection/`).
- Code files are named for their **primary export**; the `[type]-[name]-[variant].[ext]` pattern is for assets and tokens (`icon-arrow-left.svg`), not code.

## Tests

| File                    | Holds                                                                          | Example                       |
| ----------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| `<name>.test.ts(x)`     | the spec, beside the unit it tests                                             | `string.utils.test.ts`        |
| `<domain>.fixture.ts`   | builders for sample records                                                    | `user.fixture.ts`             |
| `<service>.fake.ts`     | a working in-memory stand-in for a dependency                                  | `firestore.fake.ts`           |
| `<service>.mock.ts`     | a stand-in that returns set values and records calls, where a fake is overkill | `firebase-auth.mock.ts`       |
| `__mocks__/<module>.ts` | the test runner's manual mock for a whole module, mirroring its import path    | `__mocks__/@upstash/redis.ts` |

Builders and fakes follow the function rules: `buildUser`, `createFirestoreFake`. What to fake and when is `testing`'s.

## Routes, env and keys

- **Route segments** — `kebab-case` (`/forgot-password`); dynamic params `camelCase` (`[userId]`). Where the paths live is `code-structure`'s.
- **Env vars** — `UPPER_SNAKE_CASE`; what may take the `NEXT_PUBLIC_` prefix is `env`'s.
- **Cache tags** — from one central `CACHE_TAGS` const, `entity:id` grammar (`user:123`).
- **Redis keys** — from the key-builder catalogue; the grammar is `redis`'s.
- **Branches** — `type/short-kebab-description` (`feat/`, `fix/`, `docs/`); the rest of the git flow is `ship-changes`'.

## Data, the wire and errors

- **API paths** — plural, `kebab-case` resource nouns (`/api/v1/events/{eventId}/ticket-types`); a verb appears only as a state-transition sub-route (`/publish`). Route structure is `api-architecture`'s.
- **JSON and stored fields** — `camelCase`, the same name in the store, on the wire and in the type, so no layer translates between them.
- **Field grammar:**
  - a timestamp ends in `At` (`createdAt`, `publishedAt`); a calendar date with no time ends in `Date` (`startDate`);
  - a number with a unit names it (`durationSeconds`, `sizeBytes`, `amountMinor` beside `currency`);
  - an id ends in `Id` (`ownerId`), a count in `Count` (`attendeeCount`), and a list is plural (`tags`, `memberIds`);
  - a boolean follows the boolean rules (`isPublished`).
- **Stored enum values** — lowercase `snake_case` strings (`pending_payment`), never display text and never renamed once stored: the label the UI shows lives in a separate map.
- **Collections and tables** — plural nouns (`events`, `teamMembers`), from one constants file; a document id is never a display value.
- **Errors** — a class is `<Situation>Error` (`NotFoundError`, `RecentSignInRequiredError`); the `code` clients branch on is `UPPER_SNAKE_CASE` (`RATE_LIMITED`) and, like an enum value, never changes once shipped.
- **Analytics events** — `object_action` in `snake_case`, past tense, from one catalogue constant (`event_published`, `ticket_purchased`); their properties are `snake_case` too, matching what analytics tools expect. One name per action across every app, or the funnels split.

## CSS classes

`kebab-case` (`page-hero`, `section-eyebrow`, `btn-primary`). Hand-authored class names are never prefixed; how they're defined is `tailwind`'s.

## Design tokens

Two kinds, named for what they hold. **Ramps** name the hue and step (`--color-brand-600`, `--color-neutral-50`); **roles** name the job, never the value, and are what components use — `--surface`, `--foreground`, `--muted-foreground`, `--border`, `--primary`, `--on-primary`, exposed to Tailwind as `--color-surface` and used as `bg-surface`, `text-muted-foreground`. A state is a suffix (`--primary-hover`). Defined in CSS (`tailwind`).

## Assets

`kebab-case` with a typed prefix so they group and scan:

- **UI icons** — `icon-[name]-[size]` (`icon-search-24`). The `[name]` is always present, which keeps these clear of the brand `icon.svg` / `icon-dark.svg` below: a bare `icon` or `icon-<variant>` is the brand symbol, `icon-<name>-<size>` is an interface glyph.
- **Illustrations** — `illust-[scene]-[variant]` (`illust-empty-cart-dark`).
- **Brand logo** — `logo[-variant]` is the symbol plus the name; `icon[-variant]` is the symbol on its own: `logo.svg`, `logo-dark.svg`, `logo-cream.svg`, `icon.svg`, `icon-light.svg`. The bare name is the default; **the suffix is the colour of the artwork, never the background it sits on** — mixing the two readings inverts half the usages. Named brand colours are legitimate variants (`logo-cream`).
- **Other** — `[type]-[name]-[variant].[ext]`.

Ship logos and symbols as **SVG**; add a PNG only where a raster is required (email, social cards, an OS icon), with the same stem. Favicon and app-icon files are not brand assets — in Next they are metadata files in `app/` (`favicon.ico`, `icon.svg`, `apple-icon.png`) and keep the framework's required names.

> **Audit:** review this domain on demand with `conventions-audit` (see `audit-all` for the whole suite).

## Related skills

**This skill sets the rules and never writes an audit report.** An audit of this area is `/conventions-audit`, written from its own template. Run it rather than writing a report from here.
