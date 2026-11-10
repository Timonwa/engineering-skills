---
name: redis
description: >-
  Server code that touches Redis — the key-builder catalogue and `domain:action` grammar, per-namespace default TTLs, the fail-open contract for caches versus fail-closed for rate limits, locks and dedup, lock TTL sizing, sliding-window limits, client-IP extraction, and what must never live in Redis. Use on "Redis", "Upstash", "cache", "rate limit", "429", "TTL", "distributed lock", "idempotency", "dedup".
---

# Redis patterns

House standard for writing Redis-backed primitives, with **Upstash Redis** (`@upstash/redis` + `@upstash/ratelimit`) as the deliberate default client. One principle: **Redis coordinates and accelerates; it never owns.** Every key comes from a named builder, every key expires, and every primitive declares its failure direction.

## Client & transport (Upstash REST)

- **One shared client** — a single module exports one `new Redis({ url, token })` (or `Redis.fromEnv()`); never construct a second client per request, helper, or module. URL and token come from the schema-validated env object so a missing credential fails at boot, not at first use (→ `devops`).
- **REST means per-command HTTP** — there is no persistent connection, which is exactly why it suits serverless (no socket pooling, no reconnect logic), but every command is a full network round-trip. Budget roughly ≤3 Redis round-trips per request path; an awaited call inside a loop is a defect.
- **Batch multi-key work** — `mget` over N `get`s; enable `enableAutoPipelining: true` so concurrent commands (`Promise.all`) collapse into one HTTP pipeline, or use an explicit `redis.pipeline()…exec()` for a fixed batch.
- **On a classic TCP Redis this differs** — with ioredis a persistent socket makes per-command latency sub-millisecond, so pipelining is an optimization rather than a requirement, and the hygiene concern shifts to connection reuse and reconnect handling. Everything else in this skill applies unchanged.
- **Server-only** — the REST token grants full database access; the client never appears in a browser bundle or a shared package a client app imports, and the token is never logged or echoed in errors.
- **Let the SDK own serialization** — `set` JSON-serializes non-string values and `get<T>` parses them back; never `JSON.stringify` yourself and then `get<T>` an object, and never mix codecs between the writer and the reader of a key.

## Key namespace catalogue & builders

- **Every key comes from a named builder function** — one `REDIS_KEYS` module is the only file where a key prefix may appear; call sites never build inline template strings. A builder per namespace makes the keyspace greppable (`grep webhookEvent`), typo-proof, and collision-proof.
- **Naming grammar is `domain:action`** — a short namespace prefix, then colon-separated segments from general to specific: `rl:auth:login:<ip>`, `wh:<provider>:<eventId>`, `cache:plans:active`.
- **Encode user-controlled segments** — any segment derived from user input goes through `encodeURIComponent(…)` so a crafted value containing `:` cannot forge or collide with another namespace's key.
- **Starting catalogue** (add namespaces as needed — each new one is a builder plus a TTL row):

| Prefix   | Purpose                                               | Failure direction   |
| -------- | ----------------------------------------------------- | ------------------- |
| `rl:`    | rate-limit counters (managed by `@upstash/ratelimit`) | closed              |
| `la:`    | login-attempt lockouts per `(ip, email)`              | closed              |
| `wh:`    | webhook event dedup claims                            | closed              |
| `idem:`  | idempotency keys (request → stored response)          | closed              |
| `lock:`  | distributed locks                                     | closed              |
| `cache:` | read-through cache                                    | open                |
| `lb:`    | leaderboards / sorted sets                            | open (derived data) |

## TTL discipline

