# The layer files — what belongs in each

Skeletons for the split `SKILL.md` mandates, in the order `globals.css` imports them. Each shows the shape and the one rule that file exists to enforce; fill with the project's own values.

**Layers decide who wins, not file order.** CSS outside any `@layer` beats every layer, utilities included — so every authored rule sits in `@layer base`, `@layer components` or an `@utility`, and a utility on an element can still override it. Order only matters between plain rules in the same layer, where the later one wins; that's why the import order below puts animations before components. A `var()` resolves when styles are computed, so where a role is declared doesn't matter, and an `@apply` of a class that doesn't exist fails the build rather than dropping silently.

## 1. `tokens.css` — ramps and roles

The palette and scales go into `@theme` (layer 1); the roles point at them, per mode (layer 2). This file is the only one a rebrand or a dark-mode fix touches.

```css
/* Layer 1 — ramps. Clear the default palette so only the brand's colours exist. */
@theme {
  --color-*: initial;
  --color-white: #fff;
  --color-neutral-50: oklch(0.985 0 0);
  --color-neutral-900: oklch(0.205 0 0);
  --color-brand-500: oklch(0.58 0.18 265);
  --color-brand-600: oklch(0.51 0.18 265);
  /* …each ramp's full set of steps */
  --radius-md: 0.5rem;
}

/* Layer 2 — roles, named by job, pointing at ramp steps. */
:root {
  color-scheme: light;
  --surface: var(--color-white); /* the page */
  --card: var(--color-neutral-50); /* a raised surface */
  --muted: var(--color-neutral-100); /* a quiet fill */
  --foreground: var(--color-neutral-800); /* body text */
  --heading: var(--color-neutral-900);
  --muted-foreground: var(--color-neutral-600); /* still 4.5:1 on --surface */
  --border: var(--color-neutral-200);
  --primary: var(--color-brand-600);
  --on-primary: var(--color-white);
}

/* Same names, different steps — nothing downstream knows the mode changed. */
[data-mode="dark"] {
  color-scheme: dark;
  --surface: var(--color-neutral-950);
  --card: var(--color-neutral-900);
  --muted: var(--color-neutral-800);
  --foreground: var(--color-neutral-200);
  --heading: var(--color-neutral-50);
  --muted-foreground: var(--color-neutral-400);
  --border: var(--color-neutral-800);
  --primary: var(--color-brand-500);
}

/* No choice saved: follow the OS. CSS can't share one body between a selector and a
   media query, so this repeats the block above; edit both together. */
@media (prefers-color-scheme: dark) {
  :root:not([data-mode="light"]) {
    color-scheme: dark;
    /* …the same declarations as [data-mode="dark"] */
  }
}
```

**Name roles by job, not by value.** `--primary`, not `--blue-600`: the second name is a lie the moment the brand changes.

## 2. `theme.css` — expose the roles as utilities

Layer 3: `@theme inline`, every entry a `var()` from the roles, never a literal.

```css
/*
 * `inline` writes the variable reference into each utility, so a role overridden on
 * [data-mode] or inside one section flows through `bg-surface` without a rebuild.
 */
@theme inline {
  --color-surface: var(--surface);
  --color-card: var(--card);
  --color-muted: var(--muted);
  --color-foreground: var(--foreground);
  --color-heading: var(--heading);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-primary: var(--primary);
  --color-on-primary: var(--on-primary);

  /* Fonts: point at the variables the font loader generated. */
  --font-sans: var(--font-body);
  --font-heading: var(--font-display);
}
```

The dark variant is declared once, in the entry: `@custom-variant dark (&:where([data-mode="dark"], [data-mode="dark"] *));`.

## 3. `base.css` — element defaults

`@layer base` only. Bare-element rules, no classes.

```css
@layer base {
  body {
    background: var(--surface);
    color: var(--foreground);
    font-family: var(--font-sans, system-ui, sans-serif);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  h1,
  h2,
  h3 {
    line-height: 1.2;
    text-wrap: balance; /* no orphaned last word in a heading */
  }

  /* Anchor jumps and keyboard focus both clear a sticky header (WCAG 2.4.11). */
  html {
    scroll-padding-top: var(--header-height, 5rem);
  }

  /* Honour the OS setting rather than overriding it. */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

## 4. `utilities.css` — custom utilities

`@utility`, so the result composes with variants (`sm:`, `hover:`, `dark:`) exactly like a built-in. A plain class does not.

```css
/* Scrollable, but no visible scrollbar. */
@utility no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

/* A functional utility: the number comes from the class — gap-rhythm-2 */
@utility gap-rhythm-* {
  gap: calc(var(--spacing) * --value(integer) * 1.5);
}
```

Motion tokens can also live here in their own `@theme` block, so easings are named rather than pasted:

```css
@theme {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
}
```

## 5. `animations.css` — keyframes and the classes that use them

In `@layer components`, imported before `components.css`, so a component class declared later can override an animation class and a utility can override both. (`@keyframes` itself is order-independent — it resolves by name.)

```css
@keyframes hero-gradient-shift {
  to {
    background-position: 200% 50%;
  }
}

