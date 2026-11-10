---
name: design-system
description: >-
  Design-system governance — keeping a product visually one system, deciding whether something earns a token, primitive or variant versus staying a one-off, spotting and consolidating drift, and the layered tokens, primitives, blocks, patterns and layouts model. Use on "design system governance", "one-off", "drift", "should this be a token or a variant", "components do not match", "inconsistent UI".
---

# Design system

The governance layer that keeps a product **visually one system**: every screen is built from a shared, layered set of decisions, and nothing is one-off. This skill owns _cohesion and the system's shape_ — the specialist skills own the mechanics of each layer.

> **This owns consistency; specialists own mechanics.** Token/CSS mechanics → `tailwind`. Building a single reusable well → `reusables`. Where components live (the tiers) → `code-structure`. Documenting them → `storybook-setup` / `storybook-story-writing`. Making the system's _look_ distinctive and high-craft → `frontend-design`. Names → `naming`.
>
> **Project facts → `AGENTS.md`:** the actual token values/scales, the component inventory, and the brand. This skill is the discipline; those are the materials.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The layered model

A design system is layers, each built **only from the layer(s) below** — never reach around one:

1. **Foundations / tokens** — color ramps, type scale, spacing scale, radius, shadow/elevation, motion. The shared vocabulary (→ `tailwind`).
2. **Primitives (base)** — buttons, inputs, badges, etc., built _only_ from tokens (→ `reusables`).
3. **Composed (blocks)** — DataTable, Modal, Card compositions of primitives.
4. **Patterns** — whole page regions: Navbar, Sidebar, Footer.
5. **Layouts** — page shells that arrange patterns + content.

(This maps to the 4-tier `components/ui/` in `code-structure`.) A primitive uses tokens, not raw values; a block composes primitives, not ad-hoc markup; a page composes patterns/layouts.

## Governance — the point

- **Single source of truth.** Every color / size / spacing / radius / shadow / font / motion value comes from a **token**; every UI element from a **shared primitive**. No literal hex/px/rem or ad-hoc styles in feature code.
- **Extend the system, don't bypass it.** Need something new? Add a token, a primitive, or a documented **variant** to the shared layer so it's reusable — never inline a one-off or fork a component to "just this once".
- **One of each.** One type system, one icon set, one spacing rhythm, one elevation scale, one motion vocabulary — across every page. A second font or icon set is drift.
- **Compose, don't recreate.** A new screen assembles existing primitives/patterns. If a needed primitive is missing, add it to the system first, then consume it.
- **Variants over forks.** Express differences through documented props/variants (→ `reusables`), not copies.
- **Shared shell.** Nav/header/footer/layout come from patterns + layouts, so every page is framed identically.

## Cohesion across the product

Every screen should read as the same product — same type scale, spacing rhythm, color roles, radius/shadow, and motion throughout. The system should also be **distinctive**, not a generic default (→ `frontend-design`): commit to one point of view and apply it consistently everywhere.

## Adding to the system

When a real, recurring need appears: **name it** (→ `naming`) → add the token / primitive / variant in the shared layer → **document it** (→ `storybook-story-writing`) → then consume it. Prefer **semantic tokens** over raw values (→ `tailwind`). One-offs are only acceptable for genuinely single-use, non-reusable cases — and even then, from tokens.

**Retiring from the system** — deprecate, never yank: mark the old token/primitive/variant deprecated (JSDoc `@deprecated` + Storybook note), point at the replacement, migrate consumers, then remove it in a later change once usage is zero. In a shared `packages/ui`, a removal or rename is a breaking change — coordinate it with every consuming app in one PR (or version the package).

## Watch for drift

Signs the system is fragmenting: literal values in feature code, two components that do the same thing, off-scale spacing/type, inconsistent radius/shadow, more than one font or icon set, pages that don't match. Consolidate drift back into the system. Audit for it via `frontend-audit` + `conventions-audit` (drift and literals) and `accessibility-audit` (the a11y contract) — see the audits bundles.

## Do / Don't

- **Do** build every screen from the system; extend the system for new needs; keep one type/icon/spacing/elevation/motion set; use semantic tokens; prefer variants over forks; compose existing primitives; keep the shell shared.
- **Don't** inline one-off values or ad-hoc styles in feature code; fork or duplicate a component instead of adding a variant; introduce a second font/icon set/spacing rhythm; reach around a layer; let each page look like a different product.
