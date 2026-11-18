---
name: frontend-audit
description: >-
  Manually invoked. Next.js App Router frontend audit — Pages Router residue, app/ holding only Next's files, thin entries, the server and client boundary, typed fetchers and Cache Components scopes, Server Actions with action results and updateTag, URL-owned panel state, typed routes, shared-UI adoption with skeletons, the Tailwind v4 setup with its token layers and dark mode, favicons and app icons, and React 19 idioms. Verifies each finding and writes a prioritized report.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Frontend audit

A **manually-invoked, red-team frontend audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/frontend-audit.md`.

> **Self-contained** — every check is spelled out below, so it runs with no other skill installed. It mirrors **`nextjs`**, **`react`**, **`reusables`**, **`design-system`**, **`tailwind`**, **`logos-and-icons`**, **`code-structure`** and **`typescript`**, which are the fix targets when installed; speed goes deeper in **`performance-audit`**, client security in **`security-audit`**.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[phase]` — `development` | `production`; sets the action-item tiers. Omitted → the phase the project's `AGENTS.md` records, else `production` (assume the app is live until told otherwise — the safer default).
- `[path]` — a file, directory, or PR/diff to scope the audit to; omitted → the whole repo.

## Audit protocol

**Mindset — reviewer/attacker first.** Don't assume code is fine because it looks careful; find the sequence that breaks it. Report only findings you can justify as real, each verified before it lands.

### Method

1. **Resolve phase** — the phase argument if given; else the audit phase `AGENTS.md` records; else `production`, so a CRITICAL finding gets Fix-Now urgency instead of a pre-launch discount. Phase sets the action-item tiers.
2. **Load the previous report** — if `_reports/frontend-audit.md` exists, read it: carry unresolved findings forward (same ID, status `UNRESOLVED`), move fixed ones to "Resolved since last audit", and continue ID numbering. First run → skip Resolved and mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating.
5. **Write the report** to `_reports/frontend-audit.md` (overwrite) and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — a page is broken or leaks: a server-only module or secret in the client bundle, data shown to the wrong person from a cache, a build that can't prerender, a crash with no boundary.
- **HIGH** — a defect users will hit: stale data after a mutation, a lost form after a failed action, a broken route, a hydration mismatch. Fix before shipping.
- **MEDIUM** — a structure or pattern the next feature would copy — a fetch in an effect, a hand-rolled primitive, a misplaced file. Schedule it.
- **LOW** — naming, tidiness and small departures from the house rules.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/frontend-audit.md`:

```
# Frontend audit — <app/scope>

**Date:** <YYYY-MM-DD> · **Phase:** <phase> · **Mode:** Report-only · **Branch:** `<branch>` · **Scope:** <what was audited> · **Overall:** <X>/10

## Score change (previous → current)
| Metric | Previous | Current | Δ | Trend |
| --- | --- | --- | --- | --- |
| Overall | <prev/10 or N/A> | <cur/10> | <+N / -N / 0> | <▲ / ▼ / ■ / N/A> |

## Findings
| ID | Severity | Category | Status | Issue | Location |
| --- | --- | --- | --- | --- | --- |
| 1 | HIGH | <category> | NEW | <one-line issue> | `file/path:line` |

### F1 — <title>
- **What:** <the defect, and the concrete evidence that proves it real>
- **Why it matters:** <impact / who it affects> <· optional standard or criterion ref, e.g. the `nextjs` rule it breaks>
- **Fix:** <the specific remediation>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Router hygiene | <X>/10 | <one-line justification> |
| Page structure | <X>/10 | <one-line justification> |
| Server/client boundary | <X>/10 | <one-line justification> |
| Data fetching | <X>/10 | <one-line justification> |
| Mutations | <X>/10 | <one-line justification> |
| Caching | <X>/10 | <one-line justification> |
| Components | <X>/10 | <one-line justification> |
| URL and routes | <X>/10 | <one-line justification> |
| Design system | <X>/10 | <one-line justification> |
| Tailwind | <X>/10 | <one-line justification> |
| Logos and icons | <X>/10 | <one-line justification> |
| React | <X>/10 | <one-line justification> |

## Action items
Tiers by phase — `development` → **Fix Now / Before Launch / Post-Launch**; `production` → **Fix Now / Next Release / Backlog**. Each task references a finding ID.

### <Tier>
| # | Priority | Task (finding ID) | Effort |
| --- | --- | --- | --- |

## Resolved since last audit
| ID | Issue | How it was resolved |
| --- | --- | --- |
```

### Output

Every run produces two things:

- **Full report** → `_reports/frontend-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

Enumerate from each app's `app/` route tree, its component tree and its server data layer. Each item states its own pass and fail; `nextjs`, `react`, `reusables`, `code-structure`, `design-system`, `tailwind` and `logos-and-icons` are the fix targets if installed, `performance-audit` goes deeper on speed and `security-audit` on client security.

### Router and files

