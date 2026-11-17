---
name: maintenance-mode
description: >-
  A kill switch for a web app — one flag read by two gates (the API's, which protects the data, and the pages', which explains), never on the admin app or the paths that end an outage, a 503 with Retry-After and no-store, the maintenance page served from the proxy, robots.txt left reachable, a bypass URL that 404s on a bad token, both gates failing open, scheduled windows and notice, read-only mode as the gentler option, and the drill. Use when building, changing or running maintenance mode.
---

# Maintenance mode

One flag takes the product offline for users while operators keep working. **Two gates read it**: the API's refuses requests with a 503, which is what protects the data; the pages' answers with a maintenance page, which is what people see. And the switch **never locks out the people who turn it off**.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The flag and its two gates

- **One flag**, with the lifecycle and audit trail of any flag (`feature-flags`), and a window (`startsAt`, `endsAt`).
- **The API's gate is the real switch.** It runs in the API's proxy, before any handler, so scripts, open tabs, mobile clients and integrators all meet it whether or not they load a page. A gate on the pages alone is theatre.
- **The pages' gate explains.** It runs server-side, in each frontend's proxy — never in client code, which flashes real content and fails on the very errors it should explain.
- **The proxy reads a mirror, not the store.** Every write to the flag copies `{ enabled, startsAt, endsAt }` to one fast key (`redis`), with no TTL — it's rewritten on every change, and an expiry would end maintenance mid-window. A frontend with no access to that key reads the API's public window instead, kept in memory for a few seconds with a short timeout.

## Never gate the way out

These answer during maintenance, always:

- **The admin app** — no gate at all. It's the control plane, where the switch is turned off.
- **The API routes the admin app needs** — operator sign-in and session, the operator's own profile, the flag routes, never customer sign-up or sign-in, which would write accounts mid-migration — and **the public window read** the maintenance page shows.
- **Health and cron.** A monitor must tell "in maintenance" from "down", and the scheduler keeps ticking — but every task except the window reconciler skips its run while maintenance is on, so nothing writes under a migration.
- **Inbound webhooks**, which accept and record the event, and process it only once maintenance ends — a 503 spends the provider's retries, and the delivery can be lost for good (`api-architecture`).
- **`robots.txt` and other static files.** A 5xx on `robots.txt` makes Google stop crawling the whole site.
- **The bypass route.**

The allowlist is prefix matches, checked before the flag is read, so exempt paths pay nothing. A path joins it only because ending the outage, keeping data, the maintenance page or the infrastructure needs it; everything else is gated by default.

## The response

- **503 with `Retry-After`** — the seconds until `endsAt`, or a default (30 minutes is a starting point) — and `Cache-Control: no-store`, so no cache keeps the outage. Never a 200: a crawler would index the maintenance page in place of the content, and a monitor would read it as healthy.
- **The API's body is the shared error envelope** (`api-architecture`) with a stable code, a message and the window, so a client can show when service resumes. CORS headers go on it too, or a browser can't read it.
- **The pages' gate serves the maintenance page's HTML itself, with the 503.** Rewriting to the page loses the status — a prerendered page carries its own 200 — so the proxy fetches the page, keeps it in memory briefly, and returns it with the 503 and the window. Non-`GET` requests get a bare 503. If the page can't be fetched, a line of plain text goes out with the 503 instead.
- **Keep it short for search.** Google treats a 503 as temporary for a day or two; a site down longer needs an indexable page that says what's happening, not a wall of 503s.

## The bypass

- **One URL**, `/maintenance-bypass?token=…`, sets an `httpOnly`, `Secure`, `SameSite=Lax` cookie for 24 hours and redirects home. Both gates accept it, so an operator or a developer can use the live product while everyone else sees the page.
- **A wrong or missing token is a 404**, never a 401 or 403, which would confirm the route exists. Compare it in constant time; an unset token disables the bypass rather than opening it.
- **The cookie must reach the API**, so the apps and the API share its domain — and a frontend's server-side calls to the API forward it, or an operator past the page gate still gets a 503 on every read.
- **The token sits in a URL once**, so it reaches access logs and history; the route redirects to a clean URL, and the token is rotated after every use.
- **The token is 32 random bytes or more**, set on every deployed tier, and rotated after every use — it gets pasted into chats.
- **Staff use the URL too.** Letting a staff session through would cost a profile read per request in the proxy.

## When the flag can't be read

- **Both gates fall back in order** — the mirror, then the store, then the last value they read (kept in memory), and only with nothing read, "not in maintenance" — with a log and an alert, the same ladder as every flag (`feature-flags`). Maintenance is off almost always, so failing closed would turn every store blip into an outage of its own (`redis`: a timeout is a failure).
- **Failing open has a cost:** if the store dies mid-window, the gate drops. When the window protects a migration that must not race with writes, back it at the data layer as well — the database read-only, or the app's write access removed — and restore it after.

## Read-only mode

The gentler option, often the better one: reads keep working and only writes are refused, with a 503 and a code of their own so the UI can disable the forms and say why. It suits a migration of one area, a provider outage, or a slow move to new infrastructure. It's a second state of the same switch, never a second mechanism.

## Running it

- **Admins flip the switch and set windows**; every flip is audited with the actor, the time and the change (`feature-flags`).
- **Scheduled windows** are applied by the cron reconciler on each tick, so an edge can land up to one tick late. Inside a window the reconciler turns maintenance on, so **ending early means clearing the window** as well as switching off — or the next tick switches it back on.
- **Tell people first:** announce a planned window ahead — a banner, and an email for a long one — in the reader's own timezone, at the quietest hours. A status page on separate infrastructure carries live updates, and the maintenance page links to it.
- **Emergencies use the same switch**, never a second path, so the drill is what you'll use at 3am.
- **Know the delay:** each cache between the flag and the gate adds to how long a flip takes; time a migration's start from the worst case.
- **The exit:** check the critical flows through the bypass while still gated; switch off and clear the window; confirm with a fresh request that the 503s have stopped; rotate the bypass token; replay any queued webhook events; write up an emergency.
- **Drill it on staging** — flip, page, 503, bypass, exit — before it's needed. An untested kill switch fails when it matters.

The two gates and the bypass route, in code, are in [references/gates.md](references/gates.md).

## Do / Don't

- **Do** gate the API as well as the pages; exempt the way out; send 503 with `Retry-After` and `no-store`; serve the page's HTML from the proxy; 404 a bad bypass token; fail both gates open and back a risky migration at the data layer; clear the window when ending early; announce planned windows; drill it.
- **Don't** gate the admin app, health, cron, webhooks or `robots.txt`; answer maintenance with a 200; rewrite to a prerendered page; return 401 or 403 from the bypass; give the mirror a TTL; build a second switch for emergencies; keep the site behind 503s for days.

## Related skills

The flag's lifecycle and schedule `feature-flags` · the error envelope, webhooks and cron `api-architecture` · the mirror and failure directions `redis` · proxy and route-handler mechanics `nextjs` · constant-time comparison and the 404 `backend-security` · the bypass token as a secret `env` · deploys and rollback, which are not a maintenance flip `devops` · crawlers and 503 `seo`.
