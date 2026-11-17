---
name: react
description: >-
  React 19 components, hooks and state — the Rules of React, hydration safety, deriving instead of syncing, effects only for external systems, `useEffectEvent`, the React Compiler instead of hand memoisation, forms with Actions, `useActionState`, `useFormStatus` and `useOptimistic`, `use`, ref as a prop, `<ViewTransition>`, drawer, dialog and tab state in the URL, one `data-*` handler for a list, `<Activity>`, error boundaries, and keys. Use when writing or reviewing React components, hooks or client state.
---

# React

Idiomatic React 19 (19.3 is current), with the React Compiler on. Components and hooks are pure functions of their props, state and context; state lives in one place; effects reach outside React and nothing else. Designing a component or hook for reuse is `reusables`'; the server and client boundary, data fetching and caching are `nextjs`'.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The Rules of React

- **Components and hooks are pure.** Same inputs, same output; no side effects during render; props, state and values passed to hooks are never mutated — copy, then change.
- **React calls components and hooks**: render `<Profile />`, never call `Profile()`; never pass a hook around as a value.
- **Hooks are called at the top level**, unconditionally, from components or other hooks (`use*`, named by `naming`).
- **`eslint-plugin-react-hooks` is on with its `recommended` preset**, which includes the compiler's rules (purity, refs, `set-state-in-effect`, immutability). A violation makes the compiler skip that component, so the lint is how you know.
- **Render the same on the server and the client.** No `typeof window` branches or `Date.now()` in render; a value only the browser knows comes from `useSyncExternalStore` with a `getServerSnapshot`, and `suppressHydrationWarning` is only for a known, harmless difference (a timestamp, the theme script's attribute).
- **StrictMode stays on.** Its double render and double effect setup in development expose impurity and missing cleanup; fix the code, never remove StrictMode.

## State — derive, don't sync

- **Compute during render** whatever can be derived from props or state. A value copied into state and kept in step with an effect is a bug waiting to drift.
- **One source of truth.** Lift shared state to the closest common parent; put it in the URL where the URL is the real source (below); never duplicate it.
- **Reset with a `key`**, not an effect, when a component should start fresh for a new id.
- **`useState`** for a value, **`useReducer`** for related transitions, **`useRef`** for a value that doesn't render, **`useId`** for ids, **`useSyncExternalStore`** to read an external store.
- **Colocate state** where it's used; context is for values many distant components read, split so a fast-changing value doesn't re-render the readers of a slow one.

## Effects — only for external systems

- **`useEffect` synchronises with something outside React** — a subscription, a browser API, a non-React widget, a timer — and always cleans up. Not for: transforming data for render (compute it), responding to a click (do it in the handler), fetching (`nextjs`).
- **`useEffectEvent`** for logic inside an effect that reads the latest props or state without re-running the effect (a notification that uses the current theme). It's called only from effects.
- **No `setState` straight in an effect body**, which renders twice for nothing; derive the value instead.
- **`useLayoutEffect` only to measure before paint** (position a popover, keep a scroll); it blocks paint.
- **Passive listeners** (`{ passive: true }`) for scroll and touch handlers that never call `preventDefault`.

## The compiler, not hand memoisation

- **The React Compiler memoises components and values for you** (enabled per `nextjs`, or `babel-plugin-react-compiler` elsewhere). New code has no `useMemo`, `useCallback` or `memo` by reflex.
- **They stay as escape hatches**: a value an effect depends on, or an identity a third-party library compares — with a comment saying which. Existing manual memoisation is left alone until a profile says otherwise.
- **The `incompatible-library` lint** marks a library the compiler can't memoise around (some form and table libraries); the component using it is skipped. `"use no memo"` opts one component out while a compiler problem is fixed — temporary, with a comment.
- **Performance work follows a profile**, not a hunch.

## Forms and Actions

- **A form's `action` takes a function** — a Server Action or a client function — and React calls it with the form's `FormData`. Fields are read by `name`, uncontrolled, and React resets them when the action completes — on an error result too, since actions answer rather than throw.
- **`useActionState`** calls the action with `(previousState, formData)` and gives its last result and its pending state. The result carries `fieldErrors` and `values` — the submitted fields — which go back into each input as its `defaultValue`, so a failed submit doesn't empty the form (the shape is `nextjs`'s). `requestFormReset` resets a form on purpose outside a submit.
- **`useFormStatus`** reads the pending state from a child of the form — a submit button that disables itself.
- **`useOptimistic`** shows the expected result while the action runs, and falls back when it fails.
- **`useTransition`** for any other non-urgent update; **`useDeferredValue`** when an expensive render (a filtered list) should lag behind fast input.

