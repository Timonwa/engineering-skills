---
name: cloudinary
description: >-
  Delivering images from Cloudinary and wiring the account and SDK into a project — the delivery URL grammar and transform insertion, responsive width ladders and srcset, blur placeholders, the cloud-name vs API-key vs API-secret boundary, signed and unsigned uploads, account hardening, and the credit cost model. Use on Cloudinary, res.cloudinary.com, transform URL, srcset, upload preset, signed URL, f_auto/q_auto, image CDN.
---

# Cloudinary

Cloudinary derives every variant (size, format, quality, effects) **at delivery time from one uploaded asset** — you build URLs, not files. Two shapes exist and a project may have either: **delivery-only** (no upload pipeline; the app just builds transform URLs from existing assets — no SDK, no secrets) and **full pipeline** (server-side SDK for uploads and account provisioning). The one secret is the API secret, and it never leaves the server.

> **Project facts → `AGENTS.md`:** the cloud name per environment, folder scheme, named-transformation names, env var names, and which shape the project uses. This skill is the portable standard.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The delivery URL grammar

- **Every delivery URL follows one shape:** `https://res.cloudinary.com/<cloud_name>/<resource_type>/<delivery_type>/<transformations>/<version>/<public_id>.<ext>` — e.g. `.../myclould/image/upload/w_800,c_limit,q_auto,f_auto/v1712345678/blog/hero.jpg`. Transforms are edited into the URL between `/upload/` and the version/public_id; the asset is never re-uploaded to get a variant.
- **A transform component is comma-separated `key_value` params; chained components are `/`-separated and apply sequentially.** `w_800,c_limit,q_auto` is one component; `c_fill,w_300/e_grayscale` is a two-step chain. Never put the same param twice in one component (two `w_`s is invalid) — add a step to the chain instead.
- **The version segment is `v` + digits** (`v1712345678`) — it's a cache-busting asset version, not a transform. When parsing a URL, `v\d+` right after `/upload/` means "no transforms yet".
- **Always end the chain with `q_auto,f_auto`.** `f_auto` negotiates the best format per browser (AVIF/WebP with the original as fallback); `q_auto` picks a perceptually tuned quality. These two alone are most of Cloudinary's delivery value — an image URL without them is a defect.
- **Crop modes are a deliberate choice, not interchangeable:** `c_limit` = shrink only if larger, never upscale, keep aspect (the default for content images); `c_fit` = fit inside the box, may upscale; `c_fill` = exact `w×h`, crops overflow — pair with `g_auto` (or `g_auto:faces` for people) so the crop centers on the subject; `c_scale` = exact dimensions, distorts. Fixed-shape UI slots (cards, avatars) get `c_fill,g_auto`; everything else gets `c_limit`.
- **Name Cloudinary folders with hyphens, never underscores** (`blog-covers`, not `blog_covers`) — transform params look like `xx_value`, so an underscore folder as the first path segment is indistinguishable from a transform chain when parsing URLs.

## Building transform URLs (delivery-only)

- **The helper is pure string manipulation in client-safe code** — no SDK import, no credentials. It needs only the URL (or the cloud name from a `NEXT_PUBLIC_*`/`PUBLIC_*` env var when building from bare public_ids).
- **Insert transforms into the `/upload/` segment; pass non-Cloudinary URLs through untouched** so the helper is safe to call on any `src`.
- **Detect what follows `/upload/` before inserting:** a `v\d+` segment or a plain path → prepend the transform as the first component; an existing transform chain → append yours as a **new `/`-separated step**, never comma-merged into the same component where duplicate params collide.
- **Blur placeholder = tiny + blurred + cheap:** `w_40,e_blur:1000,q_auto:low,f_auto` (blur strength ranges 1–2000). Serve it as a `background-image` behind the real `<img>` and fade the full image in on `load` — with a `prefers-reduced-motion` opt-out that shows it immediately.

## Responsive delivery

- **Default width ladder: `[480, 768, 1024, 1280, 1600]`** — a starting point, not a law. Trim it to your layout: the top rung should be about the largest rendered CSS width × 2 (for 2× DPR screens); rungs beyond that are pure bandwidth waste.
- **Build `srcset` from the ladder with `w` descriptors and always pair it with a real `sizes` attribute** — without `sizes` the browser assumes `100vw` and over-downloads. The `<img>`/`srcset`/`sizes` markup rules live in `semantic-html`.
- **Don't stack `dpr_auto` onto a `w`-descriptor `srcset`.** The browser already factors DPR into which `srcset` candidate it picks; `dpr_auto` on top double-counts it, and it only activates under Client Hints (an opt-in `Accept-CH` header, Chromium-only) so it silently does nothing elsewhere. Use `dpr_auto` only for a single fixed-width image on a site that has Client Hints configured.
- **In Next.js, don't hand-roll `srcset`** — give `next/image` a custom Cloudinary `loader` that returns `w_${width},c_limit,q_auto,f_auto` URLs and let it manage the ladder (→ `nextjs`). Hand-rolled `srcset` is for frameworks without an image component (Astro remote images, plain HTML).

