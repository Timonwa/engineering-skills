---
name: feature-flags
description: >-
  Database-backed runtime feature flags — the safe-default-false evaluation ladder, a typed flag-name union, two-tier caching with a stated staleness bound, server-resolve into a provider prop, the draft, published and archived lifecycle, and cron-reconciled scheduled rollouts. Use on "feature flag", "feature toggle", "gate this feature", "flag rollout", "scheduled rollout", "flag caching".
---

# Feature flags

House standard for **database-backed runtime feature flags** — toggles an admin flips live, without a redeploy. Store-agnostic (Firestore is the reference implementation where an example needs one); the single principle underneath everything: **a flag the system cannot positively prove ON is OFF.**

## When a flag — and when never

- **A flag is a runtime product toggle** — feature gating, a kill switch, maintenance mode, a time-boxed rollout. It changes what users experience, and an admin must be able to flip it while the system runs.
- **Env vars own deploy-time config; flags own runtime toggles.** If changing it should require a redeploy (API hosts, credentials, tuning constants), it's an env var (→ `devops`); if an admin flips it live, it's a flag. Don't smuggle config into flags to dodge a deploy.
- **NEVER gate security or authorization with a flag.** Access control is RBAC/permissions — identity-aware, guarded per request, audited per denial (→ `backend-security`, `api-architecture`). Flags are coarse, cached (so stale), and mutable by anyone with flag-admin rights; a flag flip must never grant or revoke access to anything.
- **Never put a secret in a flag, and don't derive billing entitlements from one in this design.** Secrets live in the secret store. Entitlements need per-user identity and these flags carry none — they resolve from global state plus at most a coarse segment — so derive entitlement from the user's plan record instead. That's a property of _this_ architecture, not a universal law: identity-aware vendors do support entitlement flags (LaunchDarkly documents them; Fowler calls them permissioning toggles), and adopting one is a different design rather than a broken rule.
- **Publishing a flag is the exposure opt-in — treat every published flag's name, description, and state as world-readable.** The evaluate endpoint is unauthenticated, so a published flag's name reaches anyone who looks; never publish one whose name discloses an unannounced feature, a customer, or a security control. Draft flags stay invisible (ladder step 3), which is what makes the draft state worth having. Vendors model this same boundary as an explicit per-flag client-side-availability toggle rather than a blanket "flag states aren't secrets".
- **Targeting stays few and explicit — house choice: global plus at most one segment axis** (e.g. country). This is a deliberate scope limit, not a claim that more is wrong. A plain canary is genuinely cheap — a stable hash of the user id modulo 100 is a few lines (Fowler's canary-release toggle) — so add it when you need it. What is _not_ cheap is experimentation: A/B measurement needs stable bucketing plus exposure logging plus analysis tooling, which is a deliberate build or a vendor product rather than a field bolted onto a boolean system.

## Data model

- **One record per flag; record id = flag name** — O(1) lookup, no query. Fields: `name`, `description`, `enabled` (boolean), `status` (`"draft" | "published"`), targeting (e.g. `enabledCountries` — empty means everywhere), `createdAt`/`updatedAt`, `archivedAt` (unset unless archived), optional `startsAt`/`endsAt` window.
- **Names are `UPPER_SNAKE_CASE`, validated, and immutable.** Match `/^[A-Z][A-Z0-9_]*$/`; sanitize on the client (as the admin types) AND on the server before the write. Name and description are set at creation and never edited — renaming a live flag orphans every code reference, which safe-default-false then silently turns off.
- **New flags are born `draft` + `disabled`** — inert until someone deliberately publishes AND enables them. Two independent switches: `status` is "may the public see this flag at all"; `enabled` is "is it on". The two-switch split is a house convention — no major vendor ships a "draft" state, and LaunchDarkly's nearest analog is a per-flag client-side availability opt-in — and it exists so a flag can be created, code-referenced, and reviewed before it is externally visible.

## Evaluation ladder — safe default false

Every branch that isn't provably "published + enabled + in scope" returns `false`. An unknown or unreachable flag is OFF, never ON — a flip must never expose unfinished work, and an outage must never turn features on.

1. Flag doesn't exist → `false`
2. `archivedAt` set → `false`
3. `status` not `"published"` → `false` (drafts are invisible to users regardless of `enabled`)
4. `enabled` is `false` → `false`
5. No targeting (empty segment list) → `true`
6. Caller's segment in the target list → `true`
7. Otherwise — including a caller with no segment context — → `false`

- **The store being down resolves to the last known catalog** — or `false` for every flag if there has never been a successful read (see the cache contract below). The resolving fetcher catches; evaluation never throws to the caller and never throws on unknown names.
- **House choice: the default is hardcoded `false`, not caller-supplied.** OpenFeature (the vendor-neutral spec) makes `defaultValue` a required parameter at every call site, so a caller there can legitimately default a flag ON. This skill fixes it at `false` because every flag here is a release or kill toggle whose OFF state is the pre-existing behavior. If you adopt an OpenFeature-compatible provider, that call-site default becomes the contract instead — keep the "off means the legacy path" discipline either way.
- **One evaluation function is the only read path** — `evaluateFlag(name, context?)` returning `boolean` (and a batch `evaluateFlags`). Call sites never read the raw record and re-derive visibility; the ladder lives in exactly one place.
- **The public evaluate endpoint returns resolved booleans only** — never the underlying records, so draft and archived flags are unreachable from outside, not merely "returned as false with extra fields".

## Typed flag names

- **Register every code-referenced flag in one `as const` array and derive the union.** Hooks and server helpers accept the union, not `string` — so a typo is a compile error, not a flag that safe-default-false silently evaluates to `false` forever (the failure mode is invisible at runtime precisely because the ladder is safe; the type system is what catches it).
- **Adding a code-referenced flag is two steps in one change:** append to the union, then create the record via the admin UI (or an idempotent create-if-missing seed — never one that clobbers admin-managed state). Until it's published + enabled, consumers see `false`.
- Admin-only experiments that no code references may live only in the database; the moment code reads one, it enters the union.

## Two-tier cache & the staleness contract

- **L1 in-process in front of L2 shared (e.g. Redis → `redis`) in front of the store.** Cache the whole catalog under one key — flag catalogs are small, and one key makes invalidation atomic.
- **The L1 TTL _is_ your propagation guarantee — nothing else.** A peer instance doesn't consult L2 until its own L1 expires, so deleting the L2 key notifies nobody; a mutation is invisible to a peer for up to that peer's remaining L1 TTL no matter what L2 is set to. An L1 of 1 h with an L2 of 60 s does not converge in 60 s — it converges in up to an hour. Set L1 to the convergence you actually need (**30 s is the starting point**; L1 exists to absorb repeated reads within one render, not to hold state for an hour), treat L2's TTL as the backstop for a lost delete plus the thing that keeps store load off N instances, and reach for pub/sub invalidation only when you need convergence faster than a sane L1 TTL.
- **Every mutation invalidates both tiers synchronously.** The L1 wipe is the load-bearing local step (the writing instance must see its own write); the L2 delete serves peers whose L1 has since expired, and the L2 TTL is the backstop if that delete is lost.
- **State the propagation bound as arithmetic, not "eventually":** the writing instance is immediate; peers converge within their L1 TTL; server-rendered pages add their revalidate window (house default 30 s, tagged for on-demand invalidation) — about 60 s worst case with the numbers above. Publish the sum you can point at, and re-derive it whenever a TTL changes.
- **A store outage serves the last known catalog, not all-false.** Dropping every flag to `false` during an outage turns live features off for every user and releases anything a kill switch was holding down — strictly worse than briefly stale state. Keep the last successful catalog and serve it past its TTL while the store is unreachable (logging loudly), and fall back to all-false only when there has never been a successful read. This is the industry norm: LaunchDarkly's SDKs serve last-known values through an outage, and Vercel's Flags SDK falls back to an embedded snapshot.
- **Caches fail open; never-read flags fail closed.** A cache miss or cache-store outage falls through to the next tier and then to last-known state; a flag the system has never successfully read resolves `false`. Don't invert either direction.

## Server-resolve → provider prop

- **The server resolves flags once per request; the client only ever receives booleans.** The root layout (Server Component) calls `getFeatureFlags(context)` and passes the `Record<FlagName, boolean>` into a pure context provider. The provider takes flags as a prop and NEVER fetches.
- **Why never client-fetch:** a client that fetches flags renders the default first and flips after the response — a visible flash of the wrong variant — and issues one request per mount instead of one per page. Server-resolving costs one cached read and the HTML arrives already correct.
- Wrap the resolver in React `cache()` so nested layouts deduplicate to one call; catch inside it and serve last-known state rather than throwing.
- **Refreshing after a toggle** = invalidate the flags cache tag, then `router.refresh()` so the layout re-resolves (mechanics → `nextjs`).

## Lifecycle — create, roll out, retire

- **Each lifecycle transition is its own POST sub-route** — `publish`, `unpublish`, `archive`, `unarchive` — not a generic `PATCH` on `status`, so each transition is independently permission-gated and produces a distinct audit entry (route/guard/audit mechanics → `api-architecture`). Every flag mutation is audit-logged with the actor and rate-limited.
- **Rollout order:** create (draft + disabled) → verify in code behind the union → publish → enable (optionally per segment, or on a schedule). Widening targeting is an edit; going live is `enabled`.
- **Retirement order:** disable → remove every code reference and delete the dead branch (drop the name from the union) → archive. Never archive a flag code still reads — it evaluates `false`, but the dead branch stays shipped.
- **Archive, never delete.** Deleting a flag makes old code paths ambiguous: any surviving reference silently evaluates `false` forever with no record the flag ever existed, and the audit trail loses its subject. Archiving keeps the record and history, evaluates `false` explicitly (ladder step 2), and is reversible — unarchive restores the prior `status` + `enabled` untouched. LaunchDarkly's tech-debt guidance says the same thing (archive rather than delete); it does allow deleting an archived flag later, which is only safe once you have confirmed no code reference survives.

## Scheduled flags — cron-reconciled

- **A time-boxed flag carries `startsAt`/`endsAt`, and a cron tick (house default every 5 minutes) reconciles `enabled` against the window.** Reconcile, don't fire: compare current state to what the window implies and flip only on divergence — idempotent (`"noop"` when nothing changed), so reruns are free and a missed tick self-heals on the next one.
- **The alternative is evaluating the window at read time** — Unleash-style date constraints resolved inside the ladder, which gives exact boundaries and one less moving part. Prefer it when you need sub-minute precision; the cron model earns its keep when the flip must also emit an audit entry and invalidate caches, which a read-time evaluation can't do.
- **Scheduling never outranks the ladder** — the reconciler no-ops on draft or archived flags; a schedule can't turn on what publishing hasn't made visible.
- **A window an admin can set is a window the cron enforces.** Schedule fields that exist on the schema but are acted on for only some flags are a defect — either enforce them for every flag or constrain which flags accept a window; never leave a settable field silently dead.
- **Boundary precision equals tick cadence.** A 5-minute tick flips within 5 minutes of the boundary; align window validation granularity to that and say so in the admin UI.

## Example

```ts
// packages/schemas/src/constants/feature-flag.constant.ts — the one registry; a code-referenced flag enters here first
export const FEATURE_FLAGS = ["MAINTENANCE_MODE", "NEW_DASHBOARD"] as const;
export type FeatureFlagName = (typeof FEATURE_FLAGS)[number];

export const FEATURE_FLAG_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;
```

```ts
// services/feature-flag.service.ts — the ladder lives here and nowhere else
function isLive(flag: FeatureFlagRecord): boolean {
  return flag.status === "published" && flag.enabled && !flag.archivedAt;
}

export async function evaluateFlag(name: string, countryCode?: string): Promise<boolean> {
  const flags = await getAllFlags(); // L1 (30s) → L2 shared (60s) → store, one catalog key; L1 ≤ L2 or peers never see the delete
  const flag = flags.find((f) => f.name === name);
  if (!flag || !isLive(flag)) return false; // unknown, archived, draft, disabled — all OFF
  if (flag.enabledCountries.length === 0) return true;
  return countryCode ? flag.enabledCountries.includes(countryCode) : false; // no caller context → OFF
}
```

```tsx
// app/layout.tsx (Server Component) — resolve once, pass down; the provider never fetches
export default async function RootLayout({ children }: { children: ReactNode }) {
  const flags = await getFeatureFlags(await getViewerCountry()); // cache()-deduped; store failure → last known catalog
  return (
    <html lang="en">
      <body>
        <FeatureFlagProvider flags={flags}>{children}</FeatureFlagProvider>
      </body>
    </html>
  );
}

// any Client Component below the provider
function NewDashboardGate({ children }: { children: ReactNode }) {
  const { enabled } = useFeatureFlag("NEW_DASHBOARD"); // FeatureFlagName union — a typo is a compile error
  if (!enabled) return <LegacyDashboard />;
  return <>{children}</>;
}
```

## Boundaries

- The shared cache tier itself — namespaces, TTL constants, invalidation helpers, what belongs in Redis → `redis`.
- Maintenance mode is this system's most privileged flag with extra rules ordinary flags don't get (the edge-gate mirror, 503 semantics, operator bypass, exempt paths) → `maintenance-mode`.
- Route→service architecture, the state-transition sub-route pattern, RBAC guards, rate limiting, audit logging → `api-architecture`; why authorization must never be a flag → `backend-security`.
- Store mechanics for the reference implementation — Admin SDK access, collections module, timestamps, write-safety → `firebase`. Remote Config as a vendor alternative → `firebase-remote-config-basics`.
- Server/Client component boundary, React `cache()`, fetch tags, `revalidateTag`, `router.refresh()` → `nextjs`; `as const` unions and Zod schemas → `typescript`.
- The env-var vs runtime-config split and secret handling → `devops`; auditing env usage → `env-audit`.
- Project facts — the chosen store, collection/table name, real flag names, cache TTL overrides, cron cadence — live in the consuming project's `AGENTS.md`, never here.