- **Every key expires** — every `set` carries `ex` / `px` / `exat` / `pxat` (or the rate-limit library manages the expiry). A key with no TTL and no lifecycle is a memory and cost leak that grows forever.
- **Permanent keys need a documented reason** — a comment at the write site saying why permanence is safe and what bounds the growth (e.g. a leaderboard trimmed by a `ZREMRANGEBYRANK` job).
- **Shared TTL presets, not inline magic numbers** — one `REDIS_TTL` constants object (`SHORT: 60`, `MEDIUM: 600`, `HOUR: 3_600`, `DAY: 86_400`, `WEEK: 604_800`) imported everywhere.
- **Per-namespace defaults** (starting points — tune per app, but a TTL that contradicts its purpose is a bug, e.g. a 1 h dedup key against a multi-day retry window):

| Namespace | Default TTL       | Why                                                                                             |
| --------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `rl:`     | the window length | managed by the limiter                                                                          |
| `la:`     | 15 min            | refreshed on each failure; `DEL` on successful login                                            |
| `wh:`     | 7 days            | ≥ the provider's documented retry window; never <24 h in production                             |
| `idem:`   | 24 h              | standard idempotency replay window                                                              |
| `lock:`   | 30–60 s           | above the worst-case critical section (see Locks)                                               |
| `cache:`  | per call site     | 60 s for volatile data, 5–10 min for slow-moving; if callers tolerate no staleness, don't cache |

## Failure direction — the most important rule

- **Caches fail OPEN** — wrap the cache read (and the post-fetch write) in try/catch and fall back to the source of truth. A cache exists to protect latency; the data still lives elsewhere, so a Redis outage must degrade to a slower request, never to a 5xx.
- **Rate limits, distributed locks, idempotency, and dedup fail CLOSED** — no fallback store, no catch-and-continue. If Redis is unreachable, deny (a 5xx on those routes is by design): these primitives exist to say no, there is nothing behind them to degrade to, and failing open converts an infra blip into unlimited brute force, double charges, or duplicate webhook side effects — exactly the window an attacker or a retrying provider will hit.
- **The direction follows what the primitive protects** — performance primitives degrade, security/correctness primitives deny. Never let one helper serve both roles with one error policy.
- **Know the library trap: `@upstash/ratelimit` fails open on a hang by default** — its `timeout` option defaults to 5000 ms, and when Redis doesn't answer in time `limit()` resolves `success: true` with `reason: "timeout"`. Errors still reject (closed); hangs pass (open). For credential-tier limiters, treat `result.reason === "timeout"` as a deny, or set `timeout` deliberately and alert on it — decide this explicitly rather than discovering the default in an incident.

## Caching

- **Read-through helper** — one `cached(namespace, key, ttlSeconds, fetcher)` wrapper (see Example); callers pick the TTL per call site by staleness tolerance.
- **Every cached mutation ships its `invalidate()`** — the mutation that changes the source data deletes the matching cache key in the same change; the TTL is the backstop, not the invalidation strategy.
- **Never cache auth state** — no claims, tokens, sessions, or permission checks in the shared cache; a stale entry there is a security bug, not a freshness bug.
- **Prefer the framework cache where it exists** — in Next.js, data fetched in Server Components belongs in the framework cache (`use cache` + tags → `nextjs`); Redis caching is for the API/service layer where results must be shared across instances and non-framework consumers. Don't build both layers for the same data.
- **Watch for stampedes** — a popular key expiring under concurrent traffic makes every miss recompute at once; for an expensive fetcher, guard the recompute with a short lock or single-flight.

## Rate limiting

