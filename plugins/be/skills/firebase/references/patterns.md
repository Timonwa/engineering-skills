# Firebase — deep patterns

Implementation detail behind `SKILL.md`. App-agnostic; replace names/domains with the project's (→ `AGENTS.md`).

## Auth flows — which layer drives each

| Flow                             | Driver                                     | How                                                                                                           |
| -------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Sign-in (email/password, Google) | **Client SDK**                             | `signInWith…` → `getIdToken(true)` → POST to session endpoint                                                 |
| Session create                   | **Server (Admin)**                         | verify recent sign-in → `createSessionCookie(idToken, { expiresIn })` → set httpOnly cookie                   |
| Session verify                   | **Server (Admin)**                         | `verifySessionCookie(cookie, true)` (or `verifyIdToken` for a Bearer header)                                  |
| Signup                           | **Server (Admin)**                         | `auth.createUser()` (email+password only; collect profile) then session                                       |
| Password reset                   | **Server (REST)**                          | `sendOobCode({ requestType: "PASSWORD_RESET" })` → `resetPasswordWithOobCode(oobCode, newPw)`                 |
| Email-link sign-in               | **Server send + Client complete**          | server `sendOobCode({ requestType: "EMAIL_SIGNIN", canHandleCodeInApp: true })`; client `signInWithEmailLink` |
| Verification email (resend)      | **Server (REST, custom-token round-trip)** | `createCustomToken` → `signInWithCustomToken` → `sendOobCode({ requestType: "VERIFY_EMAIL", idToken })`       |
| Verification apply               | **Client SDK**                             | `applyActionCode` → call `refresh-session`                                                                    |
| Password change                  | **Server (REST verify + Admin write)**     | `signInWithPassword` (re-verify current) → `adminAuth.updateUser({ password })`                               |
| Legacy custom-token login        | **Server (REST + Admin)**                  | REST `signInWithPassword` → return `createCustomToken` (transitional path)                                    |
| Refresh after claims change      | **Server (Admin+REST)**                    | `createCustomToken` → `signInWithCustomToken` → `createSessionCookie`                                         |

`rest-auth.ts` wraps `identitytoolkit.googleapis.com/v1` (keyed by the public web API key) and maps REST codes (`INVALID_LOGIN_CREDENTIALS`, `EMAIL_NOT_FOUND`, `EXPIRED_OOB_CODE`, …) to client-SDK-style `auth/*` codes, feeding one `FIREBASE_ERROR_MESSAGES` catalog (Admin + Client + REST) surfaced via a `getFirebaseErrorMessage`/`formatAuthError` helper.

## Session cookie config

```ts
// server-only
const SESSION_COOKIE = "app_session";              // "__session" on classic Firebase Hosting
const EXPIRES_IN = 60 * 60 * 24 * 5 * 1000;        // 5 days

function sessionCookieConfig() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: EXPIRES_IN / 1000,
    domain: env.isLocal ? undefined : ".example.com", // cross-subdomain SSO; undefined locally
  };
}
```

## Shared server auth helpers (DI factory)

```ts
// packages/…/server/auth.ts
export function createAuthHelpers(config: {
  apiBaseUrl: string; sessionCookieName: string; loginPath: string; defaultAuthedPath: string;
}) {
  const getCurrentUser = cache(async () => {          // React cache: per-render dedup
    const jar = await cookies();
    if (!jar.get(config.sessionCookieName)) return null;
    const res = await fetch(`${config.apiBaseUrl}/account/profile`, {
      headers: { cookie: jar.toString() },
      next: { tags: ["current-user"] },               // revalidateTag on profile change
    });
    return res.ok ? ((await res.json()).data as User) : null;
  });
  const requireAuth = async () => (await getCurrentUser()) ?? redirect(config.loginPath);
  const requireGuest = async () => { if (await getCurrentUser()) redirect(config.defaultAuthedPath); };
  return { getCurrentUser, requireAuth, requireGuest };
}
```

Each app instantiates once; a public site may instantiate only `getCurrentUser` (to reflect login in the navbar). Auth hooks take their actions injected:

```ts
useLogin(auth, { createSession, logLogin });          // package never imports app paths
```

## RBAC — pure policy

```ts
export type Actor = { platformRole?: PlatformRole; resourceRole?: ResourceRole };
export function can(actor: Actor, permission: Permission): boolean { /* set lookups, no I/O */ }
// permission strings: `scope.resource.action` — e.g. "resource.item.refund"; register in the constants union.
```

Backend guard (the only real gate):

```ts
const { actor } = await loadResourceWithPermission(request, resourceId, "resource.member.invite");
```

### Canonical action verbs

