---
name: firestore
description: >-
  Cloud Firestore behind a Next.js API — clients denied and the Admin SDK as the only path, one lazy Admin client, collection paths as constants, Timestamps converted in the data layer, cursor pagination, transactions, atomic counters and batches, denormalised data, TTL and cascade deletes, idempotent triggers, indexes as code with the edition's rules, security rules and their tests, backups and point-in-time recovery, and rolling back rules and indexes. Use when reading or writing Firestore, or changing its rules or indexes.
---

# Firestore

The API is the only thing that reads or writes Firestore, through the Admin SDK in its data layer. Clients are denied everything, so the security rules are a second wall rather than the gate, and every rule about the data — shape, ownership, atomicity — lives in code that can be read, tested and reviewed.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The access boundary

- **Clients are denied every read and write.** The web config ships to every browser, so only the rules stop a client from querying the database directly; with every path through the API, they deny everything.
- **A feature that must read from the client** — a live listener, an offline cache — opens exactly that path in the rules, read-only, with the same ownership and membership checks the API's guard makes (`access-control`), and unsubscribes its listener on unmount.
- **Only the data layer calls Firestore.** Services call data functions; routes, actions and components never see a `collection()` call (`code-structure`).

## The Admin client

- **One lazy client** in the server's `clients/` kind: constructed on first use, kept on `globalThis` so hot reload doesn't open a second one, with `ignoreUndefinedProperties: true` so an optional field left `undefined` is skipped rather than rejected.
- **Credentials from the platform** (Application Default Credentials) on App Hosting, Cloud Run and Functions — `initializeApp()` with no key. Off Google's infrastructure, the service-account key comes from the secret manager, never a file in the repo or a public variable: it bypasses every rule (`env`).

## Reading

- **Collection paths are constants** — top-level names in one shared constants file, subcollections as path builders, so the API, workers and rules tests name a path the same way. Never a literal in a data file.
- **Every document is parsed with Zod on the way out** of the data layer, through the tolerant read schema (`schemas-and-contracts`). Firestore's `Timestamp` is converted to an ISO string there, before the schema, and never reaches a contract or the frontend; a shared timestamp schema accepts a `Timestamp`, a `Date` or milliseconds.
- **Cursor pagination, never offset** — the cursor is a document id, the query asks for `limit + 1` to know whether there's more, and `documentId()` breaks ties. Offset reads and bills every skipped document. The shared helper is in [references/patterns.md](references/patterns.md).
- **Counts use `count().get()`**, billed per thousand index entries, never a fetch of every document.
- **`orderBy` drops documents that lack the field**, silently — a field a list sorts on is written on every document, with a default.
- **`in` and `getAll` are chunked** to Firestore's limits, and the chunks run in parallel.

## Writing

- **Read-then-write is a transaction.** A uniqueness check, a stock decrement, a status move: the read and the write commit together or not at all. Calls to the outside world (email, claims, payments) happen after the commit, because a transaction can run more than once.
- **Counters use `FieldValue.increment()`**, never a read and a write. **Uniqueness** uses `create()`, which fails if the document exists, or a transaction.
- **Timestamps:** `FieldValue.serverTimestamp()` on writes; `Timestamp.now()` inside a transaction, where a value must be known before commit. `createdAt` and owner fields never change after create.
- **Batches** group related writes, split at Firestore's 500-operation limit.
- **Denormalise what lists read** — a count, a name, a cover — onto the parent document, updated in the same transaction or batch as the change, so a list is one query, not one per row. A delete reverses a counter only if that document was counted.
- **Writes take a validated, allowlisted body** — the schema is the gate (`schemas-and-contracts`).

## Lifecycle

