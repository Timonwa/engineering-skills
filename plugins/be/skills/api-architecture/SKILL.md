---
name: api-architecture
description: >-
  The house backend / API-layer architecture for Next.js, data-store-agnostic — thin route handlers over a service layer or Server Actions, the schema then service then route build order, RBAC guards, Zod validation and write-safety, rate-limit tiers, typed errors and shared response builders, cursor pagination, audit logs, and cron/webhook auth. Use when designing or reviewing server endpoints, adding a route or Server Action, or structuring the API layer.
---

# Backend (API layer)

House architecture for the **backend / API layer of a Next.js app** — server endpoints structured as thin route handlers over a service layer (a dedicated API app `apps/api`, or route handlers as a BFF / for webhooks) or Server Actions in a single app. **Data-store-agnostic:** the route is the thinnest layer, all logic lives in the service layer, and data access is delegated to the data layer (Firestore via the Admin SDK → `firestore`). This skill is the _architecture_; the framework mechanics are `nextjs` and the data mechanics are `firestore`.

> **When this applies:** an app with an actual API/route-handler layer. A **single app** with no separate API usually mutates via **Server Actions** (→ `nextjs`) calling services directly — same service/validation/RBAC rules below, minus the HTTP envelope.
>
> **Delegations:** route handler / Server Action / caching mechanics → `nextjs`; Firestore/Admin-SDK data access, auth token/session, RBAC role model → `firestore`; Zod + schema-shape safety → `typescript`; where files live (`lib/server`, services) → `code-structure`; names → `naming`; the server-side security discipline (authz/Broken Object-Level Authorization (BOLA), injection, Server-Side Request Forgery (SSRF), resource limits, error hygiene) → `backend-security`.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Build order

**schema → service → route.** The schema (validated shape) and service (logic) must exist before the route. Scaffold the trio together where you can. Routes never contain business logic, DB calls, or branching.

## Route handler pattern

Every mutating handler follows the same sequence — **rate-limit → authorize → validate → delegate → audit → respond**:

```ts
export async function POST(request: NextRequest) {
  try {
    await applyRateLimit(request, RATE_LIMITS.WRITE, "resource:create");
    const { actor } = await requirePermission(request, "resource.create");
    const body = await validateBody(request, CreateResourceSchema);

    const result = await createResource(body, actor);        // one service call

    auditLog(request, actor, { action: "resource.create", targetId: result.id }); // admin routes only
    return created(result, "Resource created");
  } catch (error) {
    return errorResponse(error);                              // typed errors → status codes
  }
}
```

- **Routes are orchestration only** — one service call, no logic. Next 16: `ctx.params` is a **Promise** — `const { id } = validateParams(await ctx.params, IdParamsSchema)`, never read `ctx.params` raw.
- **Validate everything** at the boundary with Zod (body, query, **and** route params) — `typescript`.
- **Always respond via the shared builders** (`ok` / `created` / `errorResponse` / `paginated`) — fixed envelope; never hand-roll a `Response`.

## Service layer

- **One file per resource** (`<resource>.service.ts`); accepts **validated data + the actor**; returns **plain objects, not `Response`s**; throws **typed errors**. All data access lives here (→ `firestore`).
- **Placement:** logic shared across audiences lives in the resource service; audience-only operations (e.g. admin-only) go in an `admin/` service — **never fork a parallel admin copy** of resource logic. Reuse existing helpers/guards rather than reimplementing.
- Keep files focused (~200 lines); split by concern.

## Validation & write-safety

Zod at the boundary; infer types from schemas (→ `typescript`). **Write schemas are `.pick()` allowlists** of the client-writable fields (`.partial()` for PATCH) — fail-closed: a new schema field can't leak into writes until explicitly picked, and the service writes the validated body wholesale, so the schema is the only gate. **`.omit()` write schemas are the anti-pattern** — fail-open: every unnamed/new field (ownership ids, status, timestamps, counters, roles) stays writable. Responses to a less-privileged audience use a **`.pick()` allow-list + explicit mapper**, never `{ id, ...doc.data() }` (full detail → `firestore` write-safety).

## RBAC guards

