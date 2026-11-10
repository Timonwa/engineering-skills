---
name: image-handling
description: >-
  The house image upload and delivery pipeline on Firebase Storage — centralized upload caps enforced client and server, bucket tiering by access level, the `?v=` cache-bust on replace, the signed-URL issuance boundary, worker-side processing (format normalization, EXIF stripping, derivatives), orphan reaping, and the cost model. Use on "upload", "image", "avatar", "thumbnail", "compression", "HEIC", "EXIF", "signed URL", "storage bucket", "orphaned files".
---

# Image handling (Firebase Storage pipeline)

The house pipeline for user-uploaded images, scoped to **Firebase Storage** as the deliberate default store. Four principles run through everything here: the client makes uploads cheap (compression, early validation) but the **server is the only gate**; **access level, not feature, picks the bucket**; heavy work happens **off the request path** in a worker; and every stored byte has an owner record — anything without one gets reaped.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Centralized caps — one constants module

- **Define every cap once, in a shared constants module** — max dimensions per slot, max bytes, compression quality, and the MIME allowlist live in one file that the client validator, the server validator, and the Storage rules all derive from. Never hardcode a pixel size, quality number, or MIME string at a call site — two definitions of "allowed image" will drift.
- **Client checks are UX; server checks are the gate.** Client-side validation gives instant feedback and saves the user an upload they'd fail anyway — it proves nothing. The server re-validates MIME type and size on every upload, and Storage rules cap `request.resource.size` + `contentType` on any client-direct write. Assume the client validator never ran.
- **Starting caps** (tune per project, but start numeric): MIME allowlist `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`; **10 MB** pre-compression for display images; **100 MB** for full-resolution originals; compression quality **0.8**; slot dimensions like **200×200** (avatar) and **500×500** (cover).
- **Compress client-side before upload, to the display size.** An avatar rendered at 200 px never needs a 4000 px original — resize (aspect-ratio preserved) + re-encode in the browser before any byte leaves it. The deliberate exception is originals a downstream consumer genuinely needs at full resolution (sale, print, ML processing); those skip dimension-compression and take the large-original path below.

## Upload paths & bucket tiering

- **Access level decides the bucket — never the feature.** Two buckets per project: a **public** bucket (world-readable via bucket IAM, client writes denied) and a **private** default bucket (client reads denied entirely). A bucket's readability under Uniform Bucket-Level Access is all-or-nothing — there are no per-object ACLs — so a new image type is placed by asking one question, "who may read this?", never "which feature is this for". Mixing gated and public objects in one bucket forces the wrong tier on one of them. IAM/UBLA mechanics and rules → `firebase`.
- **Small display images go through the server.** Compress client-side → API route or Server Action → Admin SDK writes to the public bucket at a **fixed per-slot path** (`{ownerId}/avatar`, `{ownerId}/resources/{resourceId}/cover`) so a replace overwrites in place. No storage credentials or write rules needed in the browser.
- **Large originals go client-direct, against a reservation.** The server first **reserves** a DB record (`ownerId`, `status: "pending"`, the exact storage path) and returns the path; the client uploads with `uploadBytesResumable` (native pause/resume/cancel); Storage rules validate each write against the reserved record — owner matches, status is mid-upload, size and contentType within the caps. Streaming a 100 MB file through your API buys latency and memory pressure for nothing.
- **Name objects by immutable id, not user filename.** The storage path uses the DB-generated record id; the original filename is stored on the record for download UX. User filenames collide, carry unsafe characters, and leak information.

## Cache-busting on replace

- **Overwriting a same-path object without a cache-bust serves stale images.** Fixed per-slot paths mean a replace writes new bytes to the same URL — but browsers and CDN edges cached the old bytes (public GCS objects default to `Cache-Control: public, max-age=3600`), so users keep seeing the old image for up to an hour or longer.
- **Append `?v=${Date.now()}` at write time and store the versioned URL.** The query param changes the cache key without changing the object name, so every consumer fetches fresh bytes on replace while deletion stays trivial (one fixed path per slot). The alternative — versioned/content-addressed object names — also works but turns every replace into an orphan-cleanup problem.
- **The new URL must actually reach the UI.** After the mutation resolves, `router.refresh()` (or revalidate the affected tag/path) so the updated URL flows back down through server-rendered props — a fresh `?v=` is useless while the old URL is still in the React tree. "Re-uploaded image still shows the old one" is almost always a missing refresh, not a storage bug.