- **TTL for expiry with no side effects** — one `expiresAt` field per collection group, set from a retention constant. TTL deletes within about a day of expiry, never on time, so reads still filter `expiresAt > now`; it doesn't cascade to subcollections, and the policy is set per project, outside `firebase deploy`. Commands in [references/patterns.md](references/patterns.md).
- **A delete with consequences** — files, derived documents, counters — flips a status (`deleting`), answers 202, and a trigger does the cleanup, guarded in a transaction against work still in progress.
- **Triggers are idempotent** Cloud Functions (2nd gen), one codebase per concern. Delivery is at least once, so a trigger keyed on the event id does nothing the second time; it sets its region, memory and timeout deliberately, and reads secrets from the secret manager. Scheduled work runs through the API's cron route instead (`api-architecture`).

## Indexes

- **Indexes are code**, in the committed `firestore.indexes.json`, changed in the same PR as the query that needs them.
- **The edition is a project fact.** On the Standard edition a query that filters and orders, or filters on several fields, needs a composite index, and without one it fails with `FAILED_PRECONDITION` — in production, because the emulator runs any valid query. On the Enterprise edition indexes are optional: a query without one scans, so there an index is a speed and cost choice.
- **Check before release:** deploy the index file to the development project and run the new query there; `firebase firestore:indexes` prints what's deployed, to compare with the file both ways — an index no query uses costs writes and storage.
- **A new index deploys before the code that needs it**, and an old one is removed only once no deployed code uses it. `firebase deploy --only firestore:indexes` asks before deleting indexes missing from the file; never answer it with `--force` on production.

## Security rules

- **Deny by default.** The file starts with a match on every document that allows nothing; anything opened is opened on purpose, with a comment saying which feature needs it.
- **Where a rule allows a write,** it validates create and update with the same function, checks ownership with `request.auth` (a role from the token, not a `get()`), caps the size and type of every field, keeps `createdAt`, owners and roles unchanged, and leaves append-only collections with `write: false`. `hasOnly` limits which fields change, not who changes them — always pair it with ownership. Helpers in [references/patterns.md](references/patterns.md).
- **The rules file in the repo is the source of truth.** A deploy overwrites the console; an edit made in the console is copied back to the file the same day.
- **Rules are tested** with `@firebase/rules-unit-testing` against the emulator, in CI: for each collection, the reads and writes that must succeed and the ones that must fail, including a signed-out caller and another account (`testing`). `firebase-security-rules-auditor` reviews them; `--dry-run` only proves they compile.

## Backups and rollback

- **Point-in-time recovery is on for production**: it keeps every version for 7 days, so a bad migration or a buggy write can be read back or restored from a minute before it ran.
- **Delete protection is on** for every tier's database, so a stray command can't drop it.
- **A scheduled backup** — weekly is enough beside PITR's week, kept up to 14 weeks — covers what PITR doesn't, and is the copy to rebuild from if the database is lost. A development tier holding only seed data may skip it. A restore goes into a new database, never over the live one, and is rehearsed once per tier.
- **Rolling back rules** is redeploying the previous file from git (or the console's release history), straight away; rules have no data to undo.
- **Rolling back indexes** is redeploying the previous file, which only adds; an index the old code needs is never deleted while that code may run.
- **Data is never rolled back by a code rollback.** A migration that reshapes documents ships with its way back, or is recorded as one-way (`devops`).

## Do / Don't

- **Do** deny clients everything; keep Firestore calls in the data layer; name paths with constants; convert `Timestamp` before parsing; page with cursors; use transactions, `increment()` and `create()`; denormalise what lists read; make triggers idempotent; ship indexes with their queries; test the rules in CI; turn on PITR and scheduled backups.
- **Don't** call Firestore from a route, action or component; use offset pagination; read then write outside a transaction; call the outside world inside a transaction; trust the emulator to catch a missing index; delete an index deployed code uses; edit rules only in the console; ship rules on `--dry-run` alone; restore a backup over the live database.

## Related skills

Sign-in and sessions `auth` · roles, claims and guards `access-control` · schemas and projections `schemas-and-contracts` · Storage and uploads `image-handling` · App Check and server threats `backend-security` · env and secrets `env` · the emulator in tests `testing` · deploys `devops` · encrypted fields `field-encryption` · the audit `firestore-audit` · rules review `firebase-security-rules-auditor` (official).
