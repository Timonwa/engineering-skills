---
name: logos-and-icons
description: >-
  A brand's logo and icon assets, and how they're used — the seven logo types, outlined type, numbers derived not guessed, an opaque plate behind every icon, the favicon set (an ICO for search, an SVG for the tab), PWA maskable, Android adaptive and Apple icons with their safe zones, PNG copies for email, a one-off asset run or a committed generator, clear space and minimum sizes, and the accessible name. Use when creating, regenerating or placing a logo, icon or favicon.
---

# Logos and icons

A logo is an **exportable asset** that has to survive leaving the codebase — into a design file, a press kit, someone else's slide deck — and an **installable asset** that has to survive every platform's mask, crop and theme. It's produced once, used everywhere, and must look the same in all of them.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## How it runs

Ask which of two jobs this is:

- **A one-off set** — a new brand, a redesign, assets for someone else. Write everything to `media/` in the working directory, say what each file is for, and let the owner place it. Install tooling outside the project, and leave nothing behind: no scratch directories, fonts, preview pages or screenshots.
- **A project's own marks, used by several apps or tiers.** A committed generator renders every raster from the authored SVGs with one command, so a logo change is one SVG edit and a re-run ([references/rendering.md](references/rendering.md)).

Either way, **ask which slots are needed**. A plain website needs a logo, an icon and a favicon. Maskable, adaptive and store icons exist only if the brand ships an installable or native app.

## First: which of the seven types?

The type decides which assets exist at all, so settle it before drawing.

| Type                      | Built from                       | Examples             | Survives 16px?                                  |
| ------------------------- | -------------------------------- | -------------------- | ----------------------------------------------- |
| **Wordmark** (logotype)   | the full name, as type           | Google, FedEx        | No — needs a derived mark for icon slots        |
| **Lettermark** (monogram) | initials, as drawn letterforms   | IBM, HP, Netflix "N" | Yes — it _is_ the icon                          |
| **Pictorial mark**        | a literal, nameable image        | Apple, Target        | Yes, if simple                                  |
| **Abstract mark**         | non-literal geometry             | Nike, Mastercard     | Yes, if simple                                  |
| **Mascot**                | a character                      | Michelin Man         | Rarely — derive a simplified head or silhouette |
| **Combination mark**      | mark + wordmark in a lockup      | most startups        | The mark detaches and serves alone              |
| **Emblem**                | name locked inside a shape/badge | Starbucks, crests    | No — draw a separate simplified icon            |

For a new brand with no preference, a **combination mark** is the safe default: the mark detaches for every icon slot and the name rides along everywhere else. Every brand needs a square icon; a wordmark brand derives one (usually a lettermark), because full names die at 16px. A lettermark is a drawn shape that happens to be a letter, and follows the icon rules.

## Ask before drawing

Never infer a brand. In one batch: the type, or 2–3 directions to choose from; whether a mark already exists; the **exact brand colour** and where it lives (never invent a hex); the default background; the variants needed (light, dark, monochrome, knockout); where it will be used (web only, a native app, social, email, print); and the typeface, its weights and its licence. Show real renders, not descriptions — the owner's taste outranks yours.

## The deliverables

| Artifact            | Contains                                                         | Used for                                      |
| ------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| **Primary logo**    | whichever of the seven types the brand is                        | site header, README, press, decks             |
| **Lockup variants** | combination brands: horizontal and, if needed, stacked           | wide headers vs. square-ish placements        |
| **Brand icon**      | the mark alone — derived for wordmarks, simplified for emblems   | favicon, app icon, avatar, notification badge |
| **Icon set**        | the brand icon rasterised at each platform's sizes and safe zone | browser tab, home screen, install surfaces    |

A lockup built as live HTML text beside an SVG isn't a logo: it inherits the site font, so a font change silently changes the brand, and it can't be exported.

## Drawing it

- **Outline the type.** The wordmark ships as `<path>` data, never `<text font-family>`, which renders in whatever font the viewer has. Outlining redistributes the glyphs, so **check the licence first** — OFL and Apache-2.0 allow it, many commercial licences don't. Record the font, weights and source in a comment inside the SVG.
- **The colour is a literal** from the brand guide, baked into the SVG — never `currentColor` or a themeable token. If a project themes `--primary` per area, a logo using it would change colour with the page. A header that renders the mark inline needs its own non-overridable token; prefer pointing it at the exported asset.
- **Derive every number** — round shapes overshoot square ones (~6–11%), centring is optical, a secondary line sits at 0.5–0.6× the wordmark, the mark's height equals the measured text block, and radii are ratios of the tile ([references/geometry.md](references/geometry.md)).
- **Design for 16px first.** Test at 16, 20, 24 and 32, on light and dark, with a throwaway preview page; detail that dies below 24px doesn't exist. One idea, simple geometry.
- **One mark, one geometry** — identical in the lockup and the standalone icon.

## Plates

Every raster icon is **opaque**: the brand icon sits on a square plate of a brand colour, chosen so the mark reads on it. A transparent PNG can't adapt to the surface under it, and the surfaces that need a raster — a home screen, an email client, a search result — choose their own background. iOS shows transparent corners as black and the App Store rejects any alpha, and Google wants the logo it shows to look right on white. The SVG favicon takes the plate too, unless it recolours itself for the browser's theme ([references/rendering.md](references/rendering.md)).

## Icon slots and safe zones

**Only for a brand that ships an installable or native app.** Every slot takes a square file, but platforms crop to circles, squircles and rounded squares, so the artwork sits inside the inscribed circle with padding, never stretched to fill.

