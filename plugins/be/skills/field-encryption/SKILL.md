---
name: field-encryption
description: >-
  Encrypting individual sensitive fields before they reach the data store — the threat model, encrypt versus hash versus blind index, AES-256-GCM with a fresh nonce and a versioned format, context bound as associated data, one key per store and per purpose, envelope encryption with a KMS when it's worth it, the hydrate boundary and an opt-in reveal, rotation with old keys kept for backups, and crypto-shredding. Use when storing a secret a user must read back, or changing how encrypted fields are keyed.
---

# Field encryption

Some fields must be readable again but would hurt if a copy of the database leaked — a passcode the owner shares, a payout account number, a third-party credential held on someone's behalf. They're encrypted in the service layer with AES-256-GCM before the write, so the store, its backups, its exports and its logs hold only ciphertext, and plaintext exists only between one encrypt on the way in and one decrypt on the way out.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## What it protects against

Write this down in the project's docs, or someone will assume it buys more:

- **It protects against** a leaked export, backup or snapshot; read-only access to the store by a person or tool that shouldn't see the value; a document that ends up in a log.
- **It doesn't protect against** a compromised server or secret manager — whoever holds the key decrypts freely; a route that returns the decrypted field to the wrong caller (that's access control and projections); online guessing at a "check this value" route (that's `rate-limiting`).
- **Losing the key loses the data.** The secret manager is the source of truth, more than one person can retrieve the key, and the recovery answer is written down before the first field is encrypted.

## Encrypt, hash, index or leave

- **Encrypt** a value someone must read back in clear.
- **Hash** a value that's only ever verified — a login password (`auth`), a token (SHA-256 of a random value is enough), a low-entropy identifier kept for dedupe (an HMAC with its own key, since a plain hash of a small space is brute-forced).
- **A blind index** where an encrypted value must also be looked up by equality: store an HMAC of the normalised value, under a separate key, beside the ciphertext, and query on that. It reveals which records share a value, so use it only where that's acceptable; range queries and sorting stay impossible.
- **Leave plain** everything else. Ciphertext can't be filtered, sorted or indexed — the nonce makes it different every time — so decide which fields are encrypted when the schema is designed, not after.

## The primitive

- **AES-256-GCM**, through the runtime's own crypto (Node's `crypto`), never a hand-rolled mode. GCM is authenticated: a tampered byte or the wrong key fails the tag instead of returning garbage.
- **A fresh random 12-byte nonce for every encryption**, generated inside the encrypt function, never passed in. Reusing a nonce under one key breaks GCM — it leaks the XOR of the plaintexts and lets an attacker forge tags. With random nonces, NIST caps one key at 2³² encryptions; a store that could approach that rotates sooner.
- **A versioned format**, `v1:<nonce>:<tag>:<ciphertext>`. The version names the key and algorithm, so old and new ciphertext coexist during a rotation and decrypt picks the right key.
- **Bind the ciphertext to where it lives.** Pass the field's context — collection, document id, field name — as GCM's associated data, so a ciphertext copied into another record or another field fails to decrypt instead of moving a secret. Moving or renaming a document therefore means decrypting and re-encrypting its fields.
- **The key is 32 random bytes**, validated for its exact shape at boot (`env`), so a malformed key fails the deploy, not the first read.
- **The tag is exactly 16 bytes**: pass `authTagLength: 16` to the decipher, because Node still accepts a shorter tag with only a warning, which makes forging one easier.
- **Decrypt fails closed**, with a generic error: a wrong format, version or tag throws a typed internal error whose cause goes only to the server log. Never return the stored bytes on failure. `null` passes through both ways, so optional fields stay optional.

The full functions, with associated data and a key per version, are in [references/example.md](references/example.md).

## Keys

