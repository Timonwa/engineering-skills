---
name: maintenance-mode
description: >-
  A maintenance mode or kill switch for a web app — the two-layer gate (API load-bearing, frontend presentational), the exempt-path allowlist that never gates the incident surface, the 503 and Retry-After contract, an operator bypass that 404s on a bad token, per-layer failure direction when the flag store is down, and activation and exit hygiene. Use on "maintenance mode", "kill switch", "downtime", "503", "bypass token", "take the site offline".
---

# Maintenance mode

A platform-wide kill switch built as **two gates reading one flag** — the API layer refuses non-exempt traffic with a 503, the frontend renders a branded maintenance page. The two principles behind everything here: **the server gate is the one that protects your data**, and **the switch must never lock out the people who turn it off**.

> **Project facts → `AGENTS.md`:** the flag name, exempt-path list, bypass URL and cookie name, admin/status-page hosts, and the env var holding the bypass token.

## The two layers — which one is load-bearing

- **The API/server gate is the real switch.** It runs in the proxy/middleware in front of every API route and returns 503 before any handler executes. This is what protects data integrity during a migration — direct API calls, stale open tabs, mobile clients, scripts, and curl all hit it whether or not they ever load your frontend.
- **A frontend-only maintenance mode is theatre.** The page layer is presentation — a branded explanation with the expected restore time. Anyone who skips the page (or already has it open) still lands writes on the API. Never ship the page gate without the API gate.
- **Both gates read the same flag.** Maintenance mode is a single feature flag (→ `feature-flags`) — one source of truth, one audit trail. When the server gate runs at the edge and can't reach the flag store directly, mirror the flag state (`{ enabled, startsAt, endsAt }`) into a fast store the gate can read on every request.
- **No TTL on the mirrored state.** The mirror is rewritten on every flag mutation; a TTL would silently expire the gate mid-window. Staleness is fixed by writing on mutation, not by expiry.
- **Gate the frontend server-side** (root layout or proxy), never in client JS — a client-side gate flashes real content, breaks on the very API errors it should explain, and is disabled by turning off JavaScript.

## Never gate the incident surface

If maintenance mode can block the tools you need to end maintenance, you have built a self-inflicted lockout. These stay reachable, always:

- **The admin/ops app — no maintenance check at all** on its layout or its API namespace. It is where the switch gets turned off.
- **The auth path** (sign-in, session refresh, sign-out) on both layers. An operator whose session expires mid-incident must be able to get back in.
- **The health endpoint and status page.** Monitors must be able to tell "in maintenance" from "down"; a health check that 503s during planned maintenance pages the on-call for nothing (health-check wiring → `devops`).
- **The bypass-issuance endpoint** (below) and **the endpoints the maintenance page itself calls** (the flag/window read) — otherwise the page can't render its own restore time.

## The exempt-path allowlist

- **Exemptions are prefix matches checked before the flag read** — cheap, and always-allowed namespaces skip the store round-trip entirely.
- **A path earns an exemption only by one of four tests** — (1) it is needed to end the maintenance (admin, auth, bypass); (2) gating it loses data you cannot get back (inbound webhooks — providers retry on a finite budget, then drop the delivery for good); (3) the maintenance experience itself depends on it (the flag/window endpoints, legal pages linked from the maintenance page); (4) it is infrastructure that must keep ticking (health, cron).
- **Exempt webhooks must accept-and-queue, not process.** If writes are unsafe during the migration, the exempted handler persists the raw event and returns 2xx, deferring processing — a 503 spends the provider's retry budget and can lose the delivery permanently.
- **Keep the list short and reviewed.** Every exemption is a hole in the gate; anything that doesn't pass a test above goes behind the 503.

## The HTTP contract — 503 + Retry-After