| Group         | Verbs                                                                            |
| ------------- | -------------------------------------------------------------------------------- |
| Read          | `view` · `list` · `search` · `report`                                            |
| CRUD          | `create` · `update` · `delete` · `duplicate`                                     |
| Relationships | `invite` · `add` · `remove` (`remove` = detach; `delete` = destroy)              |
| Lifecycle     | `publish`/`unpublish` · `cancel` · `archive`/`unarchive` · `suspend`/`unsuspend` |
| Approval      | `approve` · `reject` · `request`                                                 |
| Other         | `refund` · `flag` · `upload`                                                     |
| Escape hatch  | `perform` (only when nothing above fits)                                         |

Hyphenate multi-word resources (`feature-flag`). Allowlist-based roles never auto-receive new permissions — granting is a mandatory second step in the same PR as the endpoint (a permission no role holds is dead code).

### Guard entry points

| Guard                                            | Use when                                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `requirePlatformPermission(request, perm)`       | Claims-only platform routes — no doc load needed                                    |
| `loadResourceWithPermission(request, id, perm)`  | Resource routes — auth + load doc + resolve role + assert in one call (the default) |
| `requireResourcePermission(request, perm, role)` | The doc/role is already loaded — assert with the resolved role                      |
| `requireActor(actor, perm)`                      | Inside a service with an actor in hand — assert without re-verifying the token      |

Platform-permission denials are audit-logged automatically by the guard (required permission + role in metadata); per-resource denials deliberately aren't (noisy, low-signal).

## Firestore — cursor pagination

```ts
// baseQuery carries ONLY .where() clauses; the helper appends orderBy + a documentId tiebreaker.
const page = await getCursorPage<Note>({
  collectionPath: COLLECTIONS.notes,
  baseQuery: db.collection(COLLECTIONS.notes).where("ownerId", "==", ownerId),
  sortBy: "createdAt", sortOrder: "desc",
  cursor, dir, limit,                                  // cursor token is a doc id
  mapDoc: (d) => ({ id: d.id, ...d.data() }) as Note,
});
```

## Firestore — transaction (uniqueness + counter)

```ts
await db.runTransaction(async (tx) => {
  const dupe = await tx.get(db.collection(C.members).where("userId", "==", uid).limit(1));
  if (!dupe.empty) throw new ConflictError("Already a member");
  const ref = db.collection(C.members).doc();
  tx.create(ref, { ...data, createdAt: Timestamp.now() });            // deterministic in a tx
  tx.update(resourceRef, { membersCount: FieldValue.increment(1) });  // atomic counter
  // external calls (setCustomUserClaims, emails) happen AFTER commit, not inside
});
```

## Write-safety — schema shape

```ts
// WRITE: .pick() allowlist of the client-writable fields (fail-closed — a new schema field
// can't leak into writes until explicitly picked). `.omit()` is the anti-pattern: fail-open,
// every unnamed/new field (ownerId, status, timestamps, counters, itemsSold, roles) stays writable.
export const UpdateResourceSchema = ResourceSchema.pick({
  title: true, description: true, coverUrl: true, startsAt: true,
  /* …only fields the client may set… */
}).partial();

// RESPONSE to a less-privileged audience: pick allow-list + explicit mapper + parse backstop
export const ResourcePublicSchema = ResourceSchema.pick({ id: true, title: true, coverUrl: true, startsAt: true });
export function toPublicResource(doc: Resource) {
  return ResourcePublicSchema.parse({ id: doc.id, title: doc.title, coverUrl: doc.coverUrl, startsAt: doc.startsAt });
}
// NEVER: return { id, ...doc.data() } or `doc.data() as ResourcePublicProps` across a trust boundary.
```

List endpoints return a stripped `<Resource>ListItemProps` shape (a `.pick()` of the full schema plus any list-only fields) via **one doc→list-item mapper per list shape** — Firestore has no `SELECT`, the read bills full either way; the win is response bytes. Don't strip single-doc detail/edit reads (those views need the full document). Always drop encrypted fields from list/public responses — the ciphertext leaks the secret's existence and length.

## Storage — reserve-then-upload (client-direct, rule-gated)