- **Sliding window, not fixed** — a fixed window resets at the boundary, so an attacker stacks the end of one window against the start of the next for a `2× maxRequests` burst in seconds; `Ratelimit.slidingWindow(20, "1 h")` weights the previous window's count by its overlap, keeping the worst case bounded at `maxRequests`.
- **Starting budgets** (per IP; labeled starting points — tune per app): credential brute-force targets (login, forgot-password) **5/h**; other auth flows **20/h**; sensitive authed writes **20/h**; authed reads **60/min**; public reads **120/min**, deliberately high because NAT pools share a counter. Preset-to-route mapping and handler placement → `api-architecture`.
- **Key per IP with the `domain:action` prefix** — each prefix is its own counter per IP (`rl:auth:login:<ip>`). Per-IP is the only option on unauthenticated routes; the consequence is that corporate proxies and shared NAT split one budget across many users, which is why public ceilings are generous and per-user keys are preferred once an identity exists.
- **Take the RIGHTMOST trusted `x-forwarded-for` entry** — the leftmost entry is client-supplied and freely spoofable (any client can send its own `x-forwarded-for` header); only the entries appended by your own edge (CDN / load balancer) are trustworthy, so take the rightmost trusted hop. If your platform documents a fixed position for the client IP, follow that documentation — the invariant is "trust only what your infrastructure wrote", never "trust the leftmost". Fall back to `x-real-ip`, then `"unknown"` plus a warning log (never throw).
- **Login lockout on top of the IP limit** — per `(ip, encodedEmail)`: `INCR` + 15 min TTL refreshed on each failure, lock at 5 failures, and **`DEL` the key on successful login** so a legitimate user who recovers their password isn't still locked out.
- **Construct limiter instances once** — `new Ratelimit(…)` compiles scripts and initialises analytics; cache instances in a module-level map keyed by `(maxRequests, window)`, never per request.
- **Reject with `429` + `Retry-After`** — computed from the limiter's `reset` timestamp; the response envelope and typed error live in `api-architecture`.

## Distributed locks

- **Acquire atomically** — `redis.set(key, token, { nx: true, ex: ttlSeconds })` with a fresh `crypto.randomUUID()` token per acquire; check-then-set is a race, not a lock.
- **Release only what you own, atomically** — compare-and-delete via a Lua script (`redis.eval`, see Example). A plain GET-then-DEL narrows but does not close the race where your TTL lapses between the GET and the DEL and you delete the next holder's lock — if you find that variant, it's a defect to fix, not a pattern to copy.
- **The lock-outruns-TTL trap** — if the critical section runs longer than the TTL, the lock silently expires and a second holder enters _while the first is still working_; the owner-check release stops the first holder from deleting the second's lock, but both have already run. Defend in this order: (1) size the TTL above the worst case — 2–3× the p99 duration of the guarded work, never the average; (2) make the critical section idempotent so a rare double entry is harmless; (3) where writes must be strictly ordered, add a fencing token — a monotonic `INCR` taken at acquire and stored with each write, with the downstream store rejecting writes carrying a stale token.
- **Contention throws a typed error** — the caller decides whether to retry, surface a 409, or fail; never spin-wait inside a request handler.

## Idempotency & dedup

