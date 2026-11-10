---
name: firebase
description: >-
  The house Firebase architecture for full-stack apps — the Admin-SDK access boundary, sign-in to ID token to httpOnly session cookie auth, hybrid RBAC across custom claims and Firestore, data access and write-safety (cursor pagination, transactions, serverTimestamp, denormalized counters, indexes-as-code), least-privilege rules, Storage buckets by access level, App Check, the emulator suite, and per-env deploy. Use when designing or reviewing anything Firebase.
---

# Firebase

House architecture for Firebase in full-stack apps, grounded in real usage and upgraded to current best practice. Firebase provides **auth + data + storage**; the **API (Admin SDK) is the write path** and the client is default-denied except where a rule deliberately allows it.

> **This owns house architecture + Industry Best Practice (IBP); the official skills own product mechanics.** Vendored: CLI/project → `firebase-basics`; Auth → `firebase-auth-basics`; Firestore → `firebase-firestore`; rules review → `firebase-security-rules-auditor`; deploy → `firebase-app-hosting-basics`/`firebase-hosting-basics`; plus `firebase-data-connect-basics`, `firebase-remote-config-basics`, `firebase-ai-logic-basics`, `extension-to-functions-codebase`. **API-app architecture** (route handler pattern, rate-limiting, audit logging, CORS/CSRF proxy) → the `api-architecture` skill + `nextjs`/`code-structure`. **Deep flows/tables/code → `references/patterns.md`.**
>
> **Project facts → `AGENTS.md`:** project ids per env, collection/bucket names, root cookie domain, env var names, chosen host. Whether a project even uses a given product (FCM, Remote Config, App Check, Data Connect, AI Logic) is a project fact — don't assume.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The access boundary (golden rule)

- **Firestore is deny-all to clients — the API + Admin SDK is the sole read/write path.** The Admin SDK bypasses rules; client access is denied as defense-in-depth. (The client app config — apiKey/projectId/bucket — ships to every browser, so deny-all is what actually closes Firestore/Storage to it.)
- **Storage is the nuance:** writes MAY go **client-direct when gated by Firebase Auth + Storage Rules** (e.g. resumable uploads to a pre-reserved path); **signed URLs** serve gated originals. So it's _Firestore-all-via-API_ **+** _Storage-client-gated-by-rules_ — don't over-claim "all writes via API."
- **Only auth hooks (client) + the server data/SDK-init modules touch Firebase.** Everything else gets resolved data + callbacks as props/args (→ `code-structure`).

## Admin SDK — init & credentials (server-only)