@layer components {
  .hero-gradient-text {
    background-image: linear-gradient(90deg, var(--primary), oklch(0.75 0.18 330), var(--primary));
    background-size: 200% auto;
    background-clip: text;
    color: transparent;
    animation: hero-gradient-shift 8s linear infinite;
  }

  /* Any decorative animation stops when the OS asks it to. */
  @media (prefers-reduced-motion: reduce) {
    .hero-gradient-text {
      animation: none;
    }
  }
}
```

## 6. `components.css` — authored class patterns

`@layer components`, for a repeated **arrangement** that isn't a component. If it has state, props, or variants, it is a component in `ui/` instead — this file is for layout rhythm a class can express.

```css
/* Section rhythm — the vertical spacing every marketing section shares. */
@layer components {
  .section {
    @apply mx-auto mt-20 flex max-w-6xl flex-col gap-8 sm:mt-24;
  }

  /* Small uppercase label above a section heading. */
  .section-eyebrow {
    @apply text-muted-foreground text-xs font-semibold tracking-wide uppercase;
  }
}
```

**The test before adding one:** would this be better as a component with props? Usually yes. A class earns its place when it is pure arrangement reused across unrelated components — and when the alternative is repeating eight utilities in twelve files.

## Splitting a layer file when it grows

A layer file is a **concern, not a fixed count**. When one gets long enough to be hard to scan, split it by sub-concern — and the split files keep the parent's `@layer`, so nothing about precedence changes. They are imported in the parent's position in the entry.

```css
/* globals.css — base and components each split in two */
@import "./tokens.css";
@import "./theme.css";
@import "./base.css"; /* 3a. element defaults */
@import "./typography.css"; /* 3b. also @layer base — prose elements */
@import "./utilities.css";
@import "./animations.css";
@import "./components.css"; /* 6a. shared patterns */
@import "./sections.css"; /* 6b. also @layer components — section families */
@import "./heroes.css"; /* 6c. also @layer components — hero families */
```

**When to split:** one file, one family of related classes, and the parent was getting long. A `heroes.css` holding `.page-hero`, `.page-hero-title`, `.image-hero`, `.image-hero-overlay` is easier to maintain than the same twelve classes buried in a 300-line `components.css`. **When not to:** three classes do not earn a file.

## `typography.css` — prose defaults (`@layer base` and `@layer components`)

The one split worth doing by default, and only when the app renders **authored content it does not control the markup of**: a blog, a docs page, an MDX file, or a rich-text editor's output. That HTML arrives as bare `<h2>`, `<p>`, `<ul>`, `<blockquote>`, `<code>` with no classes to hang utilities on, so the elements themselves have to carry the styling.

```css
/* typography.css — @layer base, so a utility on a specific element still wins */
@layer base {
  h1,
  h2,
  h3,
  h4 {
    color: var(--foreground);
    line-height: 1.2;
    text-wrap: balance;
  }

  p {
    line-height: 1.6;
  }
}

/* Scoped to rendered content, so app UI is unaffected. In @layer components, so a
   utility on one element still wins. Tailwind's typography plugin is the alternative —
   never both, since the plugin owns the same .prose class. */
@layer components {
  .prose {
    max-width: 68ch; /* measure: ~66-75 characters is the readable band */

    :where(h2, h3) {
      margin-block-start: 2em;
      margin-block-end: 0.6em;
    }

    :where(p, ul, ol, blockquote) {
      margin-block-end: 1.25em;
    }

    :where(a) {
      color: var(--primary);
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }

    :where(blockquote) {
      border-inline-start: 3px solid var(--border);
      padding-inline-start: 1em;
      color: var(--muted-foreground);
    }

    :where(code):not(pre code) {
      background: var(--muted);
      border-radius: 0.25rem;
      padding: 0.15em 0.35em;
      font-size: 0.9em;
    }

    :where(pre) {
      overflow-x: auto; /* long lines scroll, never widen the page */
      background: var(--card);
      border-radius: var(--radius-md);
      padding: 1em;
    }

    :where(img) {
      border-radius: var(--radius-md);
    }
  }
}
```

Three things that matter more than the values:

- **Layer it and use `:where()` for every descendant.** Inside `@layer components` and at zero specificity, a utility on one heading still wins. Unlayered, `.prose :where(h2)` would beat every utility, whatever its specificity.
- **Set a measure.** `max-width: 68ch` is the single biggest readability win in a blog, and utilities on wrapper divs routinely forget it.
- **Scope it.** Class-scoped (`.prose`), not global, so a marketing page's own `<h2>` is untouched.

An editor's output needs the same treatment plus whatever its serializer emits — check the real HTML rather than assuming, since editors differ on lists, embeds, and code blocks.

## Which file does this go in?

| You are adding                      | File             | Why                                                    |
| ----------------------------------- | ---------------- | ------------------------------------------------------ |
| A palette step, radius or spacing   | `tokens.css`     | Layer 1, the one place a rebrand touches               |
| A role, or its dark value           | `tokens.css`     | Layer 2, beside its ramp                               |
| A utility for an existing role      | `theme.css`      | Layer 3, the only `@theme inline`                      |
| A bare-element default              | `base.css`       | No classes belong here                                 |
| Something that needs `sm:`/`hover:` | `utilities.css`  | `@utility` composes with variants; a class doesn't     |
| A repeated multi-utility layout     | `components.css` | Only if it isn't better as a component                 |
| A keyframe                          | `animations.css` | Before `components.css`, which may override it         |
| Styling for blog/MDX/editor output  | `typography.css` | `.prose` in `@layer components`; markup has no classes |
| A class family in a long file       | a split of it    | Keeps the parent's `@layer`; imported in its place     |

**Skeleton, not a rule:** a file with nothing in it yet still gets created with a one-line comment saying what it is for, so the first addition has an obvious home instead of landing in `globals.css`.
