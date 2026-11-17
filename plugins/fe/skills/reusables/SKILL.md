---
name: reusables
description: >-
  Designing one reusable React component, hook or helper — agnostic and pure where shared, owning its own animation, focus and lifecycle, the native element's props passed through with `ref`, controlled or uncontrolled inputs, variant, size and radius from the design scales, copy through a `labels` prop, `data-state` and `data-slot` hooks, compound parts as named exports, empty regions rendering nothing, a skeleton on the same shell, and promotion on the second consumer. Use when building or refactoring a shared component, hook or helper.
---

# Reusables

A reusable component, hook or helper drops in anywhere and is controlled entirely from outside. It never depends on a particular parent, data source, route or hidden global, never hard-codes a value a caller might reasonably change, and owns the behaviour its callers shouldn't have to wire up. Where it lives and which tier it belongs to are `design-system`'s and `code-structure`'s; React practice inside it is `react`'s.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Before building

- **Search first** — the shared UI package, the house helper packages, other features and apps. The card or dialog you need is often already built, sometimes trapped in one feature.
- **Promote on the second consumer**, not before: the first copy lives beside its feature; when a second feature in the same app needs it, it moves to the app's own `src/ui/`; when a second app needs it, to the shared package (`design-system`). Each move strips local data and hooks and turns what differs into props. Never paste a second variant.

## Components

- **Self-contained and agnostic.** Everything it needs arrives as props; it works the same wherever it's dropped.
- **It owns its behaviour.** Animation in and out, open and close, focus moving in and back, outside-click and Escape — the caller flips `open` and listens to `onOpenChange`, nothing more. Overlays build on the native `<dialog>` (`showModal()`) and the `popover` attribute, which put them in the top layer — no portal, no z-index fight — and handle Escape and, for a modal, the inert page (`semantic-html`, `accessibility`). A dialog stays mounted through its exit transition (`@starting-style` and `transition-behavior: allow-discrete` animate the native one). Behaviour two components share becomes a hook (`useMountTransition`, `useDismiss`).
- **The native element's props pass through.** Props extend the element's own (`ComponentPropsWithRef<"button">`) and spread onto it, so every attribute, handler, `aria-*` and `ref` reaches the element; `className` is merged last with `cn()`, so the caller's classes win (`tailwind`). A component that also needs the element itself (to move focus) merges its own ref with the caller's in a ref callback.
- **A button that is a link** takes `asChild` (or a `render` prop): the component's styling and behaviour land on the child the caller passes — a `<Link>` — instead of rendering a second element. Never a button wrapping a link.
- **Variants, sizes and radii come from the design scales** — `variant`, `size`, `radius`, `tone`, using the scale's words — as plain class maps applied with `cn()`. A difference the system already names is a prop value, never a second component (`design-system`).
- **Inputs work controlled or uncontrolled.** `value` with `onChange` when the caller owns the state; `defaultValue` with a `name` when a form Action reads it from `FormData`, which React resets after the action succeeds (`react`). One hook manages both, so neither path is second-class.
- **No copy of its own.** Every visible string and accessible name comes in through props — a typed `labels` object where there are several (`labels={{ close, next, previous }}`) — so the component works in any product and language. The app defines its common labels once and passes them.
- **No magic values.** Durations, option lists, ids (`useId`), limits and links come from props or the project's constants, never literals inside the component.
- **Styling hooks:** state and parts are exposed as `data-state="open"`, `data-disabled`, `data-slot="header"`, so a caller can style them without a new prop.
- **A region given nothing renders nothing.** An optional header, footer or actions slot with no content leaves no empty wrapper behind — no stray padding, border or landmark.
- **Its skeleton uses the same shell.** `<CardSkeleton>` renders the card's own frame at the same size with placeholders inside, so loading never shifts the layout (`design-system`).
- **Accessible as shipped** — the right element, roles and states, keyboard paths and focus handling are part of done, not a caller's job (`semantic-html`, `accessibility`).

## Composition

- **Compound parts are separate named exports** (`Accordion`, `AccordionItem`, `AccordionTrigger`), never static properties (`Accordion.Item`): a Server Component can't reach a property of a client module, and statics defeat tree-shaking through barrels. A part reads its parent through a context whose value is a small interface — state, actions, and meta such as ids.
- **`children` over render props**, unless the caller genuinely needs values from inside.
- **A list component is generic over its item** (`<Select<TItem>>` with `getLabel` and `getValue`), so it takes the caller's records without a cast.
- **A structured block ships both**: a data-driven wrapper for the common case (`<Accordion items={…} />`) and the parts for everything else.
- **One `data-*` handler** for a list of items, not a closure per item (`react`).

## Shared means pure

A component in a shared package, used by more than one app:

- **Takes display values and callbacks** — formatted strings, booleans, `onX` handlers — never whole domain records or raw enums it would have to interpret.
- **Fetches nothing**, calls no Server Action, reads no router, cookie or header, and imports no app code. It may import the shared contracts package's types and constants.
- **Shares its class maps**: a palette two components use (a status colour on a badge and a tag) lives in one record both import.
- **Ships its story** in the same change (`storybook`).

Components inside one app may use that app's hooks and data; only the shared layer must be pure.

## Files

- **`"use client"` is the first line** of a component that needs it, before a short JSDoc `@description` that tells it apart from its siblings ("Badge is static; Tag can be removed").
- **A component with versions** (one for the marketing site, one for the app) keeps the shared shape in `<name>-types.ts`, `<name>-defaults.ts` and `<name>-shared.tsx`, with one file per version, so they can't drift.
- **Props are documented by their types and the story**; a prop comment says what the type can't.

## Hooks and helpers

- **A hook does one thing**, takes its inputs as parameters, keeps no module-level state shared between callers, and renders on the server: a browser value it reads (the viewport, online status, a media query) comes from `useSyncExternalStore` with a server snapshot, never an effect that sets state (`react`). It returns a named object once it has more than two values; a pair matching React's own (`[value, setValue]`) is fine.
- **An async hook exposes its state** — `pending`, `error`, and `reset` where there's a result to clear.
- **A helper is pure**: inputs in, value out, no hidden globals, no side effects unless that is the function. It lives in its `lib/utils` file and is reused, never rewritten inline.
- **Names follow `naming`**: `use*` hooks, `on*` callback props, booleans that read as assertions.

## Before you finish

- Would it work unchanged in another feature or app? If not, something it depends on should be a prop.
- Is any value hard-coded that a caller might want different — a string, a duration, a size?
- Does the caller manage animation, focus or lifecycle that the component could own?
- Does a native attribute, `ref` or `className` fail to reach the element?
- Is this behaviour already written somewhere else?

## Related skills

Tiers, tokens and drift `design-system` · where files live `code-structure` · `cn()` and tokens `tailwind` · React practice `react` · markup `semantic-html` · keyboard, focus and names `accessibility` · stories `storybook` · names `naming` · types `typescript` · the audits `frontend-audit`, `storybook-audit`.
