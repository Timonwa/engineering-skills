---
name: redis
description: >-
  Server code that touches Redis (Upstash by default) — one client with a short timeout and few retries, key builders and the `domain:action` grammar, a TTL on every key, a failure direction per primitive with timeouts counted as failures, read-through caches with group invalidation and a schema check on every hit, locks sized above the work, short first-seen claims released on failure, eviction policy, what never lives in Redis, and a fake that fails on demand. Use when adding a cache, lock, claim or any Redis key.
---

# Redis

**Redis coordinates and accelerates; it never owns.** Every key comes from a named builder, every key expires, and every primitive states what happens when Redis is down. Losing the whole instance must cost slower requests and a few retries, never data.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The client

- **One client**, in the server's `clients/` kind, from the validated env (`env`); never a second one per request or helper. Server-only: its token reads and writes the whole database, so it's never logged, echoed in an error or bundled for a browser.
- **Upstash talks REST**, one HTTP round trip per command — no connections to pool, which suits serverless, but every awaited command costs a trip. Keep a request path to a few round trips: `mget` over many `get`s, `enableAutoPipelining` so concurrent commands share a request, an explicit pipeline for a fixed batch. An awaited command inside a loop is a bug. (Over TCP with ioredis, a command is sub-millisecond and the concern becomes connection reuse.)
- **A short timeout and few retries on the request path.** The SDK retries a failed command five times with exponential backoff by default — seconds, during an outage, before a cache that should fail open gives up. Set a per-request timeout (`signal: () => AbortSignal.timeout(…)`, a few hundred milliseconds) and one or two retries.
- **Know the errors:** a `TimeoutError` or network failure is transient; an `UpstashError` from a bad command (`WRONGTYPE`, wrong arguments) is a bug that no retry fixes. Its message includes the command sent.
- **The SDK serialises:** `set` writes JSON and `get<T>` parses it. Never `JSON.stringify` a value yourself, and never let two writers of one key use different codecs.

## Keys

- **Every key comes from a builder** in one keys module — the only file where a prefix appears. Call sites never write a template string, so the keyspace is greppable and two features can't collide.
- **The grammar is `domain:action`**, general to specific: `cache:plans:active`, `lock:order-checkout:<orderId>`, `claim:payout:<payoutId>`.
- **User-supplied segments are encoded** (`encodeURIComponent`), so a value containing `:` can't forge another namespace's key.
- **Each namespace has a TTL default and a failure direction**, in the keys module beside its builder:

| Prefix   | Holds                                          | Default TTL                 | When Redis fails                        |
| -------- | ---------------------------------------------- | --------------------------- | --------------------------------------- |
| `cache:` | read-through copies of data stored elsewhere   | per call site, by staleness | **open** — read the source              |
| `lock:`  | a lock on a critical section                   | 2–3× the work's p99         | **closed** — the work doesn't start     |
| `claim:` | a first-seen claim on work that mustn't repeat | the work's worst duration   | **closed** — refuse, the caller retries |
| `rl:`    | rate-limit counters and lockouts               | the window                  | per tier — `rate-limiting`              |
| `lb:`    | leaderboards and other derived sorted data     | none, trimmed by a job      | **open** — rebuild from the source      |

## TTLs

- **Every key expires** — `ex`, `px`, `exat` or `pxat` on the write itself, never a second `expire` call that a crash can skip.
- **A key without a TTL** has a comment at its write saying what bounds its growth (a trim job, a fixed set of members).
- **TTLs come from shared presets** (`REDIS_TTL.MINUTE`, `.HOUR`, `.DAY`), never inline numbers; a TTL that contradicts its purpose is a bug.

## When Redis fails

- **Caches fail open.** The read and the write-back each sit in a `try`, and any failure falls back to the source: an outage makes a request slower, never a 5xx.
- **Locks and claims fail closed.** There's nothing behind them to fall back to, so a lock or claim that can't be checked refuses — the alternative is a double charge or a duplicated side effect, in exactly the window a retrying provider hits.
- **Rate limits fail by tier**: closed for credentials and guessable secrets, open for the rest (`rate-limiting`).
- **A timeout is a failure**, in every direction — a timed-out lock is not acquired; a timed-out cache read is a miss.
- **One helper, one direction.** A helper that caches and locks with one error policy has the wrong policy for one of them.

## Caching