## Credentials & env wiring

- **Three values, three sensitivity levels:** the **cloud name** is public — it appears in every delivery URL, so expose it as `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (or the framework's public-env equivalent). The **API key** is a non-secret identifier (useless without the secret) but has no business in a client bundle either — keep it server-side. The **API secret** is full account control: server env + secret manager only, never `NEXT_PUBLIC_`/`VITE_`-prefixed, never committed (→ `frontend-security`, `devops`).
- **Validate all three with Zod at boot** so a misconfigured deploy fails at startup, not at the first upload:

```ts
// config/env.ts — server app
const EnvSchema = z.object({
  // …
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
});
```

- **Pick the cloud name before any URL ships.** It is baked into every public delivery URL, so renaming later breaks every cached image. Rename the autogenerated one (`dzciq2xje`-style) to a clean brand-aligned name on day one.
- **Per-environment isolation costs money or accounts:** the free plan allows one product environment per account, so dev/staging/prod isolation means separate free accounts (`<brand>-dev`, `<brand>-staging`, `<brand>`) or a paid multi-environment plan. A single shared account is acceptable early — keep the per-env names reserved and record the choice in `AGENTS.md`.
- **Rotation gotcha:** regenerating the API secret regenerates the API key with it. Update both everywhere, redeploy, and only then revoke the old key in the dashboard.

## The server SDK (full pipeline)

- **One boot module configures the SDK once; every service imports the configured instance** and never calls `cloudinary.config()` itself:

```ts
// lib/cloudinary.ts — server-only; the single configured instance
import { v2 as cloudinary } from "cloudinary";
import { env } from "@/config/env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };
```

- **Uploads go through the server by default** — `cloudinary.uploader.upload(file, { folder, public_id, overwrite: true })` with a **deterministic `public_id`** (derived from your own record id) so re-uploads overwrite instead of accumulating duplicates. The client sends the file to your API; your API talks to Cloudinary.
- **If the client must upload directly, use signed uploads, not unsigned presets.** The server generates a per-request signature (`cloudinary.utils.api_sign_request(params, apiSecret)`) and the client POSTs to `https://api.cloudinary.com/v1_1/<cloud_name>/image/upload` with it — the server still controls folder and public_id. An **unsigned upload preset** lets anyone holding your public cloud name + preset name fill your account; only accept one for genuinely anonymous input, locked to a folder with an incoming size/format-limiting transformation, and treat it as a standing liability.
- **Version named transformations, never edit them in place.** Reusable transform recipes become named transformations (`t_<name>` in URLs), provisioned by an idempotent script via `cloudinary.api.create_transformation(name, transformationString)` — suffix the name `_v1` and ship a `_v2` for changes, because the CDN keeps derivatives cached against the old definition and in-place edits leave stale renders live. During pre-launch tuning, delete + recreate (`api.delete_transformation` then create) to force cache invalidation.

## Access control & signed delivery

- **Default `upload` delivery is public and enumerable** — anyone with the URL (or a guessed public_id) gets the asset and any transform of it. Fine for blog covers; wrong for paid or private content.
- **When assets shouldn't be publicly reachable, deliver as `type: "authenticated"` with `sign_url: true`** — the SDK inserts an `s--<signature>--` component into the URL, and unsigned requests 401. `type: "private"` protects only the original (derived transforms stay public) — prefer `authenticated` when in doubt. Time-boxed access adds an `auth_token` with a `duration`.

```ts
const url = cloudinary.url(publicId, {
  type: "authenticated",
  sign_url: true,
  transformation: [{ width: 1024, crop: "limit" }, { quality: "auto", fetch_format: "auto" }],
});
```

