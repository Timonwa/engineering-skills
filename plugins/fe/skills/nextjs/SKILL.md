---
name: nextjs
description: >-
  Next.js 16 App Router code — the version-matched docs first, Server and Client Components and the `use client` boundary, async request APIs and typed routes, reads through typed fetchers, Cache Components (`use cache`, `use cache: private`, `cacheLife` tiers, tags), Suspense and streaming, Server Actions as public endpoints that answer an action result, `updateTag` after a write, Route Handlers, error boundaries, `after()`, Proxy, images, and Turbopack traps. Use when writing or reviewing App Router code.
---

# Next.js (App Router, 16)

Server-first Next.js: pages render on the server, a Client Component is the interactive leaf, data is read on the server and cached on purpose, and every mutation is a Server Action that checks its caller and tells the cache what changed. Folder structure and the special files are `code-structure`'s; React itself is `react`'s.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Read the version's own docs first

Next changes between minor versions. Before assuming how an API behaves, read the docs that ship with the installed version (`node_modules/next/dist/docs/`, or the copy the project keeps); the web's answers are often a version behind. Whether Cache Components is on, which `cacheLife` tiers exist and their values are project facts.

## Server first

- **Everything is a Server Component** until it needs state, effects, event handlers, browser APIs or context. `"use client"` goes on that interactive leaf, never on a page or layout to make a child work.
- **`"use client"` is a boundary**: every module a client file imports joins the bundle. Pass Server Components into a Client Component as `children` or props rather than importing them.
- **Data and actions go down as props.** A Server Component reads, then passes serialisable data and Server Actions to its client leaves — only the fields the leaf uses, since every prop is serialised into the page.
- **Stream a promise** when a client leaf needs data: start the read on the server without awaiting, pass the promise, read it with `use()` under `<Suspense>` (`react`).
- **No shared mutable state at module level on the server** — one module serves every request, so a variable there leaks between users.

## Request APIs are async

- `params`, `searchParams`, `cookies()`, `headers()` and `draftMode()` are promises; `await` them.
- **Type routes with the generated helpers** — `PageProps<'/events/[eventId]'>`, `LayoutProps<…>`, `RouteContext<…>` — produced by `next typegen` (run before `tsc`, `typescript`).
- A component that reads request data sits in its own `<Suspense>`, so the rest of the page stays in the static shell.

## Reading data

- **Reads live in the server's `data/` kind** and go through the project's typed fetchers — never a raw `fetch` in a component (`code-structure`). An API that sends `Cache-Control: no-store` still gets cached here, in the app's own cache (`api-architecture`).
- **No waterfalls:** independent reads start together (`Promise.all`); sequential `await`s only for reads that depend on each other. Cheap checks run before an expensive await, not after.
- **React `cache()`** dedupes a read within one request — the page, `generateMetadata` and nested components share one call.
- **Client-side fetching** is the exception: a caching library (TanStack Query, SWR), never `fetch` in `useEffect`.

## Caching — Cache Components

The house model is **Cache Components** (`cacheComponents: true`): a page is a static shell, cached regions and streamed request-time holes. Detail, tiers and examples are in [references/caching.md](references/caching.md).

- **`use cache`** caches a function's or component's result for everyone; its arguments are the key. It can't read `cookies()`, `headers()` or `searchParams` — read them outside and pass the values in.
- **Read runtime values outside, pass them in.** The default for anything that depends on the caller is to read `cookies()` or `headers()` outside the cached scope and pass the values into a `use cache` function as arguments, which become the key.
- **`use cache: private`** is the exception: per user, in the browser's memory only, never on the server, for data the project keeps off the server (the current user, `auth`) or a read that can't be refactored. It runs on every server render, so it saves the browser a fetch, not the server the work.
- **A cached read sits in a `…WithData` component** behind its own `<Suspense>`, which reads, caches and renders; the page composes it.
- **`cacheLife` names a tier** defined once in config, by how fresh the data must be. Thresholds matter: `stale` under 30 seconds, `revalidate` of 0 or `expire` under 5 minutes leave the result out of prerendering — a request-time hole — and `stale` under 5 minutes keeps it out of the app shell. A near-live tier needs the owner's say-so.
- **`cacheTag`** takes a name from one constants module, never a literal, so writers and readers agree.
- **Never cache a scope that can redirect or call `notFound()`**, or whose answer depends on who's asking — the decision would be served to everyone.
- **Every route must prerender:** reading request data, or uncached data (a fetch, a database read), outside `<Suspense>` fails the build. Fix it — cache the read, push it into a leaf behind `<Suspense>`, or `await connection()` before `Date.now()` or `Math.random()`.
- **The request-API ban follows the call stack:** a helper a `use cache` function calls can't read `cookies()` either, and on a dynamic route that can pass `next build` and fail under `next start`.
- **`generateMetadata` follows the same rules**: metadata that reads runtime or uncached data defers to request time, and on an otherwise static page Next asks you to cache it or mark the deferral as intended.
- **`unstable_cache` isn't used**; route segment `dynamic` and `revalidate` exports don't exist under Cache Components.

## Mutations — Server Actions

