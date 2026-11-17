---
name: design-system
description: >-
  Governance of a product's shared UI — the tiers (foundations, assets, icons, base, components, blocks, layouts, pages), a base library installed as source with local edits tracked, consumer count deciding placement, one component configured by props over variant families, fixed size, radius and tone vocabularies, skeletons, status colours apart from accents, visual identity as tokens and assets, and adding, retiring and spotting drift. Use when adding or placing a component, token or variant, or when screens stop matching.
---

# Design system

A product reads as one system when every screen is built from the same decisions — the same tokens, the same components, the same vocabulary — and nothing is a one-off. This skill owns that cohesion: the tiers components live in, what earns a place in the shared layer, and how the system grows and sheds without drifting. The mechanics of each layer belong to the skills linked below.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The tiers

Each tier composes from the tiers below it — any of them, directly (a block may use a base `Button`) — and never from a tier above.

| Tier           | Holds                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------- |
| `foundations/` | The tokens, shown as stories — colour, type, spacing, elevation, motion (`tailwind`)        |
| `assets/`      | Brand marks and illustrations as components                                                 |
| `icons/`       | The icon set, and any hand-drawn brand glyphs                                               |
| `base/`        | Atoms that render one thing — `Button`, `Badge`, `Input`, `Link`, `Skeleton`                |
| `components/`  | Compositions of base that own their state — `Card`, `Dialog`, `DataTable`, `FieldGroup`     |
| `blocks/`      | Compositions of components, and page regions — `Navbar`, `Sidebar`, a metric card           |
| `layouts/`     | The page shells apps render — a dashboard shell, an auth shell                              |
| `pages/`       | Whole pages several apps render as they are (a maintenance page) — in a shared package only |

- **Pick the tier by what it composes:** built from base atoms → `components/`; built from components → `blocks/`; a page shell → `layouts/`. There's no `patterns` or `composite` tier.
- **An app keeps the same tiers** in its own `src/ui/` for what only it uses (`code-structure`) — except `pages/`, which an app's routes already are.
- **Consumer count decides placement:** two or more apps → the shared package; one → that app. Promote on the second consumer, never before — and the tier stays the same when it moves.

## The base library

- **A base library installed as source** — through its registry CLI, never copied from its docs — supplies the base and components tiers. The installed files are the project's to fix: a wrong one is corrected in place, and every local edit is listed (in the file's header or the package's docs) so it's re-applied after a reinstall with `--overwrite`.
- **Search before building.** A "new" component is often the library's in disguise — a `Select` restyled as a dropdown, a `Card` with a slot. Check the shared package and the library first; build only what neither has.
- **Project-only needs live in project files** beside the installed ones, never as a fork of them.

## How components vary

- **One component, configured by props** — `tone`, `size`, `radius`, `variant` — never a family of near-copies (`PrimaryButton`, `DangerButton`). A difference in look is a value of a prop; a difference in behaviour may be a new component.
- **Fixed vocabularies, shared by every component:** `size` from one ladder (`xs`–`3xl`), `radius` from one scale, `tone` from one set of roles. The same word means the same thing on a button, a badge and a card; the words map to classes in one scales file (`tailwind`), and a component that accepts fewer narrows its prop's type.
- **No built-in copy or destinations** in a shared component: labels, messages and links come in as props, so the component fits any product and any language (`reusables`).
- **Anything that waits on data has a `<Component>Skeleton`** with the real one's dimensions, so loading never shifts the layout.

## Colour that means something

- **Status colours are their own roles** — success, warning, danger, info — each with a text and a surface value that pass contrast in both modes (`accessibility`).
- **Accent colours are never statuses.** A decorative accent that happens to be green never says "done"; a reader learns the system's meanings from consistency.
- **Colour is never the only signal:** a status also carries an icon or text.

## Visual identity

The brand's look — palette, type, logo, imagery and motion personality — is defined once, as tokens (`tailwind`) and assets, and every screen takes it from there:

- **One of each:** one type system, one icon set, one spacing rhythm, one elevation scale, one motion vocabulary. A second font or icon set is drift.
- **The logo** comes from the assets tier in the variant made for its background, with its clear space; never stretched, recoloured or redrawn (`logos-and-icons`).
- **Imagery** follows the project's recorded style — what photos show, illustration style, treatment — so marketing and product read as one brand.
- **Distinctive, not default:** the system commits to a point of view (`frontend-design`).

Voice and UI copy are `copywriting`'s, from the project's brand voice and word list.

## What earns a place

| The need                                                     | Becomes                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| A value that expresses a decision (a role, a step, a timing) | A token                                                 |
| A recurring element with structure or behaviour              | A component, in the tier its composition puts it        |
| A difference in look within one component                    | A value on an existing vocabulary, or a new prop        |
| A genuine single use                                         | A one-off, built from tokens, with a comment saying why |

Recurrence is the test: the second use promotes a one-off, never the first guess that something might be reused.

## Adding and retiring

- **Adding:** name it (`naming`) → add it to the shared layer → its story in the same change, with a keyboard story and a passing axe check for anything interactive (`storybook`, `accessibility`) → consume it. A change to the shared layer is reviewed by whoever owns the system and recorded in its changelog, so consumers see what changed.
- **Retiring:** deprecate, migrate, then remove — mark it `@deprecated` with its replacement, move every consumer, and delete it once nothing uses it. Removing or renaming a shared component is a breaking change, made with every consuming app in one change.

## Drift

The signs: literal values in feature code, two components doing one job, off-scale spacing or type, mismatched radius or shadow, a second font or icon set, a status colour used as decoration, pages that don't match. Consolidate drift back into the system rather than adding to it. Catch it automatically where possible — a lint rule against arbitrary values and palette classes, and visual tests on the stories — and the audits look for the rest (`frontend-audit`, `conventions-audit`, `accessibility-audit`).

## Do / Don't

- **Do** pick the tier by composition; place by consumer count; install the base library and track local edits; search before building; configure one component by props; share size, radius and tone vocabularies; ship a skeleton with anything that loads; keep status colours apart from accents; deprecate before removing.
- **Don't** add a `patterns` tier; promote a component before its second consumer; copy a library component from its docs; fork an installed file for a project-only need; build variant families; put copy or links inside a shared component; let colour alone carry a status; introduce a second font, icon set or spacing rhythm.

## Related skills

Tokens and CSS `tailwind` · building one component `reusables` · visual quality `frontend-design` · where `src/ui/` sits in an app `code-structure` · stories `storybook` · contrast and status signals `accessibility` · logo files `logos-and-icons` · names `naming`.
