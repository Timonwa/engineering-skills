# Next.js caching and revalidation

The detail behind the Caching and Mutations sections of `SKILL.md`, on Next 16 with Cache Components. Check every behaviour against the installed version's own docs.

## Contents

- [Deciding, for each piece of data](#deciding-for-each-piece-of-data)
- [The three directives](#the-three-directives)
- [A cached read](#a-cached-read)
- [cacheLife tiers](#cachelife-tiers)
- [Tags](#tags)
- [After a mutation](#after-a-mutation)
- [Prerendering and blockers](#prerendering-and-blockers)
- [Adopting Cache Components](#adopting-cache-components)

## Deciding, for each piece of data

1. **The same for everyone and known at build** — prerendered; nothing to do.
2. **The same for everyone, from a live source, fine to serve a little stale** — `use cache` with a tier and a tag.
3. **Different per person** — read the cookie outside and pass the value into `use cache`; `use cache: private` only when the data must stay off the server or the read can't be refactored.
4. **Must be fresh on every request** — not cached; streamed behind `<Suspense>`.

The two traps: treating shared data as per-request (refetched for every visitor), and caching per-person data with `use cache` (one person's data served to everyone).

## The three directives

| Directive            | Stored                                                      | May read `cookies()`, `headers()`, `searchParams` | For                                                       |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| `use cache`          | the server's cache (in memory per instance by default)      | no — read outside, pass the values in             | shared data and rendered output                           |
| `use cache: private` | the browser's memory only, never the server; lost on reload | yes                                               | personal data kept off the server; runs every render      |
| `use cache: remote`  | a cache handler the platform provides (Redis, KV)           | no                                                | shared data that must survive across serverless instances |

None of them survives a deploy: the build id is part of every key. `connection()` is allowed in none of them.

On serverless hosting, the default in-memory `use cache` is per instance, so an entry may be recomputed on another instance; that's a cost to watch, not a correctness problem.

## A cached read

```tsx
// components/events/EventListWithData.tsx — reads, caches and renders behind the page's Suspense
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { fetchPublicEvents } from "@/lib/server/data";

export async function EventListWithData() {
  "use cache";
  cacheLife("frequent"); // public listings change through the day; a few minutes stale is fine
  cacheTag(CACHE_TAGS.events.public);
  const events = await fetchPublicEvents();
  return <EventList events={events} />;
}
```

```tsx
// the signed-in person's own data
export async function MyTicketsWithData() {
  "use cache: private";
  cacheLife("frequent");
  cacheTag(CACHE_TAGS.account.tickets);
  const tickets = await fetchMyTickets(); // the typed fetcher forwards the session cookie
  return <TicketList tickets={tickets} />;
}
```

- **Arguments and closed-over values are the key**, so two inputs get two entries.
- **A one-line comment says why that tier**; the code can't.
- **A scope that may redirect or call `notFound()` isn't cached** — check first, outside, then call the cached reader.

## cacheLife tiers

Define tiers once, by how fresh the data must be, and call them by name everywhere; keep the same names in every app. The values are the project's.

```ts
// next.config.ts — stale: the browser may reuse it · revalidate: refreshed in the background · expire: hard ceiling
const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    realtime: { stale: 30, revalidate: 60, expire: 300 }, // live counters; needs the owner's say-so
    frequent: { stale: 300, revalidate: 900, expire: 3_600 }, // lists that move through the day
    daily: { stale: 300, revalidate: 86_400, expire: 604_800 }, // articles, profiles
    static: { stale: 300, revalidate: 2_592_000, expire: 31_536_000 }, // changes only through our own writes
  },
};
```

Why the thresholds matter (the `cacheLife` docs' prerendering behaviour):

- `stale` under **30 seconds** — excluded from prerenders, because a prefetch would expire before the click; a request-time hole.
- `stale` under **5 minutes** — prerendered, but not part of the route's app shell.
- `revalidate` of 0 or `expire` under **5 minutes** — never prerendered; a request-time hole that needs its own `<Suspense>`.

The built-in profiles (`seconds`, `minutes`, `hours`, `days`, `weeks`, `max`, `default`) can be redefined, but named tiers say why.

## Tags

```ts
// lib/constants/cache.constant.ts
export const CACHE_TAGS = {
  account: { currentUser: "account:current-user", tickets: "account:tickets" },
  events: { public: "events:public", detail: (eventId: string) => `event:${eventId}` },
} as const;
```

A reader tags what it read; a writer expires every tag its change touched, including aggregates that include it.

## After a mutation

```ts
// lib/server/actions/event.action.ts
"use server";

export async function publishEvent(eventId: string): Promise<ActionResult<Event>> {
  const result = await callApi(`events/${eventId}/publish`, { method: "POST" }); // the API checks the caller
  if (!result.success) return result;
  updateTag(CACHE_TAGS.events.detail(eventId));
  updateTag(CACHE_TAGS.events.public); // also re-renders the route and clears the client cache
  return result;
}
```

| Call                                | Where                          | Effect                                                       |
| ----------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| `updateTag(tag)`                    | Server Actions only            | expires at once; the next read waits for fresh data          |
| `refresh()`                         | Server Actions only            | re-renders the route when nothing tagged changed             |
| `revalidateTag(tag, 'max')`         | Server Actions, Route Handlers | marks stale; served stale while refreshing in the background |
| `revalidateTag(tag, { expire: 0 })` | Route Handlers (webhooks)      | expires at once, where `updateTag` isn't available           |
| `revalidatePath(path)`              | Server Actions, Route Handlers | the whole route — when the tags aren't known; prefer tags    |

Any of these in a Server Action re-renders the current route in the action's response and clears the whole client cache, private scopes included, so one is enough. A change the app didn't make (a worker finishing, a webhook) reaches the cache through a Route Handler calling `revalidateTag`. `redirect()` throws, so it comes after these calls.

## Prerendering and blockers

Under Cache Components every route must prerender. The build fails on four kinds of blocker:

1. **Request data read outside `<Suspense>`** — `cookies()`, `headers()`, `await params`, `await searchParams`. Move the read into a leaf behind `<Suspense>`, passing the promise down.
2. **Uncached data read outside `<Suspense>`** — a `fetch` or a database call during the prerender pass (`blocking-prerender-dynamic`). Cache it with `use cache`, or move it behind `<Suspense>`.
3. **Non-deterministic values while rendering** — `Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID()`. `await connection()` first, behind `<Suspense>`, or cache the component so everyone sees the same value.
4. **A `use cache` scope that reads request data**, directly or in a helper it calls — read outside and pass the value in, or, rarely, use `use cache: private`.

**Place `<Suspense>` low.** Wrap the smallest leaf that waits, so the static shell is as large as possible; an element in both the fallback and the resolved tree belongs above the boundary. Reuse the route's `loading.tsx` or the component's `…Skeleton` as the fallback, never a new one that drifts.

**The build's route glyphs:** `○` static, `◐` partial prerender (a static shell with streamed holes — the goal for pages with signed-in data), `ƒ` dynamic.

**`export const instant`** asks Next to check that navigation into a segment shows its UI at once. `instant = false` marks a segment as allowed to block — the way to adopt Cache Components route by route — but it doesn't make a route dynamic, and `new Date()` or `Math.random()` still fail its prerender.

## Adopting Cache Components

`dynamic`, `revalidate` and `fetchCache` segment exports can't coexist with `cacheComponents`: translate each into `use cache` and tiers (only `dynamic = 'force-dynamic'` is safe to delete). `dynamicParams` isn't available, and `generateStaticParams` must return at least one param. The official `next-cache-components-adoption` and `next-cache-components-optimizer` skills run the migration; this reference holds the principles.