- **One key per data store**, per tier — not one per field: the app's runtime reads every field key, so whoever compromises it holds them all, and more field keys add rotation work without narrowing the threat.
- **One key per purpose.** The field key encrypts fields. A blind index, a signed token or a cookie each get their own key, so leaking or rotating one never touches the others (OWASP: keys used for different purposes stay independent).
- **Generate with a secure generator** (`openssl rand -hex 32`) and write it to the secret manager with `printf`, not `echo`, which adds a newline the manager stores. Read it back and compare.
- **A tier that already has a key keeps it.** A fresh key on a new machine writes ciphertext no other instance can read.
- **Envelope encryption when it's worth it.** In a simple deployment the key lives in the secret manager and the app holds it in memory, and wrapping it buys little, because whoever reaches one reaches the other. Step up to a KMS — a data key per tenant or per record, wrapped by a key that never leaves the KMS (Cloud KMS) — when tenants need separate keys, when a record must be erasable on its own (below), or when compliance asks for keys in a hardware module.

## The service boundary

- **Callers pass and receive plaintext; the service owns the ciphertext.** Encrypt immediately before the write, decrypt immediately after the read. Schemas keep the field as `string | null`; routes, contracts and clients never see `v1:…`.
- **One hydrate function per resource** decrypts on every read path that serves the value, so a new read that skips it stands out in review.
- **An opt-in reveal for a field most reads don't need** — a payout account number — instead of decrypting it on every read: reads keep the ciphertext unless the caller asks, so a value that can't be decrypted breaks one screen, not every read of the account.
- **Each audience gets its own projection:** the owner gets the value, an operator gets a summary (the last four digits, stored beside the ciphertext at write time, so showing them needs no decrypt), and a public or list shape doesn't carry the field at all — not even the ciphertext, which still reveals that a value exists and how long it is (`schemas-and-contracts`).
- **The update trap:** an update that returns `{ ...existing, ...writes }` hands the caller the ciphertext it just wrote. Return the plaintext the caller sent instead. The symptom is `v1:a3f0…` on screen after an edit that a refresh fixes.
- **Verifying a guess** decrypts and compares in constant time (`timingSafeEqual`), behind a rate limit and lockout that fail closed (`rate-limiting`).

## Rotation

On a suspected leak, when someone with access leaves, before the nonce limit, and on a set period otherwise (OWASP, NIST SP 800-57):

1. Add the new key beside the old in the secret manager, as `v2`.
2. Decrypt picks the key by the version prefix; encrypt writes `v2:`.
3. Backfill: read every `v1:` value, decrypt with the old key, and write it as `v2:` in a transaction that checks the value is unchanged, so a concurrent edit isn't overwritten by the old value re-encrypted.
4. Retire the old key from the app once nothing reads `v1:` — but **keep it archived as long as any backup holds `v1:` data**, or restoring the backup restores data nobody can read (`firestore` keeps backups for weeks).

The code for every step exists before the first rotation is needed, so a leak is answered in hours (`env` for the overlap between secrets).

## Deleting

- **Deleting a document doesn't delete it from backups** and point-in-time recovery, which can hold it for weeks.
- **Crypto-shredding** makes a deletion final everywhere at once: with a data key per account or per record (envelope encryption), destroying that key leaves every copy of its ciphertext — live, backed up or exported — unreadable. Where a project must honour erasure across its backups, that's the reason to step up to per-account keys.

## Testing

Each encrypted field gets a round-trip test: write it, read the raw document and see `v1:…`, hydrate and get the plaintext back. A ciphertext moved to another record, a changed byte and a wrong key each fail to decrypt. The test setup seeds a fixed test key (`testing`).

## Do / Don't

- **Do** write the threat model down; encrypt only what must be read back; use AES-256-GCM with a fresh nonce; version the format; bind context as associated data; keep one key per store and per purpose; route reads through one hydrate; project each audience; plan rotation on day one and keep old keys for backups.
- **Don't** encrypt what only needs verifying; pass a nonce in; reuse the field key for tokens or indexes; return ciphertext from an update; send ciphertext in a list; return stored bytes when decrypt fails; generate a new key for a tier that has one; delete a retired key while backups still need it.

## Related skills

**This skill sets the rules and never writes an audit report.** An audit of this area is `/security-audit`, written from its own template. Run it rather than writing a report from here.

Secrets, the env guard and rotation overlap `env` · password hashing and sign-in `auth` · verify routes and lockouts `rate-limiting` · projections and list shapes `schemas-and-contracts` · the store and its backups `firestore` · where the service sits `api-architecture` · server threats `backend-security` · test keys `testing`.
