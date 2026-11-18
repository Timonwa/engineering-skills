# The gates, in code

The API's gate, the pages' gate and the bypass route behind `SKILL.md`.

## Contents

- [The API's gate](#the-apis-gate)
- [The pages' gate](#the-pages-gate)
- [The bypass route](#the-bypass-route)

## The API's gate

```ts
// the API's proxy — in front of every /api/* route
const MAINTENANCE_EXEMPT_PREFIXES = [
  "/api/v1/admin/auth/", // operators sign in mid-outage; customer sign-in stays gated
  "/api/v1/admin/", // where the switch is turned off
  "/api/v1/public/maintenance-window", // the maintenance page shows it
  "/api/v1/health",
  "/api/v1/cron/",
  "/api/v1/webhooks/", // record now, process after
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isExempt = MAINTENANCE_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isExempt && !hasValidBypassCookie(request)) {
    const state = await readMaintenanceState(); // mirror → store → last value read → off; alerts on each fallback
    if (state.enabled) {
      return maintenanceErrorResponse(state, request); // 503, Retry-After, no-store, CORS, the envelope
    }
  }
  return NextResponse.next();
}

function hasValidBypassCookie(request: NextRequest): boolean {
  const token = env.MAINTENANCE_BYPASS_TOKEN;
  if (!token) return false; // unset means no bypass, never an open door
  const cookieValue = request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value ?? "";
  return isTimingSafeEqual(cookieValue, token);
}

function buildRetryAfterSeconds(endsAt: number | null): number {
  if (!endsAt) return MAINTENANCE_RETRY_AFTER_SECONDS;
  const seconds = Math.ceil((endsAt - Date.now()) / 1000);
  return seconds > 0 ? seconds : MAINTENANCE_RETRY_AFTER_SECONDS;
}
```

## The pages' gate

In order: an exempt path passes before anything is read; a valid bypass cookie passes; then the window is read (a few seconds in memory, a short timeout, any failure reads as off).

```ts
// each frontend's proxy
if (window.active) {
  if (request.method !== "GET") return new Response(null, { status: 503, headers: maintenanceHeaders(window) });

  // Fetch the page and serve its HTML: a rewrite would carry the prerendered page's 200.
  const html = await fetchMaintenancePageHtml(window); // cached briefly per window; plain text if it fails
  return new Response(html, {
    status: 503,
    headers: { ...maintenanceHeaders(window), "Content-Type": "text/html; charset=utf-8" },
  });
}

// maintenanceHeaders: Retry-After, Cache-Control: no-store
```

The proxy's matcher leaves out framework assets and every path with a file extension, so `robots.txt`, the sitemap and images are never gated. A client-side navigation that gets HTML back instead of data falls back to a full page load, which the gate answers like any other.

## The bypass route

```ts
// /maintenance-bypass on each frontend
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!env.MAINTENANCE_BYPASS_TOKEN || !isTimingSafeEqual(token, env.MAINTENANCE_BYPASS_TOKEN)) {
    return new Response(null, { status: 404 }); // a bare 404: confirms nothing about the route
  }
  (await cookies()).set(MAINTENANCE_BYPASS_COOKIE, env.MAINTENANCE_BYPASS_TOKEN, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    domain: COOKIE_DOMAIN, // shared with the API, so its gate sees the cookie too
    maxAge: 86_400,
  });
  redirect("/");
}
```

The cookie holds the token itself, so the API's gate can compare it with its own copy; rotate the token after every use.
