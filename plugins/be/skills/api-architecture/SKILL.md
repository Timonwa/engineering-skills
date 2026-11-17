---
name: api-architecture
description: >-
  How an API route is built in a Next.js API — the fixed order of rate limit, authorise, validate, delegate, audit, respond; thin routes over services; the response envelope and typed errors; caching headers; concurrent edits; long-running work; cursor pagination and allowlisted sorts; resource paths, versions, deprecation and state-transition sub-routes; and what every new route ships with. Cron, webhooks and audit logs are references. Use when adding, changing or reviewing a route handler or the API layer's structure.
---

# API architecture

A route handler is the HTTP edge and nothing else. Business logic lives in services, so a rule holds in one place whether a route, a cron task or another service triggers it, and every route is short enough to review against one checklist.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The route, in six steps

Every handler runs the same sequence, in this order — **rate limit → authorise → validate → delegate → audit → respond**:

```ts
export async function POST(request: Request, ctx: { params: Promise<{ eventId: string }> }) {
  try {
    await applyRateLimit(request, "WRITE", "events:publish");
    const { actor, event } = await loadEventWithPermission(request, (await ctx.params).eventId, "event.publish");
    const input = await validateBody(request, PublishEventSchema);

    const published = await publishEvent(event, input, actor); // one service call

    auditLog(request, actor, { action: "event.publish", targetId: event.id }); // privileged only
    return ok(published, "Event published");
  } catch (error) {
    return errorResponse(error);
  }
}
```

- **Rate limit first** — an attacker pays before any work is done. Tiers, keys and failure direction are `rate-limiting`'s.
- **Authorise with a guard** — the guard is the only gate; nothing upstream checks again. Who the caller is → `auth`; what they may do → `access-control`. A guard that loads the resource checks existence before permission, so a caller without access gets 404, never a 403 that confirms the id exists.
- **Validate body, query, params and form data** with the shared schemas through the project's `validate…` helpers; write schemas are `.pick()` allowlists (`schemas-and-contracts`). `ctx.params` is a Promise — await it, then validate it.
- **Delegate in one service call.** No business logic, store access or branching in the route.
- **Audit** every privileged mutation and every security-relevant action, at the platform, organisation or account scope it belongs to, after the response or in the change's transaction, never failing the request (`audit-log`).
- **Respond through the shared builders**, never a hand-rolled `Response`.

## The layers

- **Routes** call **guards** and **services** only — the server barrel exports nothing else, so a route can't reach the store or a client without going around it, and a reviewer sees that at once (`code-structure`).
- **Services** hold the logic: one file per resource, taking validated input and the actor, returning plain objects, throwing typed errors. Logic one audience needs (an operator-only action) goes in that audience's service, never a forked copy of the resource's.
- **Data** modules are the only callers of the store (`firestore`); **clients** are the configured SDKs.

## Responses and errors