## Signed URLs — the issuance boundary

- **Only server code that just verified authorization may mint a signed URL.** Issuance lives in a route handler that runs the entitlement check in the same request — never in client code, and never in a helper reachable from a code path that skipped the check. A signed URL is a bearer credential: whoever holds it reads the object until expiry, it's shareable, and it can't be revoked.
- **Short expiry — 15 minutes is the starting point** for view/download links. Every fetch of a fresh URL re-runs authorization, which is the point: never hand a long-lived URL to a client whose access should be re-checked (revoked entitlement, expired purchase, removed membership).
- **Never persist a signed URL.** Store the storage path on the record and derive URLs at read time — a stored signed URL is an expired link at best and a leaked credential at worst. Public-bucket objects never need signing; store their public URL (with the `?v=` version) directly.

## Server-side processing (the background worker)

- **Heavy work runs in a storage-triggered function** (`onObjectFinalized`), never on the upload request path. The user waits only for the byte transfer; processing follows asynchronously, typically within seconds.
- **Track lifecycle with an explicit `status` field** on the DB record — `pending → uploading → uploaded → processing → ready → failed` (+ `deleting`). The UI, retry cron, and reaper all key off it; the grid renders only `ready`.
- **Normalize formats** — convert HEIC/HEIF → JPEG in the worker (use a pure-JS converter such as `heic-convert`; sharp's prebuilt Cloud Functions binaries don't bundle libheif), replace the original in Storage, and update the record's storage path to the live blob. Mark the rewritten object with custom metadata (e.g. `converted: "true"`) and bail on it in the trigger — otherwise the finalize event re-fires the worker on its own output in a loop.
- **Bake in orientation, then strip EXIF — stripping is a privacy requirement.** `sharp().rotate()` honours the EXIF orientation before re-encoding drops the metadata. User photos carry GPS coordinates and device serials; no delivered derivative may contain them. If you persist EXIF fields on the record, parse with `gps: false` and allowlist a curated non-PII subset (capture time, camera make/model, exposure) — never store the raw blob.
- **Generate derivatives at ingest** — e.g. a 600 px max-edge JPEG at quality 85 as the delivery source. Delivery-time transform URLs (responsive sizes, watermarks, `f_auto`/`q_auto`) → `cloudinary`.
- **Make the worker idempotent and race-safe.** Final writes go through a transaction that re-reads the record and bails if it entered `deleting` mid-process (the reaper owns cleanup from there). Cap retries with a counter on the record — **3** is the starting point — and on exhaustion record the error and `status: "failed"` for a retry cron to sweep.
- **Deploy the worker in the bucket's region.** Intra-region reads are free; a cross-region worker pays egress on every processed byte.

## Deletion & orphan reaping

- **Delete asynchronously** — the endpoint flips `status → "deleting"` and returns `202`; a DB-triggered reaper deletes the storage blob (and any CDN derivative), then removes the record and reverses denormalized counters. Blob-then-record order is the invariant: the record is deleted only after blob deletes succeed, so a failed delete never silently orphans bytes — the record stays visible, retries fire, and ops can see it.
- **Tolerate missing blobs** (`delete({ ignoreNotFound: true })`) — a record that never left `pending` has no file.
- **Reap in both directions, on a schedule.** Record-without-blob: a daily sweep deletes records stuck in `pending` older than **24 h** (reservation made, upload abandoned). Blob-without-record: a scheduled reconciliation job lists bucket paths and joins against the DB — it should return **zero** rows in normal operation; non-zero means a code regression, so alert rather than silently clean.
- **Cascade by status-flip, not inline fan-out.** Deleting a parent flips each child record to `deleting` in cursor-paginated batches (500 per batch); every child reaps independently with isolated retries. Deletes that exhaust their retry cap (**3**) surface in an admin view for manual retry — counters and quota reverse at reap time, not at click time, so you briefly over-charge quota rather than oversubscribe storage.

## Cost model — three meters

Images bill on three meters; know which one a design decision moves. Rates below are GCS list prices at the time of writing (source: cloud.google.com/storage/pricing — verify current rates).