| Slot                 | Canvas                           | Guaranteed safe zone                                                | Rules                                                                                            |
| -------------------- | -------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **PWA maskable**     | square, 512px                    | a centred circle of radius **40%** of the edge (W3C)                | an opaque plate to the edges — the OS fills transparency itself                                  |
| **Android adaptive** | 108×108dp per layer              | the logo within the inner **66dp**; 18dp a side is bleed            | background (opaque), foreground, and a **monochrome** layer, or Android themes it itself         |
| **apple-touch-icon** | 180×180px                        | iOS applies its own rounded mask                                    | opaque plate to the edges, the mark inset about 11% (20px), **no alpha, no pre-rounded corners** |
| **Apple app icon**   | 1024px (watchOS 1088px), layered | the system's mask — rounded on iPhone, iPad and Mac, round on Watch | from iOS 26 and macOS 26, built in Icon Composer as Liquid Glass layers (below)                  |

- **Never `purpose: "any maskable"` on one manifest entry.** A maskable icon fits the mark inside the 40% circle — about a 21% inset a side for a square mark — and renders visibly small as an `any` icon, which takes a smaller inset of its own. Ship separate files for each purpose, plus `"monochrome"` if the brand has a single-colour version. From Android 16 QPR 2, Android themes an icon with no monochrome layer itself, so ship the layer to control the result. These are notes for the owner's manifest.
- **Native Apple apps** now compose their icon from up to four layers in Icon Composer, which renders six appearances — default, dark, clear light and dark, tinted light and dark. Export the mark as separate layers (background, midground, glyph); a flat image still works but gets a default effect.
- **Dead formats** — `browserconfig.xml`, `mstile-*.png`, Safari's `mask-icon` — aren't generated.

## The asset set

The modern set is a handful of files, every raster rendered **from the SVG**:

| File                             | Size       | For                                                                                                              |
| -------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `logo.svg`, `logo-dark.svg`      | vector     | the primary logo, per background                                                                                 |
| `icon.svg`                       | vector     | the brand icon — the source of every raster, and the browser tab's favicon                                       |
| `favicon.ico`                    | 16, 32, 48 | browsers and Google Search, which reads only raster favicons (ICO, PNG…)                                         |
| `icon.png`                       | 96 or 192  | a linked raster above 48px, which Google prefers — a multiple of 48                                              |
| `icon-512.png`                   | 512        | avatars, social profiles, the Organization `logo` in structured data (112px or more; a raster is safest — `seo`) |
| `apple-icon.png`                 | 180        | iOS home-screen bookmarks                                                                                        |
| PNG copies of each mark          | as used    | email, which drops SVG — Gmail strips it and Outlook never rendered it (`transactional-email`)                   |
| `icon-192.png`, maskable 192/512 | 192, 512   | **only** a web app with a manifest, or one that installs                                                         |
| `icon-mono.svg`                  | vector     | **only** Android themed icons, embroidery, single-colour print                                                   |

`sharp` renders each raster from the SVG onto its plate, and a few lines pack PNGs into `favicon.ico` ([references/rendering.md](references/rendering.md)). In a Next.js app, `icon` and `apple-icon` files in `app/` become the `<link>` tags by name; `favicon.ico` goes in `public/`, declared through `metadata.icons` with `sizes: "32x32"` — the file convention marks it `sizes="any"`, which lets Chrome pick it over the theme-aware SVG (`code-structure`'s `references/next-files.md`); everything a manifest or a URL references goes in `public/`.

## Using the logo

- **Clear space** on every side at least the height of the mark's smallest element; nothing intrudes into it.
- **A minimum size**, below which the brand icon replaces the full logo.
- **Never distort, recolour, stretch, crop, outline or add effects** to it; use the variant made for the background it sits on.
- **Import it from the shared assets**, never a copy pasted into a feature; its location is the project's (`AGENTS.md`).

## Accessibility

- A standalone logo is informative: `role="img"` on the SVG root with a `<title>` (or `aria-label`) naming the brand, since outlined type is invisible to assistive technology. Ids are unique per page (`useId()` when inlined in React).
- A logo inside a link takes its name from the link, describing the destination (`aria-label="<Brand> — home"`), and the SVG is `aria-hidden="true"`.
- Decorative repetitions are `aria-hidden="true"`.
- WCAG 1.4.3 exempts "text that is part of a logo or brand name" from contrast minimums and 1.4.11 carries the exemption over to a logo that is the home link — but not to brand colours used for text, buttons or headings. Where the guidelines allow, a higher-contrast variant on low-contrast surfaces is encouraged, not required (`accessibility`).

## Checklist

- [ ] The type was settled first, and the asset list follows from it.
- [ ] Brand colour, default background and variants came from the owner.
- [ ] Type is outlined, the licence allows it, and the recipe is in a comment in the SVG.
- [ ] Round shapes overshoot, proportions are ratios, and the mark reads at 16px on light and dark.
- [ ] Lockup and icon share one mark geometry.
- [ ] Every raster is opaque on a plate and rendered from the SVG, `favicon.ico` included.
- [ ] Only the slots the owner confirmed exist; maskable icons are separate entries, padded inside the 40% circle; `apple-icon.png` is opaque and unrounded.
- [ ] PNG copies exist for email.
- [ ] A one-off run left only the assets in `media/`; a generator is one command, with its outputs committed.
- [ ] Logos have an accessible name; linked logos are named by the link.

## Related skills

Clear space, colour tokens and visual identity `design-system` · the Organization logo in structured data `seo` · metadata file names `code-structure` · email images `transactional-email` · contrast and names `accessibility` · file and asset names `naming` · other hand-drawn SVGs and diagrams `tw:images-and-diagrams`.