- **One read-through helper** — `cached(namespace, key, ttl, fetcher, schema)` — and the TTL chosen per call site by how stale the caller can bear.
- **Every hit is parsed with the value's schema**, and a value that fails is a miss. A cache outlives deploys: a value written by the old code meets the new schema, and dates come back as strings, never `Date` or a Firestore `Timestamp`. Store the wire form (`schemas-and-contracts`).
- **The mutation that changes the source invalidates the cache** in the same change; the TTL is the backstop, not the strategy.
- **Invalidate a group with a generation number**: keys in a group include the group's current generation (`cache:events:g7:<eventId>`), and bumping it with `INCR` retires the whole group at once — never `SCAN` and delete on a request path. The old keys expire on their own.
- **Never cache an auth decision** — claims, tokens, a permission check. A stale entry there is a security bug. State Redis itself owns, like an operator's idle clock, fails closed like a lock (`auth`).
- **The framework's cache first** where it exists: a Server Component's read belongs in Next's cache with tags (`nextjs`); Redis is for what the API shares across instances and non-framework callers. Never both for the same data.
- **Stampedes:** a popular key expiring under load sends every request to the source at once. An expensive fetcher recomputes behind a short lock, and the rest wait for it or serve the stale value.

## Locks

- **Acquire atomically:** `set(key, token, { nx: true, ex })` with a fresh random token. A check followed by a set is a race, not a lock.
- **Release only your own**, atomically, with a compare-and-delete script. A `get` then `del` can delete the next holder's lock if yours expired between the two.
- **Size the TTL above the work** — 2–3× its p99, never the average. If the work outruns the TTL, a second holder enters while the first is still running; make the work idempotent so that's harmless, and where writes must be strictly ordered, add a fencing token (an `INCR` taken at acquire, which the store checks on every write).
- **Contention throws a typed error** the caller maps to a 409 or a retry; a request never spin-waits.
- A lock is not deduplication: once released, a retry takes it again and repeats the work. That's what claims are for.

## Claims

- **A claim marks work that must not run twice** — a payout, a job, a reminder send. `set(claimKey, "1", { nx: true, ex })` succeeds for the first caller only; everyone after gets "already handled".
- **Release the claim when the work fails** (`del`), so the retry runs instead of being skipped as a duplicate.
- **Keep it short:** the TTL covers the work, not a provider's whole retry window. Dedup that must last — a webhook event, a payment — is a record in the database, where it's also the evidence (`api-architecture`).
- **A public API that integrators retry** accepts an `Idempotency-Key` header and replays the stored response for the same key; that record lives in the database beside the resource, not in Redis.

## What never lives in Redis

- **Source-of-truth data.** The database owns records; Redis holds only what can be rebuilt or safely forgotten.
- **What another system owns** — sessions beside the auth system's, a second pub/sub beside the database's listeners.
- **Eviction is a correctness setting.** A database holding locks, claims or rate limits runs `noeviction`, so memory pressure fails writes loudly instead of silently deleting the key that prevented a double charge. A cache-only database may run `allkeys-lru`. Mixing both in one database means `noeviction`, with TTLs keeping the cache bounded, until the cache earns its own.
- **One database per tier**, with its own credentials. "429 never fires and no `rl:` keys appear" is the signature of an app pointed at another tier's database.

## Testing

A fake client that behaves like Redis in memory, and that a test can make fail or time out on the next command (`testing`). Every primitive has a test proving its direction: a cache that serves the source when Redis fails, a lock and a claim that refuse, a claim released when the work throws.

Code for the client, keys, cache, lock and claim is in [references/patterns.md](references/patterns.md).

## Do / Don't

- **Do** use one client with a short timeout; build every key from the keys module; put the TTL on the write; fail caches open and locks and claims closed; count a timeout as a failure; parse every cache hit; invalidate groups by generation; release a claim when the work fails; run `noeviction` where locks and claims live.
- **Don't** construct a client per request; await commands in a loop; leave a key without a TTL or a reason; cache an auth decision; release a lock you don't own; use a lock as dedup; keep dedup that must last in Redis; `SCAN` on a request path; share a database across tiers.

## Related skills

Rate limits, lockouts and the client IP `rate-limiting` · where a lock or claim sits in a route, and webhook records `api-architecture` · framework caching `nextjs` · cached values' schemas `schemas-and-contracts` · flags on this cache tier `feature-flags` · the fake client `testing` · env and credentials `env` · the SDK `upstash-redis-js` (official) · the audit `redis-audit`.