- **Return 503, never 200 with a maintenance page.** A 200 tells crawlers the maintenance page IS your content (it gets indexed and your real pages get soft-dropped), tells uptime monitors you're healthy, and lets HTTP caches store the outage. 503 is the standard "temporarily unavailable, come back" signal (crawler behavior → `seo`).
- **Always send `Retry-After`.** Compute seconds until `endsAt` when a scheduled window is set; otherwise use a static default — **1800 seconds (30 minutes) is the starting point**, tune to your typical window. Well-behaved clients and crawlers use it to back off instead of hammering.
- **The API body is machine-readable** — the shared error envelope (→ `api-architecture`) with a stable error code (e.g. `MAINTENANCE`), a human message, and `{ startsAt, endsAt }` metadata so clients can render a countdown and distinguish maintenance from a crash.
- **Include CORS headers on the 503** for allowed origins — otherwise browser clients can't read the body and show a generic network error instead of your maintenance message.
- **The frontend maintenance page should also respond 503** where the framework allows (set the status in the proxy, not just render a shell from the layout). If your framework forces a 200 on a layout-rendered shell, treat that as a known gap — at minimum the page must be `noindex`.

## Operator bypass

- **One bypass URL, cookie-based.** `GET /maintenance-bypass?token=<secret>` validates the token against a server env secret, sets an `httpOnly`, `secure` (in production), `sameSite=lax` cookie with **`maxAge` 86400 (24 hours)**, and redirects to `/`. Both gates honor the cookie, so a designated person browses the live site while everyone else sees the page.
- **A bad, missing, or expired token returns 404 — never 401/403.** A 401/403 confirms the endpoint exists and hands probers a lock to pick; a 404 makes the bypass path indistinguishable from a route that was never there (enumeration resistance → `backend-security`).
- **Compare tokens timing-safely** — on issuance and on every cookie check. A plain `===` leaks match-prefix timing.
- **An unset token disables the bypass entirely** (the check fails closed) — a missing env var must not turn into an open door.
- **The token is a high-entropy server secret (32+ random bytes), rotated after every incident** — it gets shared over chat with non-admin helpers, so treat it as burned once maintenance ends.
- **Signed-in platform staff auto-bypass the frontend gate** without the token — wire the staff check into the layout gate, don't make your own admins fish for the URL.

## Per-layer failure direction

Decide — and write down — what each gate does when the flag store is unreachable. Never inherit whatever the client library throws; an unhandled exception is an accidental failure direction.

- **API gate — fail open, loudly.** Store unreachable → treat as disabled, pass traffic, log and alert. Maintenance is off almost all of the time; failing closed turns every flag-store blip into a full self-inflicted outage.
- **Frontend gate — also fail open, for a different reason.** The flag fetch failing must not paint a maintenance page over a working API; if the API really is down, users see truthful error states instead. Catch the fetch error and default the flag to `false` — a crash-to-error-page is an accidental fail-closed.
- **The two directions need not match — reason each one from its blast radius.** The frontend failing closed costs UX on a healthy platform; the API failing closed costs the whole platform. Here both land on open, but by different arguments — state each one in the code.
- **Fail-open has a real cost — back-stop destructive migrations at the data layer.** If the store dies mid-window, the gate silently drops. When maintenance protects a migration that must not race with writes, don't trust the flag alone — also make the database read-only or revoke the app's write credentials for the window, and restore afterwards.

## Activation, audit, and exit

- **Two privilege tiers.** Admins flip the switch and set scheduled windows; only super-admins manage the bypass token and the flag's lifecycle. Every flip is audit-logged (actor, timestamp, before/after) via the flag system's trail (→ `feature-flags`).
- **Scheduled windows are minute-aligned** `startsAt`/`endsAt`; a cron reconciler activates/deactivates within one tick (**5 minutes or less**). A manual disable mid-window is authoritative — the reconciler must never re-engage a window an operator ended early.
- **Know your propagation delay and include it in the window.** Frontend flag reads are cached — cap revalidation at **30 seconds** so a flip lands without a redeploy, and remember the worst case when timing a migration start.
- **Emergency activation is the same switch** — the manual toggle, no separate code path. One mechanism means the drill you ran is the mechanism you use at 3am.
- **Exit checklist:** smoke the critical flows and the health endpoint while still gated (via bypass) → disable the flag → confirm with a fresh un-bypassed request that the 503s stopped and the page is gone → rotate the bypass token → drain/replay the queued webhook deliveries → write the postmortem note if it was an emergency.
- **Drill the whole path in staging before you need it.** An untested kill switch is the worst kind — the bypass token must already exist in every deployed environment, and the flip → page → 503 → bypass → exit loop must have been exercised end-to-end at least once.

