# A delivery URL helper

Plain string work — no SDK, no credentials — so it's safe in client code. It builds a URL from what the record stores (the public id and its version), so no delivery URL is ever stored.

```ts
// cloudinary.utils.ts
const CLOUDINARY_ORIGIN = "https://res.cloudinary.com";

// `f_auto` and `q_auto` are their own final components, never merged into the resize step.
const OPTIMISE = "f_auto/q_auto";

export function buildCloudinaryUrl(
  cloudName: string, // a committed per-tier constant
  publicId: string,
  version: number, // from the upload response; changes on every overwrite
  transformation?: string, // `c_limit,w_800`, or a versioned named one: `t_card_v1`
): string {
  const steps = transformation ? `${transformation}/${OPTIMISE}` : OPTIMISE;
  return `${CLOUDINARY_ORIGIN}/${cloudName}/image/upload/${steps}/v${version}/${publicId}`;
}

// Starting ladder — top it at about twice the largest rendered CSS width.
export const RESPONSIVE_WIDTHS = [480, 768, 1024, 1280, 1600] as const;

export function buildCloudinarySrcset(cloudName: string, publicId: string, version: number): string {
  return RESPONSIVE_WIDTHS.map(
    (width) => `${buildCloudinaryUrl(cloudName, publicId, version, `c_limit,w_${width}`)} ${width}w`,
  ).join(", ");
}

// A blur placeholder: tiny, blurred and cheap, so it takes a low quality instead of `q_auto`.
export const buildCloudinaryPlaceholder = (cloudName: string, publicId: string, version: number) =>
  `${CLOUDINARY_ORIGIN}/${cloudName}/image/upload/c_limit,w_40/e_blur:1000/f_auto/q_auto:low/v${version}/${publicId}`;
```

In Next.js, the server builds the URL without a width and the image component adds one per request. The loader is passed per image — never `images.loaderFile`, which would rewrite every image on the site — and `images.deviceSizes` in `next.config` is set to the ladder:

```ts
// cloudinary-loader.ts — passed as `loader` by the client component that shows a Cloudinary image
import type { ImageLoaderProps } from "next/image";

export function cloudinaryLoader({ src, width }: ImageLoaderProps): string {
  // `src` is the full URL the server built: …/image/upload/f_auto/q_auto/v<version>/<publicId>
  return src.replace("/image/upload/", `/image/upload/c_limit,w_${width}/`);
}
```

Markup outside Next.js pairs the `srcset` with a real `sizes`; without it the browser assumes the full viewport width and downloads too much:

```html
<img
  src="…c_limit,w_1024/f_auto/q_auto/v1712345678/blog-covers/post-42"
  srcset="…"
  sizes="(max-width: 768px) 100vw, 768px"
  width="1200"
  height="800"
  alt="…"
  loading="lazy"
  decoding="async"
/>
```