- Guard at the top of the handler: `requirePlatformPermission(request, perm)` (app-wide) or `requireResourcePermission(request, perm, resourceRole)` (per-resource); prefer a composite `loadResourceWithPermission(request, id, perm)` that decodes the token once, loads the doc, resolves the role, and asserts. Inside a service with an actor already in hand, `requireActor(actor, perm)` asserts without re-verifying the token.
- Guards resolve the **actor** from the token/claims and Firestore roles; enforcement uses the pure `can()` policy. The role model (claims + Firestore, `can()`) lives in `firestore`.
- **The API is the only real gate** — the frontend trusts the 403; never rely on client checks.

## Rate limiting

- **Every handler rate-limits** — no exceptions for "internal" or "cheap" reads. Five presets, picked by **what the route does**, not what it costs; a route whose traffic shape fits none gets its **own** tier (with a comment), not a stretched existing one.

| Preset      | Routes                                                              | How to size it                                                                |
| ----------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `AUTH`      | login / signup / password reset — credential flows                  | Tightest. Per hour, not per minute — a human logs in a handful of times a day |
| `SENSITIVE` | destructive or costly authed ops (role changes, deletions, uploads) | Near `AUTH`; the cost of the operation sets it, not the traffic               |
| `WRITE`     | normal authed writes                                                | Between `SENSITIVE` and `READ`                                                |
| `READ`      | authed reads                                                        | Generous — per minute; a real session bursts while a page loads               |
| `PUBLIC`    | anonymous reads                                                     | Highest. Shared NAT puts many real users behind one IP                        |

**The actual numbers are a project fact → `AGENTS.md`**, not a house constant: a budget that fits a busy platform will lock out nobody on a low-traffic site, and one that fits the small site throttles the busy one. Derive each from real traffic — set it above your observed p99 for legitimate use, then watch what trips. Publishing your thresholds tells an attacker exactly what pace to stay under, so treat them like any other operational detail.

- **Sliding window, not fixed** — a fixed window resets at the boundary, letting `2× maxRequests` burst by stacking the end of one window with the start of the next; sliding weights the previous window so the worst case stays bounded.
- **Key per IP**, because most limited endpoints are auth-adjacent or unauthenticated — no user identity exists yet. Consequence: shared-NAT/corporate-proxy users share a counter, which is why `PUBLIC` ceilings are deliberately high.
- **Key grammar `domain:action`** (`auth:login`, `admin:plans:update`) — each unique prefix is its own counter per identity.
- **`getClientIp` reads the RIGHTMOST `x-forwarded-for` entry** (the CDN/LB appends the real IP last; the leftmost is client-spoofable), then `x-real-ip`, then `"unknown"` + a warn log.
- **Rate limits FAIL CLOSED** — no fallback store; the limiter store being down means limited routes 5xx by design (caches fail open, security primitives fail closed).
- **Only cron, webhooks, and dev routes skip it** (they have their own auth). Credential endpoints add a **login lockout** on top of the IP limit: keyed `(IP, email)`, `INCR` + TTL, `DEL` on successful login.

## Errors & responses