## React 19 features

- **`use(promise)`** reads a promise passed down from the server, inside `<Suspense>`; **`use(context)`** reads context, conditionally if needed.
- **`ref` is a prop.** No `forwardRef` in new code. A ref callback may return a cleanup, called when the element leaves.
- **`<Activity mode="hidden">`** keeps a tab or a panel's state while it's out of view, and pre-renders the one likely next, instead of unmounting and remounting it. Hiding destroys its Effects, so every effect inside cleans up.
- **`<Context value>`** is the provider; `.Provider` is legacy. In 19.3 a `<Context>` also renders in Server Components.
- **`<ViewTransition>`** (stable in 19.3) animates an element entering, leaving or moving with the browser's View Transitions; `addTransitionType` names the kind of change, so a forward and a back navigation can animate differently. Motion follows `prefers-reduced-motion` (`accessibility`).
- **A ref on a `<Fragment>`** (19.3) reaches its children as a group — to focus the first one or observe them — without a wrapper element.
- **Document metadata** may render inside components in plain React; in Next.js it goes through the Metadata API (`nextjs`).

## URL state — drawers, dialogs and tabs

State someone would want to share, refresh or go Back to lives in the search params:

- **A drawer or dialog** opens under a search param (`?panel=edit`, `?item=<id>`). Opening **pushes** a history entry, so Back closes it; closing a panel the reader arrived on through a shared link **replaces**, so Back still leaves the page.
- **An in-page tab replaces** the entry rather than pushing, so Back doesn't step through tabs; tabs that are really separate pages are links to routes.
- **State only the client needs** (a sort, a tab) can update with `window.history.pushState` or `replaceState`, which Next.js syncs with `useSearchParams`, so nothing goes back to the server.
- **List filters, sort and page** live there too, parsed by one function on the server and the client. A component reading search params sits in its own `<Suspense>` (`nextjs`).

## Events

- **One handler for a list, reading `data-*`**: each item carries `data-item-id`, and one handler reads `event.currentTarget.dataset.itemId` — not a new closure per item, and not a curried `onSelect(id)`.
- **`event.currentTarget`**, the element the handler is on, not `event.target`, which may be a child.

## Errors

- **Every `<Suspense>` boundary has an error boundary around or above it.** A rejected promise read by `use()` throws to the nearest one; with none, React removes the whole app's UI. In Next.js that's `error.tsx` for a segment and `catchError` for a smaller part, which lets `redirect()` and `notFound()` through — a generic boundary such as `react-error-boundary` would swallow them (`nextjs`). Outside Next, `react-error-boundary` or a small class component — the one place a class remains.
- **Errors are reported in one place:** outside Next, the root's `onCaughtError` and `onUncaughtError`; in Next.js, which owns the root, `instrumentation-client.ts` and the `error.tsx` boundaries (`nextjs`).

## Lists and components

- **A stable `key`** from the data — a real id, never the index when items can be added, removed or reordered.
- **Composition over configuration**: `children` and slot props, not a large options object. Small components, each one job; logic in hooks or `lib`, markup in `.tsx` (`code-structure`).
- **Long lists** render in pages or windows; `content-visibility: auto` lets the browser skip off-screen rows.

## Do / Don't

- **Do** keep render pure; derive state; reset with `key`; clean up every effect; let the compiler memoise; use Actions with uncontrolled fields; keep panels and tabs in the URL; use one `data-*` handler per list; pair Suspense with an error boundary; key lists by id.
- **Don't** sync derived state with an effect; fetch in an effect; call `setState` in an effect body; hand-memoise by reflex; use `forwardRef` or class components (outside an error boundary); call a component as a function; mutate props or state; key a dynamic list by index; keep shareable UI state only in memory.

## Related skills

Designing a reusable component or hook `reusables` · server and client boundary, data, caching, Server Actions and the compiler setting `nextjs` · form schemas and field errors `schemas-and-contracts` · markup `semantic-html` · keyboard and focus `accessibility` · types `typescript` · names `naming` · component tests `testing` · the audit `frontend-audit`.
