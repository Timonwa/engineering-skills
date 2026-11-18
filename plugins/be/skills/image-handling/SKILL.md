---
name: image-handling
description: >-
  User-uploaded images on Firebase Storage — caps in one module, files validated by their bytes and decoded within a pixel limit, no user SVG, buckets chosen by who may read them, display images through the API and large originals straight to a reserved path, URLs derived at read time with a version for cache-busting, short signed links for private files, a worker that normalises, strips EXIF and derives, deletes and orphan reaping, and the cost meters. Use when adding an upload, an image slot, a signed link or a storage bucket.
---

# Image handling

Every byte a user uploads is untrusted until the server has read it, and every byte stored has a record that owns it. The browser makes uploads cheap — early checks, compression — but the server is the only gate; who may read a file decides where it lives; heavy work runs off the request path; and anything without an owner record is reaped.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Caps, in one place

- **Every cap is defined once** — the type allowlist, the byte limits, the pixel limit, each slot's dimensions, the compression quality — in a shared constants module that the browser check, the server check and the storage rules all read. Two definitions of "allowed image" drift.
- **Browser checks are for the person; the server's are the gate.** Assume the browser check never ran.
- **Starting points**, tuned per project: display images up to 10 MB before compression; originals up to 100 MB; slots like 200×200 (avatar) and 500×500 (cover); quality 0.8.

## Validating a file

- **Trust the bytes, not the label.** The browser's `contentType` and the file extension are whatever the client says. The server reads the file's first bytes (`file-type`) and checks the real type against the allowlist, then stores that type as the object's `contentType`.
- **Decode it within a pixel limit.** A small file can decompress to billions of pixels and exhaust memory; decode with a cap (`sharp`'s `limitInputPixels`) and refuse anything over it, or that doesn't decode at all.
- **Re-encoding is the safe copy.** The worker writes a fresh JPEG or WebP from the decoded pixels, which drops anything hidden in the original's metadata or trailing bytes.
- **No user-uploaded SVG as an image.** An SVG is a document that can run script. Rasterise it, or refuse it.
- **Display slots take only what browsers render** — JPEG, PNG, WebP — because they're compressed in the browser and served as uploaded. HEIC and HEIF are accepted only on the originals path, where the worker converts them.
- **Skip a duplicate** where the product allows it: an upload whose SHA-256 matches one the same owner already stored isn't stored twice.

## Where files go

- **Who may read a file decides its bucket**, never which feature it's for. A **public** bucket, world-readable through the bucket's IAM, takes display images; a **private** bucket, unreadable by clients, takes originals and anything gated. With uniform bucket-level access there are no per-object permissions, so mixing the two in one bucket gives one of them the wrong access. The bucket setup and its checks are in [references/storage.md](references/storage.md).
- **Display images go through the API.** The browser compresses to the slot's size, posts the file to an API route or Server Action, and the Admin SDK writes it to a **fixed path per slot** (`{ownerId}/avatar`), so a replace overwrites.
- **Large originals go straight to storage, against a reservation.** The API reserves a record — owner, `status: "pending"`, the exact path, the declared size — and the browser uploads to that path with a resumable upload; the storage rules allow the write only when it matches the record. Streaming 100 MB through the API buys latency and memory for nothing.
- **Objects are named by record id**, never the user's filename, which is kept on the record for downloads. Filenames collide, carry unsafe characters and leak information.

## URLs

- **Store the path and a version, never a URL.** The URL is built when the record is read — so a bucket or domain change needs no migration — with the version as `?v=` on public files.
- **The version changes on every replace** (the record's `updatedAt`, or a counter): a replace writes new bytes to the same path, and browsers and CDNs still hold the old ones (public objects default to an hour's caching), so only a new query string makes them fetch again. After the mutation, the page refreshes so the new URL reaches it (`nextjs`).
- **Private files are read through short signed links**, minted only by server code that has just checked the caller's access, in the same request. A signed link is a bearer credential — anyone holding it can read the file until it expires, and it can't be revoked — so it lasts minutes (15 is a starting point), is never stored, and a download link sets `Content-Disposition: attachment`.
- **User files are served from the storage domain**, never the app's own origin, so a file that slips through can't act as the app.

## The worker

- **Heavy work runs in a storage-triggered function** (`onObjectFinalized`), never on the upload request: the person waits for the bytes to arrive, nothing more.
- **The record's `status` tracks the file** — `pending → uploaded → processing → ready`, or `failed`, plus `deleting`. The UI shows only `ready`; the retry job and the reaper key off the rest.
- **Normalise:** convert HEIC and HEIF to JPEG (a pure-JS converter — the prebuilt `sharp` for Cloud Functions has no HEIC support), then mark the output with custom metadata and skip it in the trigger, or the worker processes its own output in a loop.
- **Apply the orientation, then strip EXIF** — `sharp().rotate()` before re-encoding. Photos carry GPS coordinates and device serials, and no delivered file may. Fields worth keeping (capture time, camera) are picked from an allowlist, with GPS off.
- **Derivatives at ingest**, sized for delivery; transforms at delivery time (responsive sizes, watermarks, format) are `cloudinary`'s where a project uses it.
- **Idempotent and race-safe:** the final write re-reads the record in a transaction and stops if it moved to `deleting`; retries are capped (3 to start), then `failed`, for a retry job to sweep.
- **In the bucket's region**, so reading the file is free.

## Deleting and reaping

- **A delete flips the record to `deleting` and answers 202**; a trigger deletes the file, then the record, then reverses counters. File first: a failed file delete leaves the record visible and retrying, never silent orphaned bytes. A missing file is fine (`ignoreNotFound`).
- **Reap both ways, on a schedule.** Records stuck in `pending` past a day (an abandoned upload) are deleted. A reconciliation job lists the bucket against the records; it should find nothing, so anything it finds raises an alert rather than being quietly deleted.
- **Bucket lifecycle rules and soft delete** back these up: a rule deletes objects under a temporary prefix after a few days, and soft delete keeps a deleted object recoverable for a week.

## Cost

Storage bills on three meters; know which one a choice moves ([current prices](https://cloud.google.com/storage/pricing)):

- **Bytes stored** — the cheap one. Compress, size derivatives to their use, don't keep originals nobody serves, and reap orphans, which are billed forever.
- **Egress** — usually the largest, since every uncached view is egress. Serve derivatives, cache public files for long (safe, because a replace changes `?v=`), put a CDN in front of hot images, and keep workers in the bucket's region.
- **Operations** — one worker run per upload (the metadata guard), batched status changes, and status-driven updates instead of polling.

A worked example — caps, the browser and server checks, a fixed-slot replace, a signed link behind its check — is in [references/example.md](references/example.md).

## Do / Don't

- **Do** define caps once; read the bytes and decode within a pixel limit; re-encode what you serve; pick the bucket by who may read; route display images through the API and large originals to a reservation; store paths and versions; sign private links briefly, after the access check; strip EXIF; reap both ways.
- **Don't** trust `contentType` or the extension; accept user SVG; mix public and private files in a bucket; name objects by the user's filename; store a URL, signed or not; mint a signed link anywhere the access check didn't just run; process on the request path; delete the record before the file.

## Related skills

The Admin client and the store `firestore` · upload routes and the 202 `api-architecture` · per-account upload limits `rate-limiting` · server threats and file access (BOLA) `backend-security` · delivery transforms `cloudinary` · `next/image` and refresh after a mutation `nextjs` · generated images (`ImageResponse`) `seo-aeo-geo` · alt text `accessibility` · slot and asset names `naming`.