- **Typed error classes** (`NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `BadRequestError`, `ConflictError`, …) thrown from services; a single `errorResponse(error)` maps them to status codes. Never build ad-hoc error bodies.
- **Shared response builders** with a fixed envelope: `ok` / `created` / `errorResponse` / `paginated`. Consumers depend on the shape — don't invent a new one per route.
- **The API sets no cache policy.** Consumers cache the fetch (`serverFetch`/`publicFetch` with `tags` + a `revalidate` tier → `nextjs`); after a mutation, the **frontend** owns the matching `revalidateTag`.

## Pagination

**Cursor pagination, never offset** — a shared helper; the base query carries only `.where()` clauses; the cursor token is a doc id; fixed paginated envelope. The Firestore cursor helper + index requirements are in `firestore`.

## Resource routes & state transitions

- **Every route sits under a version segment** — `app/api/v1/<resource>/route.ts`. A breaking change to a response shape or a required field **adds `v2` beside `v1`**; it never edits `v1` in place, because a deployed client is still calling it. Additive changes (a new optional field, a new endpoint) go straight into the current version.
- **The client names the version once.** `config/endpoints.ts` builds every path from one `API_BASE` constant, so a migration is one edit there and no endpoint can be missed (`code-structure`). Two versions running at once is a small map, not a second copy of the file.
- **A retired version is deleted, not left to rot.** Before removing `v1`, confirm nothing calls it — the OpenAPI registry, where the project has one, is the inventory to check against.
- File shape: `<resource>/route.ts` (GET list, POST create) + `<resource>/[id]/route.ts` (GET, PATCH, DELETE).
- **State transitions are their own POST sub-routes**, mirroring `publish`/`unpublish` — `restrict`/`unrestrict`, `archive`/`unarchive`. **`DELETE` only removes a row** — never use it to "turn something off."

## Auth on the request

Accept **either** a `Bearer <ID token>` header **or** the session cookie; verify with check-revoked; reject unverified email by default (opt-out for pre-verification routes). The token/session/verification mechanics are in `firestore`.

## Cron & webhooks

- **Cron** endpoints are driven by a scheduler and authed by **verifying its OpenID Connect (OIDC) token** (audience + a fixed service-account email), not a session. The house pattern — single dispatcher with per-task cadence gates and error envelopes, retry-backoff sizing, audience derivation, default-deny with a local-only bypass, the two-layer-auth upgrade — lives in **`references/cron.md`**.
- **Webhooks** verify a **signature** from the sender; both cron and webhooks skip user rate-limiting and must be **idempotent** (dedupe by a deterministic id; guard state transitions).

## Proxy (CORS / CSRF / maintenance)

One `proxy.ts` gates `/api/*`: a **CORS allowlist** (per-env origins, `Allow-Credentials: true` for the cookie), **CSRF** (reject mutating methods whose `Origin` is off the allowlist with 403), and optional **maintenance mode** (503 + `Retry-After` with a bypass). The proxy mechanism itself → `nextjs` (Proxy).

## Audit and activity logs

**Two different logs — don't merge them.** An **audit log** is a security control: append-only, admin-read-only, written for anything a compromise investigation would need. An **activity log** is a product feature: the user's own history, readable by them, deletable with their account. Same event often writes to both; the storage, retention, and access rules differ completely.

**What earns an audit entry** is the sensitivity of the action, not the role of the actor. Every privileged/admin mutation, and every **security-relevant action a user takes on their own account** — email or password change, MFA enrolment or removal, session revocation, API-key issuance, account deletion, permission or ownership transfer. Those are the account-takeover steps; a trail that only covers admins can't reconstruct how an account fell. Ordinary CRUD on a user's own content doesn't need one (it belongs in the activity log, if anywhere).

Entry field contract: **action** (typed union registered in one place — register action types before their feature ships, no ad-hoc values), **actor uid AND denormalized email** (the trail survives user deletion), optional **target id + type**, description, metadata, **originating IP**, **HTTP method + route path**, timestamp.

- **Fire-and-forget is a contract** — never awaited, errors swallowed internally; a failed audit write must never surface to the caller.
- **The permission guard auto-emits denial entries** (required permission + role in metadata) — routes need no denial code of their own.
- **Append-only must-nots:** no write/edit/delete endpoint, no non-admin reads, no read-through cache on the audit path. Retention via a TTL field, not manual cleanup.
- **An activity log is the opposite on every axis** — the user reads it, it can be paginated and cached like ordinary data, and it goes when the account goes. Deleting a user must never delete their audit entries, which is why the actor email is denormalized above.
- Keep both separate from any per-item version history.

## Boundaries

- **Reuse the sibling's shape, not its mistakes** — mirror how nearby endpoints do auth, validation, pagination, and response _when they follow this skill_; where a sibling deviates, follow the skill and flag the sibling instead of copying it.
- **No workarounds** — if you reach for one (over-fetching a list to derive a value), add the proper endpoint/service instead.
- **Preserve existing comments** when editing or rewriting code; remove or update one only when your change made it factually wrong.
- New routes get **auth + permission guards**; new schemas rebuild before use; validate inputs; secrets stay server-only (→ `firestore`, `nextjs`).

## Do / Don't

- **Do** keep routes thin (rate-limit → authorize → validate → delegate → audit → respond); put logic + data access in services returning plain objects; throw typed errors mapped by `errorResponse`; validate body/query/params with Zod; cursor-paginate; make state transitions their own sub-routes; rate-limit every handler; verify cron OIDC + webhook signatures; audit admin mutations.
- **Don't** put business logic / DB calls / branching in a route; return a raw `Response` or an ad-hoc envelope; skip rate-limiting; use `DELETE` to toggle state; set cache policy in the API; fork an admin copy of resource logic; read `ctx.params` without awaiting/validating; trust client-side permission checks.
