# A display image, end to end

Caps in one module, the browser's checks as a courtesy, the server as the gate, a fixed-slot replace with a version, and a signed link behind its access check.

```ts
// the shared constants — the one source of every cap
export const DISPLAY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DISPLAY_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // before compression
export const IMAGE_MAX_PIXELS = 40_000_000;
export const IMAGE_COMPRESSION_QUALITY = 0.8;
export const AVATAR_DIMENSIONS = { width: 200, height: 200 };
export const SIGNED_LINK_MINUTES = 15;
```

```tsx
// the browser — checks and compression are for the person; the server re-checks everything
const handleAvatarSelect = (file: File) => {
  const validationError = validateImageFile(file, { types: DISPLAY_IMAGE_TYPES, maxBytes: DISPLAY_IMAGE_MAX_BYTES });
  if (validationError) return setError(validationError);

  startTransition(async () => {
    const compressed = await compressImage(file, { ...AVATAR_DIMENSIONS, quality: IMAGE_COMPRESSION_QUALITY });
    const result = await uploadAvatar(toFormData(compressed));
    if (!result.success) return setError(result.message);
    router.refresh(); // the new version only shows once it re-renders through server props
  });
};
```

```ts
// the service — the gate; assume the browser check never ran
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

export async function uploadAvatar(ownerId: string, file: File): Promise<void> {
  if (file.size > DISPLAY_IMAGE_MAX_BYTES) throw new ValidationError("Image is too large");
  const bytes = Buffer.from(await file.arrayBuffer());

  const detected = await fileTypeFromBuffer(bytes); // the bytes, not the label
  if (!detected || !DISPLAY_IMAGE_TYPES.includes(detected.mime)) throw new ValidationError("Unsupported image type");
  await sharp(bytes, { limitInputPixels: IMAGE_MAX_PIXELS }).metadata(); // throws on a bomb or a non-image

  const path = `${ownerId}/avatar`; // fixed slot — a replace overwrites
  await publicBucket.file(path).save(bytes, { metadata: { contentType: detected.mime } });
  await updateProfile(ownerId, { avatarPath: path, avatarVersion: Date.now() }); // a path and a version, never a URL
}

// at read time
export const buildPublicImageUrl = (path: string, version: number) =>
  `https://storage.googleapis.com/${PUBLIC_BUCKET}/${path}?v=${version}`;
```

```ts
// the route — the access check and the signed link in the same request, never from the client
export async function GET(request: Request, ctx: { params: Promise<{ fileId: string }> }) {
  try {
    await applyRateLimit(request, "READ", "files:download");
    const { fileId } = validateParams(await ctx.params, FileIdParamsSchema);
    const { file } = await loadFileWithPermission(request, fileId, "project.file.view"); // 404 if hidden

    const [url] = await privateBucket.file(file.storagePath).getSignedUrl({
      action: "read",
      expires: Date.now() + SIGNED_LINK_MINUTES * 60 * 1000,
      responseDisposition: `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    });
    return ok({ url }); // returned, never stored
  } catch (error) {
    return errorResponse(error);
  }
}
```