## Example

The load-bearing gate, in the API's proxy, following every rule above:

```ts
// proxy.ts — runs in front of every /api/* route.
const MAINTENANCE_EXEMPT_PREFIXES = [
  "/api/v1/auth/", //     operators must be able to sign in mid-incident
  "/api/v1/admin/", //    the surface that turns maintenance off
  "/api/v1/public/maintenance-window", // the maintenance page renders this
  "/api/v1/health", //    monitors must see the truth
  "/api/v1/webhooks/", // handlers accept-and-queue during maintenance
  "/api/v1/cron/",
];

function hasValidBypassCookie(request: NextRequest): boolean {
  const token = env.MAINTENANCE_BYPASS_TOKEN;
  if (!token) return false; // unset secret = bypass disabled, not open
  const cookieValue = request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value;
  return Boolean(cookieValue) && timingSafeStringEqual(cookieValue!, token);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const exempt = MAINTENANCE_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));

  if (!exempt && !hasValidBypassCookie(request)) {
    // Fails open to { enabled: false } and alerts when the store is unreachable —
    // a flag-store blip must not become a platform outage.
    const state = await getMaintenanceState();
    if (state.enabled) {
      let retryAfter = 1800; // starting point when no window is scheduled
      if (state.endsAt) {
        const seconds = Math.ceil((state.endsAt - Date.now()) / 1000);
        if (seconds > 0) retryAfter = seconds;
      }
      return NextResponse.json(
        {
          success: false,
          error: { code: "MAINTENANCE", message: "Briefly offline for scheduled maintenance. Please retry shortly." },
          metadata: { startsAt: state.startsAt, endsAt: state.endsAt },
        },
        { status: 503, headers: { "Retry-After": String(retryAfter) /* …CORS headers for allowed origins */ } }
      );
    }
  }
  return NextResponse.next();
}
```

And the bypass issuance route — a bad token is indistinguishable from a route that doesn't exist:

```ts
// app/maintenance-bypass/route.ts
export async function GET(request: NextRequest) {
  const expected = env.MAINTENANCE_BYPASS_TOKEN;
  const provided = request.nextUrl.searchParams.get("token");
  if (!expected || !provided || !timingSafeStringEqual(provided, expected)) {
    return new NextResponse("Not Found", { status: 404 }); // never 401/403 — don't confirm the path exists
  }

  const cookieStore = await cookies();
  cookieStore.set(MAINTENANCE_BYPASS_COOKIE, expected, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 86_400, // 24h — rotate the token after the incident anyway
  });
  return NextResponse.redirect(new URL("/", request.url));
}
```

## Boundaries

- **The flag machinery** — lifecycle (publish/archive), evaluation, caching tiers, schedule storage, the admin UI → `feature-flags`. Maintenance mode is that system's most privileged flag with rules ordinary flags don't get — a no-TTL fast-store mirror for the edge gate, a bypass cookie, an exempt-path allowlist, 503 semantics, and a stated failure direction; `feature-flags` points here for those.
- **Route architecture, typed errors, and the shared response envelope** the 503 body uses → `api-architecture`.
- **Proxy (formerly Middleware) and route-handler mechanics** (matchers, cookies, redirects) → `nextjs-best-practices`.
- **Deploy orchestration, health-check wiring, and rollback** → `devops` — a bad deploy is a rollback, not a maintenance flip; this skill only rules that health stays un-gated.
- **Why the bypass returns 404, timing-safe comparison, and authz for the flip** → `backend-security`.
- **Crawler and indexing behavior around 503 vs 200** → `seo`.