- **Harden the account settings on day one** (Settings → Security): restrict the **`Fetched URL`** delivery type — otherwise your account is an open remote-image proxy anyone can bill against once the cloud name leaks (it's in every URL); leave **PDF and ZIP delivery** disabled; leave Cloudinary support access off outside an active support ticket.
- **Decide the strict-transformations posture explicitly.** Anyone who can see a public_id can mint unlimited _new_ transform URLs, and each unique one is a billed transformation — that's the transform-bombing cost attack. **Strict transformations** closes it by rejecting on-the-fly transforms unless signed, eager, or from a named/allowlisted source — turn it on for high-value assets or a high-profile cloud, and note that it forces every delivery URL through signing or pre-declared transforms. For a small site whose URLs use a handful of fixed transform shapes, leaving it off and watching the transformation meter is a defensible trade — but make it a decision, not a default you never saw.

## The cost model

- **Credits are one shared pool across three meters** — on the free plan, 25 credits per rolling 30-day window, where 1 credit = 1,000 transformations = 1 GB storage = 1 GB bandwidth, in any combination ([pricing](https://cloudinary.com/pricing) — verify current numbers before capacity planning).
- **The meters age differently:** storage is cumulative (never shrinks unless you delete), bandwidth is monthly and traffic-shaped, and **transformations are one-time per unique URL** — the first request renders and bills; every later request is a CDN cache hit (bandwidth only).
- **`f_auto` multiplies the transformation count** — each derived URL renders once per negotiated format (typically 2–3 variants: AVIF/WebP + fallback), so budget roughly `unique transform URLs × formats`, not `× 1`.
- **Transformations spike, then evaporate.** The month you first render a batch of assets pays the whole transformation cost; steady state is storage + bandwidth. So watch the transformations meter around launches and bulk uploads — and remember every rung of a `srcset` ladder is its own unique URL. This spike profile is also why unrestricted on-the-fly transforms are the billing attack surface (see strict transformations above).
- **Keep the stored source small when Cloudinary is derivative-only.** If originals live elsewhere (e.g. a private storage bucket → `image-handling`), push Cloudinary a downsized copy only as large as the biggest derivative needs — storing 20 MB originals to serve 300 px thumbnails burns the storage meter for nothing.

## Example

The delivery-only helper — client-safe, no SDK, safe to call on any `src`:

```ts
// lib/cloudinary.ts — delivery-only URL helpers (no secrets, no SDK)
const CLOUDINARY_HOST = "res.cloudinary.com";

export function isCloudinaryUrl(url: string): boolean {
  return url.includes(CLOUDINARY_HOST);
}

// Transform components are comma-separated `key_value` params. Requires
// hyphenated folder names — an underscore folder would false-positive here.
function isTransformChain(segment: string): boolean {
  return segment.split(",").every(part => /^[a-z]+_[^/]+$/.test(part));
}

function withTransform(url: string, transform: string): string {
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url; // not an upload-delivery URL — leave it alone

  const head = url.slice(0, idx + marker.length);
  const tail = url.slice(idx + marker.length);
  const first = tail.split("/")[0];

  // `v<digits>` is a version segment, not a transform — insert before it.
  if (/^v\d+$/.test(first)) return `${head}${transform}/${tail}`;

  // Existing chain: append ours as a NEW `/` step — comma-merging into one
  // component collides on duplicate params (two `w_`s is invalid).
  if (isTransformChain(first)) {
    return `${head}${first}/${transform}/${tail.slice(first.length + 1)}`;
  }

  return `${head}${transform}/${tail}`;
}

export function cloudinaryResized(url: string, width: number): string {
  if (!isCloudinaryUrl(url)) return url;
  return withTransform(url, `w_${width},c_limit,q_auto,f_auto`);
}

export function cloudinaryBlurUrl(url: string): string {
  if (!isCloudinaryUrl(url)) return url;
  return withTransform(url, "w_40,e_blur:1000,q_auto:low,f_auto");
}

// Starting-point ladder — trim the top rung to ~2× your largest rendered CSS width.
export const DEFAULT_RESPONSIVE_WIDTHS = [480, 768, 1024, 1280, 1600];

export function cloudinarySrcset(url: string, widths: number[] = DEFAULT_RESPONSIVE_WIDTHS): string {
  if (!isCloudinaryUrl(url)) return "";
  return widths.map(w => `${cloudinaryResized(url, w)} ${w}w`).join(", ");
}
```

Consumed in markup (any framework — `sizes` must describe the real layout):

```html
<img
  src={cloudinaryResized(coverUrl, 1024)}
  srcset={cloudinarySrcset(coverUrl)}
  sizes="(max-width: 768px) 100vw, 768px"
  width="1200" height="800"
  alt="…"
  loading="lazy" decoding="async"
/>
```

## Boundaries

- **The upload pipeline that feeds Cloudinary** — client-side compression caps, EXIF stripping, storage bucket tiering, orphan reaping → `image-handling`. This skill starts where an asset already has a Cloudinary public_id.
- **Firebase Storage, signed storage URLs, Secret Manager + App Hosting env wiring** → `firestore`; general secret/env strategy and CI secret scanning → `devops`.
- **The official Cloudinary skills own the SDK surface.** This skill is the portable house standard — the URL grammar, credential boundary, account hardening, and the cost model. For SDK-specific work go to the vendored skills: **`cloudinary-next`** (`next-cloudinary` — `CldImage`, `CldOgImage`, `CldUploadWidget`, server actions), **`cloudinary-react`** (`@cloudinary/url-gen` + `@cloudinary/react` in Vite/CRA apps), **`cloudinary-transformations`** (turning a described effect into a transformation string, AI transformations, named transformations, debugging a URL that will not render), and **`cloudinary-docs`** (looking a detail up in the current docs). Where they and this skill overlap on URL grammar, they are the deeper reference and this one is the rule about what the project may do.
- **`next/image`, custom loaders, and Next caching of image routes** → `nextjs`; the `<img>`/`srcset`/`sizes`/`<picture>` markup itself → `semantic-html`.
- **No secrets in the client bundle** (the API secret rule is an instance of it) → `frontend-security`; server-side upload endpoint safety (auth, size limits, rate limits) → `backend-security`.
- **Alt text and non-decorative image semantics** → `accessibility`; image weight/LCP review → `performance-audit`; image sitemaps and structured data → `seo`.