- **Storage bytes** (~$0.026/GB-month, Standard) — the cheap meter. Levers: client compression, derivative sizes, not keeping originals you'll never serve, and the orphan reaping above (orphans are pure waste, billed forever).
- **Egress/bandwidth** (~$0.12/GB to the internet) — usually the dominant meter, because every uncached view is egress. Levers: serve small derivatives instead of originals, long-lived caching on public objects (safe because replaces cache-bust with `?v=`), a CDN in front for hot images (→ `cloudinary`), and co-locating workers with the bucket so processing reads are free.
- **Operations** (~$0.05 per 10k Class A ops, plus function invocations and DB writes per lifecycle) — the meter that punishes chatty designs. Levers: one worker invocation per upload (the `converted` metadata guard prevents self-re-triggering), batched status flips on cascade, and status-driven subscriptions instead of polling.

## Example

The display-image path end to end — centralized caps, client compression as UX, the server as gate, fixed-slot overwrite with cache-bust, and a signed-URL issuer behind its authz check.

```ts
// packages/schemas/src/constants/image.constant.ts — single source of truth for every cap
export const IMAGE_MIME_ALLOWLIST = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const IMAGE_MAX_SIZE_MB = 10; // display images, pre-compression
export const IMAGE_COMPRESSION_QUALITY = 0.8;
export const AVATAR_MAX_DIMENSIONS = { width: 200, height: 200 };
export const SIGNED_URL_EXPIRY_MINUTES = 15;
```

```tsx
// client — validation + compression here are UX; the server re-checks everything
const handleAvatarSelect = (file: File) => {
  const validationError = validateImageFile(file, { allow: IMAGE_MIME_ALLOWLIST, maxSizeMb: IMAGE_MAX_SIZE_MB });
  if (validationError) return setError(validationError);

  startTransition(async () => {
    const compressed = await compressImage(file, { ...AVATAR_MAX_DIMENSIONS, quality: IMAGE_COMPRESSION_QUALITY });
    const result = await uploadAvatar(toFormData(compressed));
    if (!result.success) return setError(result.message);
    router.refresh(); // the new `?v=` URL only helps once it re-renders through server props
  });
};
```

```ts
// server service — the gate; assume the client validator never ran
export async function uploadAvatar(ownerId: string, file: File): Promise<{ avatarUrl: string }> {
  assertValidImageUpload(file, { allow: IMAGE_MIME_ALLOWLIST, maxSizeMb: IMAGE_MAX_SIZE_MB }); // throws typed 400

  const object = storage.bucket(env.STORAGE_PUBLIC_BUCKET).file(`${ownerId}/avatar`); // fixed slot — replace overwrites
  await object.save(Buffer.from(await file.arrayBuffer()), { metadata: { contentType: file.type } });

  const avatarUrl = `${object.publicUrl()}?v=${Date.now()}`; // same path, new cache key
  await updateOwnerProfile(ownerId, { avatarUrl });
  return { avatarUrl };
}
```

```ts
// route handler — authorization and signed-URL issuance in the same request, never from the client
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = validateParams(await ctx.params, IdParamsSchema);
    const { actor } = await requirePermission(request, "resource.file.view");
    const record = await requireFileEntitlement(actor, id); // typed 403 if access was revoked

    const [url] = await storage
      .bucket(env.STORAGE_PRIVATE_BUCKET)
      .file(record.storagePath) // the path is stored; signed URLs never are
      .getSignedUrl({ action: "read", expires: Date.now() + SIGNED_URL_EXPIRY_MINUTES * 60 * 1000 });

    return ok({ url });
  } catch (error) {
    return errorResponse(error);
  }
}
```

## Boundaries

- **Storage rules, bucket IAM/UBLA provisioning, Admin SDK init, reservation-gated client uploads, and the wider access boundary** → `firebase`. This skill owns the image pipeline that runs on top of those primitives.
- **CDN transform URLs and delivery-time derivatives** (responsive sizes, watermarks, format/quality auto) → `cloudinary`. This skill hands off at "a processed source image exists in Storage"; `cloudinary` owns how it's transformed and delivered.
- **Route/service architecture the upload endpoints live in** (thin handlers, typed errors, response builders, cron auth) → `api-architecture`.
- **Upload security beyond the caps** — content sniffing vs trusting `contentType`, rate limits, BOLA on file endpoints → `backend-security`; client-side upload risks → `frontend-security`.
- **`next/image`, framework caching, and revalidation mechanics** behind the `router.refresh()` step → `nextjs`.
- **Alt text on delivered images** → `accessibility`; **asset and slot naming** → `naming`; delivery-performance review → `performance-audit`.