- **No Pages Router residue** — no `pages/`, `_app`, `_document`, `getServerSideProps`, `getStaticProps`, `getInitialProps` or `next/router`; no `next/head` or `next-seo` (metadata comes from the Metadata API).
- **Async request APIs** — `params`, `searchParams`, `cookies()` and `headers()` are awaited; page and layout props use `PageProps` and `LayoutProps` from `next typegen`.
- **`app/` holds only files Next.js reads by name** — no components, data or helpers, no private `_components/` folders; every parallel slot has a `default.tsx`; `global-error.tsx` sits only in `app/` and renders its own `<html>` and `<body>`.
- **Thin entries** — a `page.tsx` renders a `…PageContent`; a `layout.tsx` renders a shell; neither holds more than a guard. Sections are one file each, composed by an index; files stay around 200 lines.
- **A detail route that can miss calls `notFound()`**, and an `error.tsx` sits beside the segment it guards — usually the route group's, not one per page; a layout that can throw is caught one level up, since `error.tsx` doesn't catch the `layout.tsx` beside it. A missing `loading.tsx` is not a finding where each data-waiting component has its own `<Suspense>` and skeleton.
- **Folders** — one segment holds a `page.tsx` or a `route.ts`, never both; a prefixed route group keeps a real inner segment; a route never repeats its app's name; `components/errors/` and `components/guards/` grouped by kind; `_shared/` groups have barrels, with server-coupled components imported by path; imports point one way, enforced by a lint rule.

### Server and client

- **Server Components by default**; `"use client"` only on the leaf that needs a hook, a browser API or a handler — flag it on files that need none, or high enough to ship a whole subtree.
- **Only the props a client leaf uses** cross the boundary; no server-only module (`next/headers`, the server data layer, `env`) in client code, server modules start with `import "server-only"`, and the `config/` barrel is imported by path from client code. A Server Component is passed into client code as `children`, never imported there.
- **No module-level mutable state on the server** — it leaks between requests.
- **Rendering is the same on server and client** — no `typeof window` branch in render; browser values via `useSyncExternalStore`.

### Reading data

- **Reads go through typed fetchers** in the server data layer, with API paths from the endpoints file — never a raw `fetch` in a component; no initial data fetched in a client effect. The server barrel exports actions and reads, never the fetchers.
- **Independent reads run in parallel**, not as a waterfall; `cache()` shares one read between a page and its `generateMetadata`.
- **Cache Components:** a cached read is a `…WithData` component behind its own `<Suspense>` with a skeleton; every cached scope has a tag from the constants module and a `cacheLife` tier with a one-line reason; a near-live tier has a recorded reason. The default is to read the cookie outside and pass values into `use cache`; `use cache: private` is allowed where the read must stay off the server. A shared `use cache` scope that can `redirect()`, call `notFound()` or reads who's asking is a finding. Under Cache Components there's no `unstable_cache` and no `dynamic`, `revalidate` or `fetchCache` segment export; `Date.now()` or `Math.random()` comes after `connection()`; `useSearchParams` sits under `<Suspense>`; `generateStaticParams` returns at least one param; `redirect()` comes after the cache calls.
- **The current user** is read in a route group's layout behind `<Suspense>`, never in the root layout; repeated reads deduped by `cache()` are fine. Proxy checks no session and authorises nothing.
- **Metadata** — `generateMetadata` or `metadata` on every public page through the project's metadata factory; Route Handlers don't re-serve data a Server Component already reads.

### Mutations

- **Server Actions** validate with a shared schema, are authorised — by their own check in an app with its own backend, by the API's guard in a frontend over an API — and answer an action result — `{ success: false, error, fieldErrors, values }` on failure — never a thrown error; the form re-shows the submitted `values`.
- **After a write, `updateTag` on every tag it changed** — it re-renders the route and clears the client cache, so a `refresh()` beside it is redundant; a write that touches a cached read with no invalidation is a finding — `updateTag`, `revalidateTag(tag, 'max')` and a Route Handler's revalidation all count.
- **Forms use Actions** — `useActionState`, `useFormStatus`, uncontrolled fields — not a client `fetch` to an internal API.

### URL, routes and navigation

- **Drawer, dialog and tab state lives in the URL** — a drawer or dialog pushes a history entry when it opens, and closing one the reader arrived on through a shared link replaces it; an in-page tab replaces rather than pushes; list params are parsed by one shared parser.
- **Paths come from the routes table** (`typedRoutes`, ending `as const satisfies RouteTable` — `typescript`), never a hard-coded string; `as Route` only on a runtime path, with a comment; a nav item's `href` is typed `Route`.

### Components and the design system