- **One envelope for every route** — `{ success: true, data, message?, metadata? }` or `{ success: false, error: { code, message, details? } }`, typed in the shared contracts — built only by `ok`, `created`, `noContent`, `paginated` and `errorResponse`. A hand-rolled body breaks every consumer's unwrap.
- **Expected failures are typed errors** with a status and a stable `code` clients branch on: validation (400, with every failing field in `details`), bad request (400), unauthorised (401), forbidden (403, or a plan's `FEATURE_NOT_IN_PLAN` and `PLAN_LIMIT_REACHED` — `plan-entitlements`), not found (404), conflict (409), precondition failed (412), too many requests (429, with `Retry-After`), service unavailable (503). `errorResponse` maps them; an unexpected error is a 500 whose message is hidden outside local.
- **A missing composite index is a 503 with its own code**, not a 500 or an empty page, so it's obvious in logs and the index is added (`firestore`).
- **A lock that's already held is a 409**, never a wait.
- **Every response is `Cache-Control: no-store`** (OWASP), set once in the shared builders, so no browser or shared cache keeps a copy of someone's data. Consumers cache reads in their own server cache and expire them after a mutation (`nextjs`). A public read with nothing personal in it may opt into a shared-cache policy, deliberately and per route.

## Concurrent edits

Two people editing the same record must not silently overwrite each other. A read returns the record's version — an `ETag`, or a `version` field the store increments on every write — and an update sends it back, in `If-Match` or the body. The service compares it in the same transaction as the write: a mismatch is a 412 for `If-Match`, a 409 for a body field, and the client reloads and shows what changed. Counters and toggles that can't conflict use atomic increments instead (`firestore`).

## Long-running work

A request that can outlast the host's timeout — an export, a bulk import, a report — answers **202** with the id of an operation record and its path; the work runs from a queue, and the client polls the operation (`status`, `progress`, the result or an error) until it's done. Never hold a request open waiting for it.

## Lists

**Cursor pagination, never offset.** One shared helper runs the paged query; the service returns the page, its cursors and a total from a stored counter; `paginated` builds the `metadata` (`limit`, `total`, `totalPages`, `nextCursor`, `prevCursor`, `hasNext`, `hasPrevious`). Every ordered query has its composite index committed (`firestore`). A list returns a projection, never whole documents (`schemas-and-contracts`).

**Sort and filter only on allowlisted fields**, each an enum in the list's query schema with its index committed; an unknown field is a 400. A client's field name never reaches the query unchecked.

## Paths

- **Every route sits under a version** — `app/api/v1/<resource>/…`. A breaking change adds `v2` beside `v1`, never edits `v1` in place, because deployed clients still call it; additive changes go into the current version. Consumers build every path from one version constant (`code-structure`). Before a version is retired, its responses send `Deprecation` (RFC 9745) and `Sunset` (RFC 8594) with a `Link` to the migration notes, and integrators are told; it's deleted after the sunset date, once nothing calls it — the API reference is the inventory to check.
- **Paths group by resource, not by feature.** Things on the caller's own record nest under one resource (`account/profile`, `account/preferences`) whichever feature edits them; the feature is the route's API-reference tag (`openapi-registry`).
- **`<resource>/route.ts`** lists and creates; **`<resource>/[id]/route.ts`** reads, updates and deletes.
- **A state transition is its own `POST` sub-route** — `publish`/`unpublish`, `suspend`/`unsuspend`, `archive` — with its own permission and audit action. `DELETE` removes a thing; it never turns one off.
- **Routes for the caller's own record need a session, not a permission** — there is no one else's to protect.

## Other callers

- **Scheduled work** — one scheduler entry hits one dispatcher route that runs the due tasks: [references/cron.md](references/cron.md).
- **Webhooks** — a provider's signed callbacks, recorded once and forgotten on failure so retries work: [references/webhooks.md](references/webhooks.md); sending them to customers → `webhook-delivery`.
- **Queued jobs** — a task queue calling a worker route is gated like the scheduler, by the queue's OIDC token, and each job is idempotent on its own id ([references/cron.md](references/cron.md)).
- **Health and docs routes** have no user and no permission, but a public one still takes a generous limit of its own, never the user tiers' quota. Health answers only that it's up, never which dependencies it has; a platform probe that must never be throttled reaches it by network or identity, not an open exemption. Docs are served only on the tiers meant to show them.
- **The proxy runs before every route** — CORS allowlist, the CSRF origin check on mutations, the maintenance gate. It is never authorisation (`backend-security`, `maintenance-mode`).

## A new route ships with

In the same change: the request and response schemas (`schemas-and-contracts`), the data function and any composite index, the service, the route in six steps, its API-reference entry (`openapi-registry`), a colocated `route.test.ts` calling the exported handler with a real `Request` (`testing`), and the path in each consumer's endpoints file.

## Do / Don't

- **Do** keep the six steps in order; make one service call; throw typed errors; send `no-store`; check the version on every update; answer slow work with 202 and an operation; page with cursors; allowlist sort and filter fields; announce a version's sunset; group paths by resource; make transitions sub-routes; ship the reference entry and the test with the route.
- **Don't** put logic or store access in a route; hand-roll a response; skip the guard on a route that has a user, or the rate limit on any public route; edit `v1` for a breaking change; let a stale edit overwrite a newer one; hold a request open for slow work; use `DELETE` to switch something off; let an audit write fail the request.

## Related skills

Rate limits `rate-limiting` · sessions `auth` · permissions `access-control` · schemas `schemas-and-contracts` · the store `firestore` · the API reference `openapi-registry` · route tests `testing` · server-side threats `backend-security` · the audit log `audit-log` · where files live `code-structure`.