1. Server `POST …/reserve` → creates the Firestore attachment doc at `resources/{resourceId}/attachments/{attachmentId}` with `{ uploadedBy, status: "pending" }`, returns `{ attachmentId, storagePath }`.
2. Client `uploadBytesResumable(ref(storage, storagePath), file)` to the reserved path.
3. Storage rule validates each write against the reserved doc:

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{ownerId}/resources/{resourceId}/attachments/{attachmentId}/{file} {
      allow write: if request.auth != null
        && firestore.get(/databases/(default)/documents/resources/$(resourceId)/attachments/$(attachmentId)).data.uploadedBy == request.auth.uid
        && request.resource.size < 100 * 1024 * 1024
        && request.resource.contentType.matches('image/(jpeg|png|heic|heif|webp)');
      allow read: if false;   // originals served via signed URL
    }
  }
}
```

Public bucket: `allow read: if true; allow write: if false;` + IAM `allUsers → Object Viewer` + Uniform Bucket-Level Access (UBLA) on (no `makePublic()`).

## Rules & buckets — deploy ops

- Deploy targets are **per-machine CLI state**: run `firebase target:apply storage <target> <bucket>` once per machine/CI; the committed `.firebaserc` only describes the mapping. Selective deploy: `firebase deploy --only firestore:rules` / `--only storage:<target>`.
- "Upload succeeds, every fetch 403s" = one of the two **GCP-console-only** steps is missing on the public bucket (neither exists in the Firebase console): the `allUsers → Storage Object Viewer` IAM grant, or the UBLA switch. Verify:

```bash
gcloud storage buckets get-iam-policy gs://<public-bucket>   # allUsers must hold roles/storage.objectViewer
gcloud storage buckets describe gs://<public-bucket> \
  --format="value(iamConfiguration.uniformBucketLevelAccess.enabled)"   # must print True
```

## Firestore TTL — ops

- Retention constants centralized in **one module keyed by collection**; the writing service sets `expiresAt` from it.
- One TTL field per collection group (can't TTL two fields); each policy counts against the **500 field-config cap**; renaming the TTL field = disable → rename → backfill → recreate — so don't.
- Registration is idempotent and scriptable: `gcloud firestore fields ttls update expiresAt --collection-group=<cg> --enable-ttl --async`. **Per-project setup — re-run for every environment.**
- First sweep after a policy goes ACTIVE can take up to 24 h; each swept delete bills as a normal delete.

## Auth — troubleshooting sequences

- **Server sees the user, client `useAuth()` is null** → check the root layout awaits `getCurrentUser()` before passing `initialUser`; the cookie name in `createAuthHelpers` matches what the session endpoint writes; the API base URL resolves and is reachable **from inside the Next server**.
- **`requireAuth()` redirect loop** → the session cookie expired, a recent tag-revalidated re-fetch failed silently, or the cookie `domain` doesn't cover the current host.
- **Role changed but not reflected** → the session cookie is separate from the client token: call the refresh-session endpoint, then `router.refresh()` — `onIdTokenChanged` alone only refreshes the client copy.

## Security rules — helper shape

```txt
function isSignedIn() { return request.auth != null; }
function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }
function unchanged(f) { return request.resource.data[f] == resource.data[f]; }
function onlyFields(fs) { return request.resource.data.diff(resource.data).affectedKeys().hasOnly(fs); }
// pair field limits with ownership; validate create AND update with the same isValidX(); default-deny the rest.
```

## App Check (client-only)

```ts
if (typeof window !== "undefined") {
  initializeAppCheck(getFirebaseApp(), {
    provider: new ReCaptchaEnterpriseProvider(env.NEXT_PUBLIC_RECAPTCHA_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
```

## App Hosting — layered config

```yaml
# apphosting.yaml (shared base)
runConfig: { minInstances: 0, maxInstances: 10 }
env:
  - variable: APP_ENV
    value: production            # tier is APP_ENV, not NODE_ENV
```

```yaml
# apphosting.prod.yaml (overlay wins at build)
env:
  - variable: FIREBASE_SERVICE_ACCOUNT_KEYS
    secret: firebase-sa-prod     # Cloud Secret Manager; never a literal value
```

- **BUILD vs RUNTIME, both directions:** `NEXT_PUBLIC_*` must be BUILD-available — Next inlines it into the bundle at `next build`; only genuinely request-time values get `availability: [RUNTIME]`. An API app's eager Zod parse at module load means **no `availability:` blocks at all** there (a RUNTIME-only var crashes the build).
- **Base vs overlay per YAML line** — "does the value differ per env?": no (shared secret **references**, runtime defaults) → base; yes (project ids, bucket names, `APP_ENV`) → overlay.
- **Secret-grant ordering:** `apphosting:secrets:set` grants access only to backends existing **at that moment** — create secrets after the backend, or run `apphosting:secrets:grantaccess` for late backends. The #1 App Hosting build-failure cause.
- **Env-name typo = silent base-only config** — ship a health endpoint echoing the resolved tier and check it after the first rollout.
- **Secrets resolve at build unless version-pinned** — rotating a secret requires a new rollout to take effect.