- **Shared UI adopted, not re-built** — a raw element with a shared equivalent uses it; no one-off copy of a primitive the UI package ships.
- **Shared components own their behaviour, not the product's** — animation, focus, open and close are theirs; copy, links and business behaviour come in through props or a `labels` object. Props extend the element's own (`ComponentPropsWithRef`) with `className` merged last by `cn()`; inputs work controlled and uncontrolled; compound parts are named exports, never statics; `asChild` makes a button a link, never a button wrapping a link; `data-state` and `data-slot` for styling; an empty region renders nothing; overlays build on native `<dialog>` and `popover`.
- **Anything that waits on data has a `<Component>Skeleton`** reusing the component's own shell.
- **Tokens, not literals** — semantic token classes, no palette shades; an arbitrary value only when no token fits, with a comment.
- **One system** — no variant families (`PrimaryButton`), fixed `size`, `radius` and `tone` vocabularies, status colours kept apart from accents, one font and icon set, the base library installed by its CLI with local edits tracked; nothing promoted to the shared package before a second app uses it.
- **Components in the right tier and folder** — the tier chosen by what it's built from, with no `patterns` tier; `components/` organised by product area, nested as their URLs are.

### Tailwind

- **Setup** — `@tailwindcss/postcss` is the only PostCSS plugin (`@tailwindcss/vite` under Vite); no `tailwind.config.js`, `content` array, `postcss-import` or `autoprefixer`, and `@config` only during a recorded migration. One compilation per app, from one entry that starts with `@import "tailwindcss"`; a shared UI package isn't compiled on its own and takes no prefix.
- **`@source` for packages** — automatic detection skips `node_modules` and gitignored files, so an app that renders a workspace package's components names its source (`@source "../../packages/ui/src"`); prove a miss by a package class absent from the built CSS. Stories are kept out with `@source not`.
- **Every authored rule sits in a `@layer` or an `@utility`** — an unlayered class beats every utility, so a caller's class can't override it. The entry imports its files in order (theme, base, typography, utilities, animations, components), and files a base library's CLI installs are kept apart from the project's own.
- **Three token layers** — ramps in `@theme`, with any default namespace they replace cleared (`--color-*: initial`); roles per mode on `:root` and `[data-mode="dark"]`; roles exposed through `@theme inline`. A role that references another variable from a plain `@theme` resolves where it's defined, so a per-mode or per-section override never reaches the utility.
- **Dark mode** — a `@custom-variant dark` on the `data-mode` attribute with the roles overridden there; with no saved choice, the same overrides under `prefers-color-scheme: dark`; `color-scheme` set per mode; a pre-paint script in `<head>` sets the attribute, with `suppressHydrationWarning` on `<html>`. A component carrying light and dark pairs (`bg-white dark:bg-zinc-900`) is a finding.
- **Class names are complete literals** — `` `bg-${tone}` `` generates no CSS; a prop maps to complete strings in one scales file. `cn()` is `clsx` with `tailwind-merge`, custom theme scales and custom `@utility` groups registered through `extendTailwindMerge` — prove a missing registration with a merge that drops one of two classes that don't conflict. State is styled with `data-[state=…]:` and `data-slot`, not conditional strings.
- **CSS modules and `<style>` blocks** `@reference` the entry before `@apply` or `@variant`; `theme()` is deprecated in favour of `var(--…)`; decorative animation sits behind `motion-safe:` or stops under `motion-reduce:`. v3 residue — `@tailwind` directives, `darkMode: "class"`, `bg-[--x]` — is a finding.

### Logos and icons

- **The favicon set** — `favicon.ico` (16, 32, 48) for browsers and Google Search, which reads raster formats only and recommends larger than 48px; an SVG `icon` for the tab; `apple-icon.png` at 180px, opaque and unrounded. Next's file conventions or `metadata.icons` emit the tags, and no file sits in both `app/` and `public/`; `browserconfig.xml`, `mstile-*` and `mask-icon` are dead and a finding.
- **Every raster is rendered from the source SVG, opaque on a plate** — a hand-exported PNG that has drifted from the SVG, or a transparent home-screen or email icon, is a finding; where several apps share the marks, one committed generator renders them.
- **Installable apps only** — the manifest lists `any` and `maskable` icons as separate entries, never `"purpose": "any maskable"`, with maskable artwork inside the 40% safe circle; a site that doesn't install needs none, so their absence isn't a finding.
- **The logo** is an SVG whose type is outlined paths (no `<text>`), in a literal brand colour (never `currentColor` or a themeable token), imported from the shared assets. Standalone it's `role="img"` with a name; inside a link it's `aria-hidden` and the link is named; email uses PNG copies.

### React

- **Derive, don't sync** — no effect that mirrors props or state; no `setState` straight in an effect body.
- **Stable keys**, and a reset done with `key`, not an effect; effects only for outside systems; `useEffectEvent` for non-reactive logic; `useLayoutEffect` only to measure; one `data-*` handler per list reading `currentTarget`; a component is never called as a function and props are never mutated; no `forwardRef` or `.Provider` in new code.
- **The compiler is on** (`reactCompiler`), with `eslint-plugin-react-hooks`' recommended preset and StrictMode on; new code adds no defensive `useMemo`, `useCallback` or `memo`, and existing memoisation is left alone until a profile says otherwise.
- **Error boundaries** — every `<Suspense>` has one above it: `error.tsx` and `catchError` in Next.js; a `react-error-boundary` that would swallow `redirect()` or `notFound()` is a finding.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
