# Rendering the icon set

How every raster comes from the one authored SVG: the plate, `sharp`, PNG-in-ICO, and a theme-aware SVG favicon. Behind `SKILL.md`'s "The asset set".

## Contents

- [A raster on a plate](#a-raster-on-a-plate)
- [favicon.ico from PNGs](#faviconico-from-pngs)
- [A theme-aware SVG favicon](#a-theme-aware-svg-favicon)
- [A committed generator](#a-committed-generator)

## A raster on a plate

`sharp` rasterises the SVG at a high density, then composites it centred on an opaque square of the brand's plate colour:

```js
// ESM, for top-level await
import fs from "node:fs";
import sharp from "sharp";

const PLATE = "#f4ecdb"; // the brand's plate colour, from the brand guide
const INSET = { any: 0.11, maskable: 0.21 }; // apple-icon and `any` 11% a side; maskable inside the 40% circle

async function renderIcon(svgPath, size, { inset = INSET.any } = {}) {
  const inner = Math.round(size * (1 - inset * 2));
  const viewBox = (await fs.promises.readFile(svgPath, "utf8")).match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24";
  const viewBoxWidth = Number(viewBox.split(/[\s,]+/)[2]);
  const density = Math.ceil((72 * inner) / viewBoxWidth); // rasterise at the target size, never upscale
  const mark = await sharp(svgPath, { density }).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: PLATE } })
    .composite([{ input: mark, gravity: "centre" }])
    .flatten({ background: PLATE }) // no alpha left: apple-touch and store icons reject it
    .png()
    .toBuffer();
}
```

## favicon.ico from PNGs

`sharp` doesn't write ICO, but an ICO file can hold PNG images directly, and every current browser reads it. Render the PNGs, then pack them:

```js
// An ICO holding PNG data: a 6-byte header, a 16-byte entry per image, then the PNGs.
function packIco(pngs /* [{ size, buffer }] */) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, buffer }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((png) => png.buffer)]);
}

const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map(async (size) => ({ size, buffer: await renderIcon("icon.svg", size, { inset: 0 }) })));
await fs.promises.writeFile("favicon.ico", packIco(pngs));
```

Because it's generated with everything else, `favicon.ico` can't quietly keep an old mark after a rebrand — the most common stale asset when it's made by hand.

## A theme-aware SVG favicon

An SVG favicon can recolour itself for the browser's theme — the one thing no raster can do. It's the alternative to a plate, for a mark that reads in both colours:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    path { fill: #111; }
    @media (prefers-color-scheme: dark) { path { fill: #eee; } }
  </style>
  <path d="…" />
</svg>
```

Never ship a transparent mark that works on only one background: the tab strip's colour is the user's, not yours. Google Search doesn't read SVG favicons, so `favicon.ico` (or a PNG `icon`) ships beside it either way.

## A committed generator

When one mark feeds several apps or tiers, a committed script keeps every raster in step:

- **It reads the authored SVGs only**, and writes every raster — icons, `favicon.ico`, PNG copies of each mark for email — so the SVG is the only file anyone edits.
- **One command**, documented in the project's README (`pnpm icons:generate`), re-run after any change to a mark; the outputs are committed, so builds don't depend on it.
- **Its output names are the framework's contract** (`app/icon.svg`, `app/apple-icon.png`, `app/favicon.ico` in Next.js), written per app.
- **Each choice carries its reason in a comment** — why a plate, why a size — so the next person doesn't undo it.
