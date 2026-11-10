---
name: schemas-and-contracts
description: >-
  Zod schemas at every boundary and the shared contracts that hold them — write schemas as `.pick()` allowlists, partial updates that keep omitted fields, tolerant reads of stored data, list projections, safe shared primitives, and building a contracts package. Use when adding a field, a request body, a form schema, an enum, a list shape or a shared type.
---

# Schemas and contracts

A shape that crosses a boundary — a request body, a stored document, an API response, a worker's trigger, a form — is defined **once**, as a Zod schema, and every side imports it. One schema is both the runtime parser and, through `z.infer`, the type, so the API's validation, the form's validation and the frontend's types can't disagree.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Zod is the source of truth

- **Declare the schema, then its inferred type directly beneath it**, in the same file: `export const UserSchema = …` then `export type User = z.infer<typeof UserSchema>`. A hand-written type beside a schema is a second definition that drifts. Never pool the types at the bottom of the file.
- **Zod 4 string formats are top-level** — `z.email()`, `z.uuid()`, `z.url()`; the chained `z.string().email()` forms are deprecated.
- **Compose, don't repeat.** Derive related shapes from one base with `.pick()`, `.extend()` and `.partial()`, so a field changes in one place.
- **Limits are constants.** `.min()` and `.max()` read `UPPER_SNAKE_CASE` constants that the UI's hints read too, never magic numbers.

## Write schemas

- **A write schema is a `.pick()` allowlist of the full schema** — the fields a caller may set, named one by one. It fails closed: a field added to the document isn't writable until someone adds it to the pick. Never derive a write schema with `.omit()`, which lets every new field through.
- **A partial update goes through a helper that removes defaults.** `.partial()` keeps each field's `.default()`, so a PATCH that omits a field gets the default filled in and written — resetting a value the caller never touched. Unwrap the defaults first:

  ```ts
  // shared.schema.ts
  export function stripDefaults<T extends z.ZodRawShape>(shape: T) {
    return Object.fromEntries(
      Object.entries(shape).map(([key, field]) => [
        key,
        field instanceof z.ZodDefault ? field.unwrap() : field,
      ]),
    ) as { [K in keyof T]: T[K] extends z.ZodDefault<infer U> ? U : T[K] };
  }

  export const UpdateUserSchema = z
    .object(stripDefaults(UserSchema.pick({ displayName: true, phoneNumber: true }).shape))
    .partial();
  export type UpdateUser = z.infer<typeof UpdateUserSchema>;
  ```

- **What a caller sends is always exact.** Unknown keys are dropped, every value is validated, and nothing tolerant applies to input.

## Read schemas

- **A stored document is read with a tolerant schema, and written with an exact one.** Data at rest outlives the code that wrote it: a list of enum values can hold an option the product has since retired, and one stale entry shouldn't fail the whole record. The read schema extends the full schema, replacing each such list with one that drops unknown entries; the full schema stays for building a new document. The same applies to a frontend checking what an API sends back, which during a rollout can run on older contracts than the API.
- **A list returns a projection, never the whole document.** Each list shape is a `.pick()` of the full schema naming exactly what its card or row renders, and the data layer parses every document through it, so a key the pick doesn't name is dropped. That keeps payloads small and keeps sensitive fields out: a field added to the document can't leak into a list, because the pick doesn't name it. A detail read returns the full document; a sensitive field never appears in a list or public shape.
- **A projection that needs a derived, summarised or decrypted value** (a payout account shown as its last four digits) is built in the service layer, which can produce the value, then parsed through its schema the same way.
- Selecting fields at the query, to save bytes on the wire, is a separate decision and doesn't replace the pick; that's `firebase`'s.

## Shared primitives

Keep the primitives every domain reuses in one `shared.schema.ts` — email, phone, country code, timestamps, pagination queries, safe URLs — and build domain schemas from them.

- **A URL a page will render as a link rejects `javascript:` and `data:`.** Zod's plain `z.url()` accepts both, and a rendered `href` would execute the first. Define one safe URL schema allowing only `http:` and `https:`, and use it for every user-supplied link.
- **Pagination queries are one schema each** (offset and cursor), shared by every list route and the frontend that builds the query.

## Where contracts live

The same four kinds whatever the repo's shape. A single app keeps them in `lib/`; a monorepo moves the ones two or more workspaces share into a contracts package, so the API, the apps and the workers import one copy.

| Kind           | Holds                                                                         | Single app                             | Monorepo              |
| -------------- | ----------------------------------------------------------------------------- | -------------------------------------- | --------------------- |
| `constants/`   | `as const` enums and the unions derived from them, limits, labels, data paths | `lib/constants/`                       | the contracts package |
| `schemas/`     | Zod schemas with their inferred types, one `<domain>.schema.ts` per domain    | `lib/schemas/`                         | the contracts package |
| `types/`       | only shapes nothing infers — UI state that never crosses a wire               | `lib/types/`                           | the contracts package |
| `permissions/` | the closed list of verbs, role maps and the pure `can()` predicates           | split across `constants/` and `utils/` | the contracts package |

- **Wire contract → schema; UI-only state → type.** Anything parsed at a boundary is a schema; `types/` holds only what no schema or const produces (upload progress, a menu's open state).
- **An enum is an `as const` array**, and both the enum schema and the UI read that one array (`EVENT_STATUSES` → `z.enum(EVENT_STATUSES)` and `type EventStatus`).
- **Data paths** — collection names and path builders — are constants in the contracts, because the API writes them and the workers trigger on them, so both must read one copy.
- **Permissions are client-safe on purpose.** `can()` is pure, with no I/O, so the same predicate gates a button in the UI and the guard in the API; how roles and verbs are designed is `rbac`'s.
- **An app-local form schema stays in the app's `lib/schemas/`**, built from contract pieces (`OrganiserSchema.shape.name`, the safe URL schema). It moves into the contracts only when a second workspace needs it. Never re-declare a contracts schema inside an app.

## A contracts package

- **Who loads it decides how it's built.** A contracts package that plain Node loads as well as bundlers — workers, scripts, the API — builds with NodeNext resolution into `dist/`, and every consumer reads the build. NodeNext needs the `.js` extension on relative imports; switching to bundler resolution to avoid it breaks Node consumers at runtime, and rewriting imports after the build is not a fix.
- **One entry point and explicit barrels.** The package exports one root barrel; each kind has a barrel listing every file by name. A symbol left out of its barrel doesn't exist for consumers.
- **Rebuild after every change, and restart whatever runs from it.** A server still running the old `dist/` reports the new shape as a validation error. A `dev` task usually doesn't rebuild dependencies, so say so in the project's docs.
- **Specs sit beside what they test**, and the build config excludes them, so nothing test-only ships.

## Changing a contract

- **Additive is the default** — a new optional field, an extended schema. Old readers ignore what they don't know, and tolerant read schemas absorb retired values.
- **A destructive change** — removing or renaming a field, narrowing a type — ships as **one coordinated change** that updates the contract, the API and every consumer together. The contract is shared, so a partial rollout breaks the other side.
- **Every refinement gets a spec** (`<domain>.schema.test.ts`): the value it accepts, the one it refuses, and the message.

## Related skills

- Validating a schema inside a route, and the route order → `api-architecture`.
- Server Actions answering with an action result → `nextjs`.
- Roles, verbs and `can()` → `rbac`.
- Types, `satisfies` and tsconfig → `typescript`; names of schemas and types → `naming`.
- Where `lib/` kinds and packages go → `code-structure`.
