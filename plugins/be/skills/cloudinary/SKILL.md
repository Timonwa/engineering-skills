---
name: cloudinary
description: >-
  The house rules for Cloudinary on top of the official Cloudinary skills — when a project uses it, storing the public id and building URLs at read time, `f_auto/q_auto` as their own final components, versioned named transformations, a width ladder through one helper, credentials as constants with the secret server-only, signed uploads behind auth, destroy with invalidation, private assets, account hardening and strict transformations, and the credit meters. Use when delivering or uploading images through Cloudinary.
---

# Cloudinary

Cloudinary derives every size, format and quality of an image from one stored asset at delivery time, so a project builds URLs rather than files. It's the house choice for content sites — a blog, a portfolio — and for delivering derivatives an upload pipeline has already produced; it isn't a default part of every app. The official skills teach the SDKs and the transformation language; this skill holds only the rules a project adds on top.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Two shapes

- **Delivery only** — the assets already exist in Cloudinary (uploaded through its Media Library, or by a pipeline elsewhere); the app only builds URLs. No SDK, no secret.
- **A pipeline** — the server uploads, names and deletes assets with the Node SDK. Where originals live in storage, Cloudinary gets a copy only as large as the biggest derivative needs (`image-handling`).

## Assets and URLs

- **Store the public id and its version, never a URL.** The URL is built when the record is read, so a cloud-name change or a new transformation needs no migration. The version (`v<digits>`, from the upload response) changes on every overwrite and busts the CDN's copy.
- **The public id is deterministic** — a path per kind plus your own record id (`blog-covers/post-42`) — so a re-upload overwrites rather than piling up copies. Accounts use dynamic folders: the path lives in the public id, `asset_folder` only places it in the console, and the old `folder` parameter isn't used. No segment may look like a version (`v` followed by digits) or a transformation.
- **One helper builds every URL** from the cloud name, the public id, the version and a transformation, on the server, where the per-tier cloud name is read; the page receives the finished URL (`env`). A version is in [references/url-helper.md](references/url-helper.md).
- **`f_auto` and `q_auto` end every delivery URL, each as its own component** — `c_limit,w_800/f_auto/q_auto`, never merged into the resize step (Cloudinary's own guidance). An image without them is a defect, unless it needs a fixed format or quality.
- **Crops are chosen, not defaulted:** `c_limit` for content images, so nothing is upscaled; `c_fill,g_auto` for fixed-shape slots (cards, avatars), so the crop follows the subject. The rest of the language is `cloudinary-transformations`'s.
- **Responsive images use a width ladder** — `[480, 768, 1024, 1280, 1600]` to start, topped at about twice the largest rendered width — with a real `sizes`. In Next.js, the components that show Cloudinary images pass `next/image` a `loader` that only adds the width to the URL the server built — per image, never `images.loaderFile`, which would rewrite every image on the site — and `images.deviceSizes` is set to the ladder, so the widths stay bounded. `<CldImage>` is an option, not the default.

## Named transformations

- **A recipe used in many places is a named transformation** (`t_card_v1`), created by an idempotent script, never by hand in the console.
- **Version them; never edit one in production.** The CDN keeps renders made with the old definition, so a change ships as `t_card_v2` and the old name goes once nothing uses it.
- **`f_auto` follows the name** — `t_card_v1/f_auto/q_auto`. Inside a named transformation it's ignored, because the CDN can't see it there.

## Credentials

- **The cloud name and the API key are public facts**, committed as per-tier constants (`env`): the cloud name is in every URL, and the key can't sign anything alone. **The API secret** is the account — server-only, from the secret manager, never in a public variable or a bundle.
- **Pick the cloud name before any URL ships**; renaming it breaks every cached URL.
- **Keys are key-and-secret pairs with roles.** Give each use its own pair with the narrowest role; to rotate, generate a new pair, deploy it, then deactivate the old one.
- **A product environment per tier** where the plan allows, otherwise an account per tier; a single shared one is a recorded choice.

## Uploads and deletes

- **The server uploads** through one configured SDK instance; services import it and never call `config()` themselves.
- **A browser that uploads directly uses a signed upload.** The signature route sits behind the session guard and a rate limit, and signs only the parameters the server chose — public id, `asset_folder`, timestamp, and the allowed formats and size (or a signed preset holding them), so it can't take an SVG or a type `image-handling` forbids — never whatever the request sends. The server verifies the upload response's signature before it records the public id and version the browser reports. An unsigned preset lets anyone with the cloud name fill the account; use one only for genuinely anonymous input, locked to a folder and limited by an incoming transformation.
- **Deletes purge the CDN too:** `uploader.destroy(publicId, { resource_type, invalidate: true })`. Without `invalidate`, the image keeps being served until its cache expires.

## Private assets

- **Default `upload` delivery is public**, and anyone who sees one URL can request any transformation of the asset.
- **Gated assets use the `authenticated` type with signed URLs**, which protects the original and every derivative; `private` protects only the original. A signed URL can be shared, so it's minted only after the access check and never stored. On its own it doesn't expire: only token-based access, on plans that include it, limits it in time. Without that, gated content lives in the private storage bucket behind short signed links instead (`image-handling`).
- **Private assets also send `X-Robots-Tag: noindex`**, set with the upload's `headers` option.

## Hardening the account

On day one, on the console's Security page:

- **Decide strict transformations.** Without it, anyone can mint unlimited new transformation URLs from a public id, and each one is billed. Turn it on for a busy or high-value account, which means every URL is signed, named or allowlisted by referrer — and every chained form actually requested (`t_card_v1/f_auto/q_auto`, each width in the ladder) is marked allowed for strict or generated eagerly, or every image breaks; leaving it off for a small site with a few fixed shapes is a recorded choice, watched on the transformations meter.
- **Keep `Fetched URL` restricted** unless the site fetches remote images, and then list the allowed fetch domains; an open fetch makes the account a proxy anyone can bill.
- **Leave PDF and ZIP delivery off** unless the site serves them, set Cloudinary staff access to controlled visibility (temporary access an admin grants), and limit Admin API access to the server's IP addresses where it has fixed ones.

## Cost

Credits are one pool shared by transformations, storage and bandwidth ([current plans](https://cloudinary.com/pricing)):

- **A transformation is billed once per new derived asset**, then every request for it is bandwidth. Each rung of a width ladder is its own derivative, and `f_auto` can produce one per format, so a launch or a bulk upload spikes the meter and steady state is storage and bandwidth.
- **An upload counts as a transformation**, and an unbounded set of transformation URLs is the billing attack strict transformations closes.
- **Storage only grows** until you delete, so keep the stored copy no bigger than the largest derivative.

## Do / Don't

- **Do** store the public id and version; build URLs in one helper; end with `/f_auto/q_auto`; version named transformations; keep the secret server-only; sign only server-chosen parameters behind auth; destroy with `invalidate: true`; use `authenticated` for gated assets; decide strict transformations on day one.
- **Don't** store a delivery URL; merge `f_auto` or `q_auto` into another component; put `f_auto` inside a named transformation; edit a named transformation in production; expose the secret; sign whatever a request sends; rely on an unsigned preset; leave `Fetched URL` open.

## Related skills

Transformations, crops and effects `cloudinary-transformations` (official) · `next-cloudinary` components `cloudinary-next` (official) · the upload pipeline and storage `image-handling` · constants and secrets `env` · `next/image` loaders `nextjs` · `img`, `srcset` and `sizes` markup `semantic-html` · upload routes `api-architecture` · signature-route limits `rate-limiting` · server threats `backend-security` · alt text `accessibility`.