- **Every Server Action is a public `POST` endpoint.** Anyone can call it directly, so it authorises the caller and validates its input with the shared schema every time, like an API route (`backend-security`, `schemas-and-contracts`).
- **It answers an action result**, never a thrown error — `{ success: true, data }` or `{ success: false, error, fieldErrors, values }` — so the form shows each message beside its field (`schemas-and-contracts`), and `values` (the submitted fields) come back as each input's `defaultValue`, because React resets uncontrolled fields when an action completes (`react`).
- **After the write, `updateTag` on everything it changed.** It expires those entries at once, re-renders the current route in the action's response and clears the browser's whole client cache, private scopes included — so `refresh()` beside it is redundant. `refresh()` is for an action that changed nothing tagged. Both are Server Action–only; a Route Handler uses `revalidateTag(tag, 'max')`, or `revalidateTag(tag, { expire: 0 })` when a webhook's change must show at once.
- **`redirect()` throws**, so it comes after the cache calls.
- **Closures aren't a vault.** Values an inline action closes over travel to the browser and back encrypted, but secrets never go there. Separate builds serving one app share `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, or actions fail with "Failed to find Server Action"; a rolling deploy sets `deploymentId` so an old client reloads instead of calling a missing action.
- **`experimental.serverActions.allowedOrigins`** is set only for a known proxy in front of the app; Next already compares `Origin` with `Host`. A body over 1 MB is refused unless `serverActions.bodySizeLimit` raises it — uploads go to storage, not through an action (`image-handling`).
- **Pending and optimistic UI** with `useActionState` and `useOptimistic` (`react`); forms work without JavaScript.

## Route Handlers

- **`route.ts`** with the Web `Request` and `Response`; typed with `RouteContext`. For webhooks, callbacks and a few endpoints that must be URLs — never to re-serve data a Server Component reads directly.
- **Under Cache Components a `GET` handler is prerendered** when it reads no runtime or uncached data, and runs per request otherwise; cache its data by calling a `use cache` function — the directive can't sit in the handler itself. Other methods are never cached.

## Metadata

- **`metadata`** for static values, **`generateMetadata`** when they depend on data, sharing the page's read through `cache()`. What goes in them is `seo-aeo-geo`'s; the metadata files (`opengraph-image`, `sitemap`, `robots`) are `code-structure`'s.
- **`ImageResponse`** renders a flexbox subset of CSS (no grid) and only the fonts passed to it, fetched explicitly; keep its output deterministic so it caches.

## Errors and after the response

- **`error.tsx` beside the segment it guards** — usually the route group's, not one per page — and it covers everything nested below. It doesn't catch the `layout.tsx` beside it, so a layout that can throw (a gate, a provider) is caught one level up; `global-error.tsx` catches the root layout.
- **`catchError`** wraps a smaller part of the tree in a boundary that lets `redirect()` and `notFound()` through.
- **`notFound()`** for a missing or hidden resource; `forbidden()` and `unauthorized()` need the experimental `authInterrupts`.
- **`after()`** runs work after the response — audit entries, analytics — without the request waiting and without being dropped when the response ends (`audit-log`).
- **`onRequestError`** in `instrumentation.ts` reports server errors (`code-structure`).

## Navigation and images

- **`next/image`** for content images, with a real `sizes`, and every external host listed in `images.remotePatterns`. `priority` is deprecated: the LCP image uses `loading="eager"` or `fetchPriority="high"` (rarely `preload`, never with them). A replaced image's URL changes with its version (`?v=`), and the action's re-render carries the new URL down (`image-handling`).
- **The route announcer** reads `document.title`, then the `<h1>`, on every client navigation — so every page has a unique title — but it doesn't move focus; where focus lands is the project's call (`accessibility`).
- **`<Link>`** prefetches visible links; `prefetch={false}` for long lists.
- **`generateStaticParams`** prerenders known values; under Cache Components it must return at least one, and `dynamicParams` isn't available.
- **`useSearchParams`** needs a `<Suspense>` above it.

## Proxy

`proxy.ts` (formerly Middleware) runs before every matched request: CORS, the CSRF origin check, maintenance gates, rewrites, and redirects based on a cookie's presence — never a session check, slow reads or authorisation (`auth`, `maintenance-mode`). Plain redirects belong in `next.config`'s `redirects`.

## Tooling traps

- **Turbopack is the default bundler.** MDX remark and rehype plugins are named as strings with serialisable options, or they can't load.
- **The React Compiler** (`reactCompiler: true`) handles memoisation (`react`).
- **`optimizePackageImports`** for third-party packages that export everything from one barrel.
- **Secrets stay server-only** — `import "server-only"` on server modules, nothing secret behind `NEXT_PUBLIC_` (`env`). Security headers and the CSP are `frontend-security`'s.

## Avoid

- `"use client"` on a page or layout; importing a Server Component into a client module.
- A raw `fetch` in a component; sequential awaits for independent reads; fetching in `useEffect`.
- Request data read outside `<Suspense>`; a `use cache` scope that redirects or depends on the caller.
- A Server Action that doesn't check its caller, throws instead of answering, or loses the submitted values on an error.
- `priority` on `next/image`; authorisation in Proxy; a secret in a closure or `NEXT_PUBLIC_`.

## Related skills

Files and folders `code-structure` · React `react` · sessions and the current user `auth` · the API the app reads `api-architecture` · schemas and action results `schemas-and-contracts` · env `env` · headers and CSP `frontend-security` · metadata and OG images `seo-aeo-geo` · images `image-handling` · flags `feature-flags` · the audits `frontend-audit`, `performance-audit` · adopting Cache Components `next-cache-components-adoption`, tuning it `next-cache-components-optimizer`, partial prefetching `next-partial-prefetching-adoption`, checking a change in the running app `next-dev-loop` (all official).
