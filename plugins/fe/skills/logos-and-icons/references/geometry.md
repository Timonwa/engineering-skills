# Geometry and type — the numbers behind a mark

Every dimension in a logo comes from a measurement or an established ratio, never "about right". This is the detail behind `SKILL.md`'s "Derive every number".

## Contents

- [Optical overshoot](#optical-overshoot)
- [Optical centring](#optical-centring)
- [The type scale of a lockup](#the-type-scale-of-a-lockup)
- [Proportions as ratios](#proportions-as-ratios)
- [Outlining the wordmark](#outlining-the-wordmark)
- [Composing the lockup](#composing-the-lockup)

## Optical overshoot

A circle inscribed in a box fills only π/4 ≈ 78.5% of it; a square fills all of it. Give them the same nominal size and the circle reads as smaller, so round shapes **overshoot** their keyline. Material's keylines codify it: on a 24dp grid the square keyline is 18×18 and the circle Ø20, about 11% larger.

| Sibling shapes                     | Overshoot                                 |
| ---------------------------------- | ----------------------------------------- |
| circle beside a hard-edged square  | ~10–11%                                   |
| circle beside a **rounded** square | ~6–8% (the rounding already removes area) |
| pointed shapes (triangle, diamond) | more again — they fill least              |

A mark whose round and square elements share identical bounding boxes has this bug. Check by rendering large with keyline rectangles over both shapes.

## Optical centring

- Centre a glyph on its **visual mass**, not its bounding box; asymmetric marks (a play triangle, a lone descender) need nudging.
- Align a mark to the wordmark's **cap height** or optical centre, never its box, which includes ascender and descender space the eye doesn't see.
- Overshoot breaks mathematical symmetry on purpose. Optics win.

## The type scale of a lockup

- A secondary line ("by <Creator>", a tagline) sits at roughly **0.5–0.6×** the wordmark's size; below ~0.45× it stops reading as part of the lockup.
- WCAG exempts logotype text from contrast minimums, but treat **4.5:1 as the design floor** for a secondary line — a light grey that looks subtle at 40px is illegible at 16px.
- Derive the lockup's dimensions from font metrics — `getBoundingBox()` for ink extents, `getAdvanceWidth()` for widths — and set the mark's height **equal to the measured text block**, so the two stay aligned if the type size changes.

## Proportions as ratios

Express the tile's corner radius and the inner glyph's scale as ratios of the tile, so resizing keeps the design:

```js
const radius = (ICON * 11) / 48; // corner radius keeps its ratio
const scale = ICON / 48; // inner glyph scales with the tile
```

Baked-in rounding is only for surfaces that apply no mask of their own (a README, in-app rendering, avatars you control). Platform icon slots mask for you — see the safe zones in `SKILL.md`.

## Outlining the wordmark

Fonts loaded from a service (`next/font/google`, a CDN) leave no file in the repo, so fetch the file the service serves, then outline it. Install the tooling **outside the project**:

```bash
# 1. Find the real font file behind the CSS
curl -s "https://fonts.googleapis.com/css2?family=Geist:wght@400;700" \
  -H "User-Agent: Mozilla/5.0" | grep -oE "https://[^)]+\.ttf" # opentype.js reads ttf, not woff2

# 2. Fetch the weights the wordmark uses
curl -s -o /tmp/font-700.ttf "https://fonts.gstatic.com/…"

# 3. The outliner in a scratch directory, not the project
mkdir -p /tmp/fonttool && cd /tmp/fonttool && npm install opentype.js
```

```js
const opentype = require("opentype.js");
const fs = require("fs");
const bold = opentype.parse(fs.readFileSync("/tmp/font-700.ttf").buffer); // loadSync() is deprecated

const size = 34;
const pathData = (font, text, x, y) => font.getPath(text, x, y, size).toPathData(2);
const advance = (font, text) => font.getAdvanceWidth(text, size);
```

Record the recipe **in a comment inside the generated SVG**, so a later regeneration is reproducible:

```svg
<!-- Wordmark: Geist 700 @34px + Geist 400 @19px, outlined via opentype.js.
     Source: fonts.gstatic.com/s/geist/v5/…ttf -->
```

## Composing the lockup

- Derive the SVG's `viewBox` width from the outlined text's advance widths plus the mark and the gap.
- Align the wordmark's baseline to the mark's optical centre, not its bounding box.
- A "by <Creator>" line is smaller, in a muted tone, aligned to one edge of the wordmark — usually right-aligned under it, so the lockup stays a tidy rectangle.
- The mark's geometry is identical in the lockup and the standalone icon; two slightly different marks is the drift this skill exists to prevent.
