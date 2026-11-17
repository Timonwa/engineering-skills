# Redis — patterns

The client, keys and primitives behind `SKILL.md`, one per failure direction.

## Contents

- [The client](#the-client)
- [Keys and TTLs](#keys-and-ttls)
- [A cache that fails open](#a-cache-that-fails-open)
- [A lock that fails closed](#a-lock-that-fails-closed)
- [A claim released on failure](#a-claim-released-on-failure)

## The client

```ts
// server/clients/redis/redis.client.ts — the one client
import { Redis } from "@upstash/redis";
import { env } from "@/config/env";

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
  enableAutoPipelining: true, // concurrent commands share one HTTP request
  retry: { retries: 1, backoff: () => 50 }, // the default is five, with exponential backoff
  signal: () => AbortSignal.timeout(300), // per command; a timeout throws TimeoutError
});
```

## Keys and TTLs

```ts
// server/clients/redis/redis.keys.ts — the only file where a prefix appears
export const REDIS_TTL = { MINUTE: 60, TEN_MINUTES: 600, HOUR: 3_600, DAY: 86_400 } as const;

export const REDIS_KEYS = {
  cache: (group: string, generation: number, key: string) => `cache:${group}:g${generation}:${encodeURIComponent(key)}`,
  cacheGeneration: (group: string) => `cache:${group}:generation`,
  lock: (resource: string) => `lock:${resource}`,
  claim: (work: string, id: string) => `claim:${work}:${encodeURIComponent(id)}`,
} as const;
```

## A cache that fails open

```ts
// server/clients/redis/redis.cache.ts
import type { z } from "zod";

async function readGeneration(group: string): Promise<number> {
  return (await redis.get<number>(REDIS_KEYS.cacheGeneration(group))) ?? 0;
}

export async function cached<TSchema extends z.ZodType>(
  group: string,
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<z.output<TSchema>>,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  let fullKey: string;
  try {
    fullKey = REDIS_KEYS.cache(group, await readGeneration(group), key);
    const hit = schema.safeParse(await redis.get(fullKey));
    if (hit.success) return hit.data; // a value the old code wrote, or nothing, is a miss
  } catch {
    return fetcher(); // Redis down or slow: the source answers
  }
  const fresh = await fetcher();
  try {
    await redis.set(fullKey, fresh, { ex: ttlSeconds });
  } catch {
    // losing the write costs the next read a fetch
  }
  return fresh;
}

export async function invalidateGroup(group: string): Promise<void> {
  await redis.incr(REDIS_KEYS.cacheGeneration(group)); // the old keys expire on their own
}
```

The value stored is the wire form — ISO strings, not `Date` — so the schema that parses it on a hit is the same one the API sends.

## A lock that fails closed

```ts
// server/clients/redis/redis.lock.ts
// Owner-checked release: never delete a lock a later holder took after ours expired.
const RELEASE_IF_OWNER = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end`;

export async function withLock<T>(resource: string, ttlSeconds: number, work: () => Promise<T>): Promise<T> {
  const key = REDIS_KEYS.lock(resource);
  const token = crypto.randomUUID();

  // No try: a Redis error or timeout surfaces as a refusal, never as entry.
  const acquired = await redis.set(key, token, { nx: true, ex: ttlSeconds });
  if (acquired !== "OK") throw new LockNotAcquiredError(resource);

  try {
    return await work();
  } finally {
    await redis.eval(RELEASE_IF_OWNER, [key], [token]);
  }
}

// TTL ≈ 3× the p99 of the work, never its average.
// await withLock(`order-checkout:${orderId}`, 60, () => captureAndFulfil(orderId));
```

## A claim released on failure

```ts
// server/clients/redis/redis.claim.ts
export async function runOnce<T>(
  work: string,
  id: string,
  ttlSeconds: number,
  run: () => Promise<T>,
): Promise<{ status: "done"; result: T } | { status: "already-handled" }> {
  const key = REDIS_KEYS.claim(work, id);

  // No try: an unreachable claim refuses, and the caller's retry lands later.
  const claimed = await redis.set(key, "1", { nx: true, ex: ttlSeconds });
  if (claimed !== "OK") return { status: "already-handled" };

  try {
    return { status: "done", result: await run() };
  } catch (error) {
    await redis.del(key); // release, so the retry runs instead of being skipped
    throw error;
  }
}
```

A claim that must outlast the work — a webhook event, a payment — is a database record instead (`api-architecture`).