- **Webhook dedup is a `SET NX EX` claim** — `claimWebhookEvent(provider, eventId)` returns true only for the first caller across all instances and retries; duplicates are acked with a 2xx so the provider stops retrying. TTL ≥ the provider's retry window (7 days starting point).
- **Idempotency keys replay the response** — for side-effecting POSTs (charge, payout, plan change), store `(client Idempotency-Key → response)` under `idem:` for 24 h and replay on repeat instead of re-running the handler.
- **Both fail closed** — a dedup or idempotency check that can't reach Redis must error, not process; the provider's retry (or the user's) will land once Redis is back.

## What must NOT go in Redis

- **No source-of-truth data** — the primary database owns records; Redis holds only what can be rebuilt or safely forgotten. The worst case of losing the entire Redis instance must be "slower requests and a retried login", never lost data.
- **Nothing another system already owns** — no second realtime/pub-sub channel beside your database's listeners, no session store beside your auth system's own mechanism.
- **Eviction policy is a correctness setting** — a database holding locks, dedup, idempotency, or rate-limit keys must run `noeviction`, so memory pressure produces loud write errors instead of silently deleting the key that was preventing a double charge. A cache-only database may run an LRU policy (`allkeys-lru`), because evicting a cache entry merely costs a refetch.
- **A cache and a lock store must not share an eviction policy** — either run one `noeviction` database and let TTL discipline keep the cache bounded (the default), or split the cache into its own LRU database once it dominates memory.
- **One database per environment** — dev, staging, and prod each get their own instance and credentials; the classic misconfig signature is "429 never fires and no `rl:` keys appear" because the app points at another environment's database.

## Example

A minimal Redis layer demonstrating both failure directions:

```ts
// lib/server/clients/redis/redis.client.ts — the ONE client; REST transport, so batching matters
import { Redis } from "@upstash/redis";
import { env } from "@/config/env";

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
  enableAutoPipelining: true, // concurrent awaits collapse into one HTTP pipeline
});
```

```ts
// lib/server/clients/redis/redis.keys.ts — the only file where a key prefix may appear
export const REDIS_KEYS = {
  rateLimit: (id: string) => `rl:${id}`,
  loginAttempts: (ip: string, email: string) => `la:${ip}:${encodeURIComponent(email)}`,
  webhookEvent: (provider: string, eventId: string) => `wh:${provider}:${eventId}`,
  idempotency: (key: string) => `idem:${key}`,
  cache: (namespace: string, key: string) => `cache:${namespace}:${key}`,
  lock: (resource: string) => `lock:${resource}`,
} as const;
```

```ts
// lib/server/clients/redis/redis.store.ts — a cache fails OPEN: a blip degrades to the source
import { redis } from "./client";
import { REDIS_KEYS } from "./keys";

export async function cached<T>(
  namespace: string,
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const fullKey = REDIS_KEYS.cache(namespace, key);
  try {
    const hit = await redis.get<T>(fullKey);
    if (hit !== null) return hit;
  } catch {
    return fetcher();
  }
  const fresh = await fetcher();
  try {
    await redis.set(fullKey, fresh, { ex: ttlSeconds });
  } catch {
    // losing the write only costs the next read a fetch
  }
  return fresh;
}

// Call after every mutation that changes the cached source data.
export async function invalidate(namespace: string, key: string): Promise<void> {
  await redis.del(REDIS_KEYS.cache(namespace, key));
}
```

```ts
// lib/server/clients/redis/redis.locks.ts — a lock fails CLOSED: unverifiable means denied
import { redis } from "./client";
import { REDIS_KEYS } from "./keys";

// Atomic owner-check release — never DEL a lock a later holder acquired after our TTL lapsed.
const RELEASE_IF_OWNER = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end`;

export class LockNotAcquiredError extends Error {
  constructor(resource: string) {
    super(`Could not acquire lock for resource: ${resource}`);
    this.name = "LockNotAcquiredError";
  }
}

export async function withLock<T>(
  resource: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const key = REDIS_KEYS.lock(resource);
  const token = crypto.randomUUID();

  // Deliberately no try/catch — a Redis error must surface as a denial, not an entry.
  const acquired = await redis.set(key, token, { nx: true, ex: ttlSeconds });
  if (acquired !== "OK") throw new LockNotAcquiredError(resource);

  try {
    return await fn();
  } finally {
    await redis.eval(RELEASE_IF_OWNER, [key], [token]);
  }
}

// TTL 60 s ≈ 3× the p99 of the guarded work, never the average.
// await withLock(`order-checkout:${orderId}`, 60, () => captureAndFulfil(orderId));
```

## Boundaries

- **The review mirror is `redis-audit`** — it audits what this skill writes (builders, TTLs, atomicity, failure directions, per-request command cost); run it after wiring a new primitive.
- **Where limits and locks sit in a route** (the rate-limit → authorize → validate → delegate order, preset-to-route mapping, the 429 envelope) → `api-architecture`.
- **The security framing** (DoS / resource-consumption limits, OWASP mapping, lockout policy rationale) → `backend-security`.
- **Framework caching** — when data can live in the Next.js cache (`use cache`, tags, revalidation) instead of Redis → `nextjs`; Redis is the shared cross-instance tier, not a replacement for it.
- **Feature flags** ride this cache tier but own their evaluation ladder and invalidation → `feature-flags`.
- **Env validation, secret storage, and credential rotation** → `devops`; auditing the env split → `env-audit`.