- Behind the `lib/server/` boundary (or an API-only app that's wholly server); never in a client bundle.
- **Lazy singletons** (Proxy that constructs on first property access + binds methods) so import is free; persist the app on `globalThis` to survive HMR, guard with `admin.apps.length` for cold starts; `db.settings({ ignoreUndefinedProperties: true })`. Export `auth`/`adminAuth` (same instance), `firestore`, `storage` from one barrel.
- **Credentials — prefer Application Default Credentials (ADC)** on App Hosting/Cloud Run/Functions (`initializeApp()` with no key). Off Google infra, load the service-account JSON from **Secret Manager**. **Never** commit or `NEXT_PUBLIC_`/`VITE_` the service account (full admin, bypasses rules — leak ⇒ rotate). The web/API key is public; security is rules + Auth. Zod-validate every Firebase env var at boot.

## Client SDK init

Config from `NEXT_PUBLIC_FIREBASE_*` in `config/firebase.ts`; lazy `getApps()` singletons exposing `getFirebaseAuth()` etc. Initialize **only the services the client needs** (usually Auth; Storage/Firestore only for a real client feature). Note: the **default `*.firebasestorage.app` bucket is the private uploads bucket**; the public bucket is a separate `-public` one.

## Auth — sign-in & session

The client SDK signs in; the **server holds the source of truth** (the session cookie), and the frontend never stores the ID token after the initial exchange. (An ID token alone can't serve Server Components — they render before client JS runs, and the client SDK persists auth in IndexedDB, invisible server-side; only the cookie reaches server renders.)

1. Client signs in (`signInWithEmailAndPassword`, `signInWithPopup(GoogleAuthProvider)`, …) → fresh **ID token** (`getIdToken(true)`).
2. Client POSTs the ID token to a session endpoint; server verifies it's a **recent** sign-in and exchanges it for a **session cookie** (`createSessionCookie`).
3. Server verifies the cookie (`verifySessionCookie(cookie, /* checkRevoked */ true)`) on protected routes/components. The API accepts **either** a `Bearer <ID token>` header **or** the session cookie.

**Some flows are server-driven via the Identity-Toolkit REST API** (Admin SDK can't do them) — password reset (fully server), email-link _send_ (client completes), verification-email resend (via a custom-token round-trip), and password-change re-verify. **Signup is Admin SDK** (`createUser`), email+password only (OAuth/magic-link are sign-in paths, not signup — signup collects profile). The handoff is explicit: `createUser` yields **no ID token** — the client then signs in with the created credentials (or a custom token) and POSTs the resulting ID token to the session endpoint. A **legacy custom-token login** path may coexist. Full per-flow table + REST error-code mapping → `references/patterns.md`.

- **Session cookie:** `httpOnly` (XSS mitigation), `secure` (prod), `sameSite: "lax"`, ~5-day max-age. Set a **cross-subdomain `domain`** (`.example.com`) for SSO across a monorepo's apps (undefined locally). On **classic Firebase Hosting** the cookie must be named `__session`; App Hosting is flexible.
- **Email verification is a hard gate:** send on signup, block the app until verified, and the API **rejects unverified email (403)** except opt-out routes (logout/refresh/resend). Mirror `emailVerified` onto the user doc at session exchange via a server-only write that bypasses the public update schema.
- **Refresh after a claims/verify change:** claims only update on token refresh (~1h) — re-mint the cookie (`createCustomToken` → `signInWithCustomToken` → `createSessionCookie`) via a `refresh-session` endpoint, then `router.refresh()`.
- **Auth hooks** live in a shared package, receive server actions by **dependency injection**, take `Auth | null`, return `{ loading, error }`. **Logout clears the server cookie first, then `signOut()`**, and `revokeRefreshTokens(uid)` server-side.
- **Server helpers** come from one shared **`createAuthHelpers({ apiBaseUrl, sessionCookieName, … })`** factory → `getCurrentUser`/`requireAuth`/`requireGuest`; `getCurrentUser` is React-`cache()`-deduped and tagged for `revalidateTag`. The frontend resolves identity by reading the cookie / calling the API — **never** imports `firebase-admin`.
- **Gate at the route-group layout** (`requireAuth()` once covers the subtree), `requireGuest()` per sign-in page. **No `<AuthGuard>`/`<RoleGuard>` components** (retired with App Router). **Auth ≠ permission — three-way frontend rule:** default is to call the API and let the error boundary render the 403; a boolean-claim short-circuit only when the page needs `notFound()`; per-resource permissions have no client shortcut. Troubleshooting sequences → `references/patterns.md`.
- **Edge/middleware** may only check cookie _presence_; real verification needs the Node runtime.
- **Surface Firebase errors** through one mapping catalog (Admin + Client + REST codes → user messages).

## RBAC — hybrid

- **Coarse, app-wide roles → custom claims** (low-cardinality boolean/role flags); token-embedded, no per-check read, tamper-proof (Admin-SDK-only). Keep under the **~1 KB** claims limit; nothing large or fast-changing.
- **Fine, per-resource roles → Firestore** (e.g. a per-resource `members` subcollection, `status === "accepted"`), resolved per request.
- **Roles are stored; permissions are derived.** Never store permissions on user docs. `can(actor, permission)` / `canAll` / `canAny` are **pure** (no I/O, same on client/server/tests); the caller assembles `actor = { platformRole?, resourceRole? }`.
- **Permission grammar** `scope.resource.action` with a fixed verb vocabulary (`view` not `read`, `delete` not `destroy`; `remove` = detach, `delete` = destroy; hyphenate multi-word resources; full verb table → `references/patterns.md`); reverse actions get their own strings (audit direction). Register strings in one constants file (typed union) — no inline ad-hoc strings. Role→permission map lives once; top role = everything by assignment, mid = by exclusion, narrow = explicit allowlist. **Allowlist roles never auto-receive new permissions — granting is a mandatory second step in the same PR as the endpoint.**
- **Guards at the top of each route handler/service are the only real gate** (the Proxy handles only CORS/CSRF/maintenance — it is not an auth layer); prefer the composite `loadResourceWithPermission`; four guard entry points + when-to-use → `references/patterns.md`. `usePermission` is UX-only. Platform-permission denials get audit-logged; per-resource denials deliberately don't (noisy, low-signal). "Can role X manage role Y" is a separate **rank hierarchy** check, not a permission.
- **Claims go stale — that is the price of the split.** A role removed from custom claims stays live until the client's ID token refreshes (up to an hour, or whenever the SDK next refreshes). So: anything that must take effect **immediately** — a ban, an admin downgrade, revoking a paid tier, removing someone from a resource — is resolved from Firestore per request, or you call `revokeRefreshTokens(uid)` and verify with `checkRevoked: true` to force the client to re-authenticate. Claims are a latency cache over the stored roles, never the record; if a check can't tolerate a stale answer, it doesn't belong in claims.
- **Applying claims:** `setCustomUserClaims` must be **awaited in-request** on App Hosting/Cloud Run (bounded retry; record failures), re-derived from the Firestore source-of-truth records; a client-writable role field must be immutable in rules.

## Firestore — data access

- **Centralize collection paths** in one module (top-level names as constants, subcollections as path-builders, stable single-doc ids). Never hardcode a path at a call site.
- **All queries in the service/data layer** — never `db.collection(...)` in a component.
- **Types via Zod, not `withConverter`:** validate writes with Zod; hydrate reads with a shared **`FirestoreTimestampSchema`** (Firestore `Timestamp` | `Date` | Unix ms) on every timestamp field. `Create*` omits server-set timestamps.
- **Timestamps:** `FieldValue.serverTimestamp()` update sentinels; `Timestamp.now()` for deterministic values inside a transaction; `createdAt`/`ownerId` immutable on update.
- **Cursor pagination, not offset** — doc-id token, `limit + 1` to detect more, `documentId()` tiebreaker, inequality-filtered fields must be ordered. A missing composite index **throws `FAILED_PRECONDITION`** with an index-creation URL; the _silent_ gotcha is **`orderBy` on a field some documents lack — those docs are excluded**, quietly shrinking the page. Count with `count().get()`, never fetch-all.

## Firestore — writes, atomicity & write-safety

- **Atomic counters** with `FieldValue.increment()` (never read-then-write). **Uniqueness** via a transaction or `create()` (fails if exists). **Money/inventory** operations in a transaction (check + decrement together). **Batches** for multiple related writes; chunk above the **500-op** limit. Transactions must be idempotent — external calls/notifications _after_ commit.
- **Denormalize** derived/summary data onto parent docs (avoid N+1); update denormalized counters atomically in the same tx/batch; on delete, reverse a counter only if the doc was counted.
- **Schema-shape safety — write schemas are `.pick()` allowlists** of the client-writable fields (`.partial()` for PATCH): fail-closed — a new schema field can't leak into writes until explicitly picked. Services write the validated body wholesale, so the schema is the only gate; **`.omit()` write schemas are the anti-pattern** (fail-open — every unnamed/new field stays writable, incl. ownership ids, status, timestamps, counters, roles). **Responses to a less-privileged audience use a `.pick()` allow-list** through an explicit field-by-field mapper with a `Schema.parse()` backstop — never `{ id, ...doc.data() }` or `as XProps`. **Strip on LIST endpoints** via a `<Resource>ListItemProps` (`.pick()` of the full schema) + one mapper per list shape — but don't strip single-doc detail/edit reads (reads bill the same either way; the win is response bytes). Always strip encrypted fields from list/public responses (ciphertext leaks existence + length). Examples → `references/patterns.md`.

## Firestore — lifecycle

- **Indexes are code** (`firestore.indexes.json`, deploy via CLI); audit both directions (unused = waste, undefined-but-used = runtime crash).
- **TTL for document-only expiry**, cron for expiry with side effects. Use one field name (`expiresAt`, a `Timestamp`); retention constants live in one module keyed by collection. TTL is per-project setup (not `firebase deploy` — re-run per environment), deletes **typically within ~24 h of expiry** but never instantly (still filter `where("expiresAt", ">", now)`), and does **not** cascade to subcollections. Ops limits → `references/patterns.md`.
- **Cascade delete** via status-flip (`status → "deleting"`, return 202) + a Firestore-triggered reaper that cleans blobs/derived data and reverses counters; guard processing-vs-deleting races in a transaction.

## Security rules

- **Deny-by-default, defense-in-depth.** Rules only guard client-SDK / unsigned access (the API bypasses them). Loosen only when a frontend genuinely reads Firestore / private Storage directly — never broad writes.
- **Rules files are the in-repo source of truth** (deploys overwrite the console; back-port any console edit). Deploy selectively via `firebase deploy --only firestore:rules` / `--only storage:<target>`. Deploy targets are **per-machine CLI state** — `firebase target:apply` once per machine/CI; the committed `.firebaserc` only describes the mapping.
- **Validate create AND update** with the same validator; **`hasOnly` restricts fields, not who — always pair with ownership/role**; RBAC from the **token**, not a doc read (minimize billed `get()`/`exists()`); cap every string/array size + type-check every field; keep `createdAt`/`ownerId`/role immutable; append-only logs `write:false`.
- **Test** with `@firebase/rules-unit-testing` in CI and **audit** with `firebase-security-rules-auditor` — don't stop at `--dry-run`.

## Storage

- **Two buckets per project by access level:** a **private** default bucket (originals/sensitive — deny-all client) and a **public** `-public` bucket (avatars/covers — public read).
- **Public read via bucket IAM** (`allUsers → Object Viewer`) with **Uniform Bucket-Level Access (UBLA) on** — no per-object ACLs, no `makePublic()` (it throws under UBLA; a 403 is an IAM/UBLA fix, not a code workaround). Both steps are **GCP-console-only** (not in the Firebase console) — "upload succeeds, fetch 403s" means one is missing; verify commands → `references/patterns.md`. Public writes are **server-side** (Admin SDK, fixed per-slot filenames so re-uploads overwrite).
- **Client-direct resumable uploads** to the private bucket are allowed **when gated by Auth + Storage Rules**: server **reserves** a Firestore doc (`uploadedBy`, `status`, path), client `uploadBytesResumable` to that path, rules validate each write against the reserved doc (owner, path, status, size cap, content-type allowlist). **Signed URLs** serve gated originals. Storage may sit in a different region (`us-central1`) for egress; co-locate storage-triggered functions there.

## Background work

- **Cloud Functions v2** by default (v1 only for an extension's hook); one codebase per concern; **secrets via Secret Manager** (`defineSecret`); triggers **idempotent** (deterministic ids, "already-entered" guards) with region/memory/timeout/concurrency set deliberately. Firestore-triggered **reapers** do cascade cleanup.
- Scheduled work may instead be **Next route handlers driven by Cloud Scheduler with OpenID Connect (OIDC) auth** (verify the scheduler service-account token) rather than Firebase Scheduled Functions — that guard lives in the `api-architecture` layer.

## App Check — production (IBP upgrade)

Attest requests come from your genuine app; **enforce** on Firestore/Storage/Auth/Functions/AI Logic in prod. Web provider **reCAPTCHA Enterprise**; `initializeAppCheck` is **client-only** (guard SSR), auto-refresh on. Highest value for **AI Logic** (billing-spike) and **Phone Auth** (SMS fraud). Complements, doesn't replace, Auth + rules.

## Emulator & testing (IBP upgrade)

Run the **Emulator Suite** for local dev (connect clients via `connect*Emulator` behind a flag) and automate **rules unit tests** + function/integration tests against emulators in CI — so rules and triggers are verified without touching a real project.

## Env, config & deploy

- **One Firebase project per environment** (dev/staging/prod); the CLI `default` alias points at **dev** so a bare `firebase deploy` never hits prod.
- **Tier is `APP_ENV`, not `NODE_ENV`** (orthogonal; deployed envs all run `NODE_ENV=production`) — prefer derived `isLocal/isDev/isStaging/isProd`. Validate env with **Zod at boot** in a leaf `config/env.ts`; never read `process.env` in app code.
- **Secrets via Cloud Secret Manager**, referenced from `apphosting.{env}.yaml`; **layered App Hosting config** — a shared base `apphosting.yaml` + per-env overlays (overlay wins). Placement test per YAML line — "does the value differ per env?": no (shared secret **references**, runtime defaults) → base; yes (project ids, buckets, `APP_ENV`) → overlay. No `NEXT_PUBLIC_*` on an API app; API env entries avoid an `availability:` block (parsed eagerly at build); on frontends `NEXT_PUBLIC_*` must be **BUILD**-available (Next inlines it at build) — only genuinely request-time values get `availability: [RUNTIME]`. Derived per-tier non-secret values (base URLs, cookie domain, CORS origins) live in a `runtime.config`, not env vars.
- **Deploy gotchas:** the CLI grants secret access only to backends existing at the time — create secrets **after** the backend (or `grantaccess` explicitly); the #1 build-failure cause. A backend env-name typo silently merges **base-only** config — ship a health endpoint echoing the resolved tier. Secrets resolve at build unless version-pinned — **rotation needs a new rollout**. Depth → `references/patterns.md`.
- **Hosting is a per-project choice** — App Hosting for real-user/client apps invested in the ecosystem (keeps Admin/Auth/Storage/Secret-Manager on one GCP plane; Blaze required, `minInstances`/`maxInstances` + budget alerts); a lighter host (Vercel) for small/personal projects.
- **Sensitive user-retrievable fields**: store as AES-256-GCM ciphertext (one key per project in Secret Manager), encrypt/decrypt at the **service-layer boundary** (callers pass plaintext; routes/schemas/frontend never see ciphertext); version-prefix for rotation. Defense-in-depth against DB dumps — not against a compromised server. The full standard (format, hydrate boundary, key provisioning/rotation) → `field-encryption`.

## Do / Don't

- **Do** route Firestore writes through the API/Admin SDK; sign in on the client and hold auth in an httpOnly session cookie; coarse roles in claims + per-resource roles in Firestore; keep queries + Firebase calls in the service layer; `serverTimestamp()`/`increment()`/transactions/cursor pagination/indexes-as-code; `.pick()` allowlist write schemas and `.pick()`+mapper on responses; default-deny rules validating create+update, tested in CI; two buckets with IAM+UBLA; prefer ADC; one project per env with layered App Hosting config.
- **Don't** import `firebase-admin`/`firebase/auth` in components or client bundles; store the ID token after cookie exchange; use `signInWithCustomToken` for ordinary login; store permissions on user docs or trust a client-writable role; ship/`NEXT_PUBLIC_` the service account; `db.collection(...)` in UI; offset pagination; `.omit()`-based write schemas (fail-open); `{ id, ...doc.data() }` on a privileged response; `makePublic()` under UBLA; leave `onSnapshot` unsubscribed; ship rules on `--dry-run` alone; set `NODE_ENV` in env/apphosting; hardcode project ids/collections/buckets here (AGENTS.md facts).
