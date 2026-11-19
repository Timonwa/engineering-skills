---
name: openapi-registry
description: >-
  The OpenAPI document generated from a route registry in a Next.js API — one registration per route from the Zod schemas the handler validates, per-group modules composed by one file, a closed tag list, success status by meaning, standard errors derived from the entry, a paginated flag, uploads as binary strings, `.meta()` for names and examples, stable operation ids, a coverage test both ways, local-only routes kept out, and a spec lint and breaking-change check in CI. Use when adding a route, changing a schema, or serving the API reference.
---

# OpenAPI registry

The API's OpenAPI document is generated from a registry, never written by hand. Each route registers once, in the same change as the route, using the exact Zod schemas its handler validates — so the document can't describe a body the API doesn't accept. The handler is the source of truth; the registry is its projection, and a test proves the two match.

The document is the contract; how it's displayed (Scalar, Swagger UI, Redoc) is a viewer choice that changes nothing here. How the reference's prose reads is a writing task, outside this skill.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The shape

- **A shared setup module** creates the registry and holds what every entry reuses: the security schemes (bearer token, session cookie, API key), the error envelope and pagination metadata as named components, and one `registerRoute()` helper that turns a short definition into a full operation.
- **One module per group** of routes (public, auth, account, each product area, admin, system), each calling `registerRoute()` for the routes it covers. One file imports them all, so it's the only place that knows the full set.
- **A spec config module** builds the document: OpenAPI 3.1 (its schemas are JSON Schema 2020-12, which is what Zod emits), the info block with the auth, rate-limit and envelope notes, the servers, and the tag list. It's built once per process and cached.
- **The library:** `@asteasolutions/zod-to-openapi` (its `OpenApiGeneratorV31`), which reads Zod 4's `.meta()`; `extendZodWithOpenApi` is needed only for parameter-level descriptions and for an extended schema shown as a reference to its parent. Zod's own `z.toJSONSchema()` covers a single schema — for a webhook payload or a tool definition — without a registry.

The helper and the coverage test are in [references/registry.md](references/registry.md).

## Registering a route

- **Read the handler, then register what it does** — every exported method (one file can export `GET` and `DELETE`, and each registers), the schemas it validates params, query and body with, whether a guard runs, and what it returns.
- **The schemas are the handler's own**, imported from the shared contracts, never redeclared. A trivial path param with no named schema may be inline.
- **Auth mirrors the guard.** A route whose handler calls any session, permission or key guard is registered with `auth`, so the operation lists its security schemes; one with no guard has none. Never guess from the path.
- **Success status by meaning:** a `POST` that creates → `201`; a `POST` that acts (a state transition, a send) → `200`; an async start → `202`; a `DELETE` with no body → `204`.
- **Every input in its field** — `params`, `query`, `body` — never described in prose. A body is marked `required`, since OpenAPI defaults it to optional. Uploads take a `multipart/form-data` body; the generator has no `z.file()` support, so the file field is documented with an explicit `.openapi({ type: "string", format: "binary" })` while the handler validates the real file.
- **A response schema whenever data comes back**, typing the envelope's `data`; without it the document says nothing about the shape. A list sets `paginated`, so the envelope carries the pagination metadata.
- **Standard errors are derived, never restated.** The helper adds 400 when there's any input, 401 and 403 with auth, 404 with path params, 429 with `Retry-After` and the `RateLimit` fields, and 500. Only errors particular to this route go in `additionalErrors`, keyed by status (a 409 conflict, a 403 `PLAN_LIMIT_REACHED` — `plan-entitlements`); the 503 of maintenance mode and the 404 of a switched-off flag are derived too.
- **A stable `operationId`** for each operation, unique across the document — client generators name methods after it, so renaming one is a breaking change. Derive it from the method and path, or set it, but never let it change by accident.
- **A retiring version's operations are `deprecated: true`**, alongside the `Deprecation` and `Sunset` headers the routes send (`api-architecture`).

## Tags

- **The tag list is closed**: declared once, in order, in the spec config, and a route's `tag` is typed as one of them. A typo fails the type check instead of inventing a group.
- **One sentence per tag** — who uses the group and what it covers. Never a list of its endpoints, which goes stale.
- **A flow with no route of its own** (a provider sign-in, an emailed link the client completes) is described in its tag's sentence, naming the routes the client calls afterwards — never registered as a route that doesn't exist.

## Words in the entry

- **`summary` is required**: a short, verb-first line ("Create an event", "List the caller's albums").
- **`description` is optional**, for what a caller can't see from the entry — a terminal state, a side effect, an ordering. Never what the entry already says (auth, rate limits, parameters, errors), internal permission strings, the database or a schema's name.
- **Names and examples on the schema**, with `.meta({ id, description, examples: [...] })` — the `id` makes it a named component, reused by `$ref`, and the examples show in every viewer. A request is described by what callers send (defaults optional, strings before coercion); a response by what they get back.

## Keeping it true

- **A coverage test, both ways.** It walks the route files, reads the methods each exports — `export function GET`, `export const GET` and `export { handler as GET }` alike — and fails when one isn't in the document — and when the document lists a path nothing serves. A new route without its entry fails CI.
- **Local-only routes stay out** — developer tools, seeding, test hooks. The coverage test skips them by an explicit list of prefixes, so leaving one out is a decision, not a miss.
- **A script writes the document to a file**, for CI to lint and diff — built once from the branch and once from the base branch.
- **The document is linted in CI** (Spectral or Redocly with the OpenAPI ruleset), so a broken `$ref`, a duplicate `operationId` or a missing response fails before merge.
- **Breaking changes are caught, not discovered.** A CI step diffs the document against the base branch (`oasdiff breaking --fail-on ERR` — without the flag it never fails); a removed field, a new required input or a narrowed type fails unless it lands in a new version (`api-architecture`).
- **Served only where it's meant to be seen** — the document and the reference page answer 404 on a tier that doesn't publish them, and each takes a public rate limit.
- **Outgoing webhooks are documented too**, in the document's `webhooks` section (`registerWebhook`), from the same payload schemas the sender signs.

## Common mistakes

1. A file exports two methods and only one is registered.
2. A `POST` action registered as `201`, or a create as `200`.
3. The handler parses query, body or a path param the entry doesn't list.
4. No response schema on a route that returns data.
5. The entry uses a different schema from the one the handler validates with.
6. `auth` missing on a guarded route, or set on a public one.
7. Errors or parameters written as description prose.
8. An `operationId` changed by a rename.

## Auditing for drift

One tag at a time, reading the tag list fresh from the spec config: read the route files, read their entries, list every mismatch against the mistakes above, fix them, and run the API's type check before the next tag. Work from public routes to admin and system ones.

## Related skills

Routes, guards and the envelope `api-architecture` · the schemas `schemas-and-contracts` · the rate-limit headers `rate-limiting` · sending webhooks `webhook-delivery` · the coverage test `testing` · the audit `api-audit`.
