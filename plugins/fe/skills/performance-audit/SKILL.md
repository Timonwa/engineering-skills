---
name: performance-audit
description: >-
  Manually invoked. Frontend performance audit of a Next.js App Router app or a diff — image optimization, uploaded-image delivery and Cloudinary, the server and client boundary and bundle weight, dynamic imports for heavy libraries, font loading, streaming behind Suspense with component skeletons, cacheLife thresholds and updateTag, rendering, and Core Web Vitals proxies (LCP, CLS, INP). Verifies each finding and writes a prioritized report.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Performance audit

**Run this only when the user asks for it by name. It writes a report and changes no code; fixing a finding is a separate request.**

A **manually-invoked, red-team performance audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/performance-audit.md`.

> **Self-contained** — every check is spelled out below, so it runs with no other skill installed. It mirrors **`nextjs`**, **`react`**, **`tailwind`**, **`image-handling`** and **`cloudinary`**, which are the fix targets when installed; CI budgets are **`devops`**', general structure **`frontend-audit`**'s.

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
2. **Load the previous report** — if `_reports/performance-audit.md` exists, read it, but still run every check against the source. Use it only to keep the ID of each finding still present (status `UNRESOLVED`), carry its `WON'T FIX` findings forward unchanged — never re-raised as new findings — drop its `FIXED` findings and any no longer present, continue ID numbering from its highest ID, and take its scores for the score-change row. First run → mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating. Drop one the project records as a deviation, with its reason, in `AGENTS.md` or a doc it links.
5. **Write the report** to `_reports/performance-audit.md` — overwriting the whole file, so no resolved history accumulates — and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — a key page fails a Core Web Vital badly or can't render: an LCP image lazy-loaded or multi-megabyte, a build that can't prerender, a whole app shipped as client JavaScript.
- **HIGH** — a measurable regression on a key route: a request waterfall, a heavy library in the client bundle, layout shift from undimensioned media or fonts. Fix before shipping.
- **MEDIUM** — a cost with limited reach: a non-key route, a below-fold widget loaded eagerly, a cache tier with no reason. Schedule it.
- **LOW** — small wins and hygiene.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/performance-audit.md`, with one Overall row in the score change:

```
# Performance audit — <app/scope>

**Date:** <YYYY-MM-DD> · **Phase:** <phase> · **Mode:** Report-only · **Branch:** `<branch>` · **Scope:** <what was audited> · **Overall:** <X>/10

## Score change (previous → current)
| Metric | Previous | Current | Δ | Trend |
| --- | --- | --- | --- | --- |
| Overall | <prev/10 or N/A> | <cur/10> | <+N / -N / 0> | <▲ / ▼ / ■ / N/A> |

## Findings
| ID | Severity | Category | Status | Issue | Location |
| --- | --- | --- | --- | --- | --- |
| 1 | HIGH | <category> | NEW | <one-line issue> | `file/path:line` |

**Status:** `NEW` — found this run for the first time · `UNRESOLVED` — still present from an earlier run · `FIXED` — fixed after the audit; the note names the commit · `WON'T FIX` — the owner ruled it not a defect, intended, or accepted as it is; the note gives their reason

### F1 — <title>
- **What:** <the defect, and the concrete evidence that proves it real>
- **Why it matters:** <impact / who it affects> <· optional standard or criterion ref, e.g. LCP, or the `nextjs` rule it breaks>
- **Fix:** <the specific remediation>
- **Note:** <only once `FIXED` (the commit and what changed) or `WON'T FIX` (the owner's reason)>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Images | <X>/10 | <one-line justification> |
| Uploaded images | <X>/10 | <one-line justification> |
| Bundle | <X>/10 | <one-line justification> |
| Server/client boundary | <X>/10 | <one-line justification> |
| Dynamic imports | <X>/10 | <one-line justification> |
| Fonts | <X>/10 | <one-line justification> |
| Streaming | <X>/10 | <one-line justification> |
| Caching | <X>/10 | <one-line justification> |
| Rendering | <X>/10 | <one-line justification> |
| Core Web Vitals | <X>/10 | <one-line justification> |

## Action items
Tiers by phase — `development` → **Fix Now / Before Launch / Post-Launch**; `production` → **Fix Now / Next Release / Backlog**. Each task references a finding ID.

### <Tier>
| # | Priority | Task (finding ID) | Effort |
| --- | --- | --- | --- |
```

### Output

Every run produces two things:

- **Full report** → `_reports/performance-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

First scope it: identify the **frontend routes/components** in scope (exclude API-only apps, OG image routes, and Storybook). Read `next.config` for the images and experimental config. Audit worst-first by load impact.

### Images

- `next/image` everywhere a raster image renders — flag raw `<img>` under app routes and components (allowed for OG image routes, inline SVG or data URIs, and favicon `<link>`s).
- Every image has `alt` and stable dimensions — `width`+`height`, or `fill` on a sized parent — to prevent CLS. Responsive/`fill` images set `sizes` so a 200px slot isn't served a 4K file.
- The above-fold LCP image loads with `loading="eager"` or `fetchPriority="high"` (`preload` only rarely, never together) — and only that image. `priority` is deprecated in Next 16; any use is a finding. Images below the fold stay lazy.
- Every remote host is allowlisted in `images.remotePatterns` (not the deprecated `domains`). WebP is the default format; adding AVIF to `images.formats` is optional, so its absence isn't a finding.
- No huge unoptimized raster assets shipped from `public/` (multi-MB PNG/JPG) or referenced with `unoptimized`; route them through `next/image` or pre-compress. Prefer SVG for icons/logos.

### Uploaded images

- **Served as derivatives sized for delivery, never the original upload**; the browser compresses a display image to its slot's size before upload, and a stored copy is no larger than the biggest derivative needs (`image-handling`).
- **URLs are built when the record is read**, from a stored path or public id and a version; a stored URL, or a replace that keeps the same URL, is a finding.
- **Public files cache long** — the `?v=` version changes on every replace, so a long `Cache-Control` is safe; left at the storage default (an hour on Cloud Storage), hot images re-download, and a CDN sits in front of them.
- **The processing worker runs in the bucket's region**, so reading the file is free; a function region that differs from the bucket's location is a finding (the bucket's location may be console-only — mark it "needs confirmation").

### Cloudinary

Only where the project uses it (`cloudinary`):

- **`f_auto` and `q_auto` end every delivery URL as their own components** — `c_limit,w_800/f_auto/q_auto`, never merged into the resize step, and after a named transformation (`t_card_v1/f_auto/q_auto`), never inside it, where they're ignored. A URL without them is a finding unless it needs a fixed format or quality.
- **Crops are chosen** — `c_limit` for content images so nothing is upscaled, `c_fill,g_auto` for fixed-shape slots.
- **Responsive images use one width ladder through one URL helper**, with a real `sizes`. In Next.js the components that show Cloudinary images pass `next/image` a per-image `loader` that only adds the width, with `images.deviceSizes` set to the ladder; `images.loaderFile` rewrites every image on the site and is a finding.
- **Cost** — each new transformation URL is a billed derivative, then bandwidth: a width or transformation taken from request input, or widths off the ladder, multiplies the meter. A named transformation is versioned (`t_card_v2`), never edited in production; a delete passes `invalidate: true`; whether strict transformations are on is a console setting — "needs confirmation".

### Bundle

- `optimizePackageImports` lists third-party barrel packages that Next doesn't already optimise — `lucide-react`, `date-fns`, `lodash-es`, `ramda` and others are optimised by default, so don't flag them or ask for per-path imports.
- No whole-library imports that defeat tree-shaking (`import { x } from "lodash"` on the CJS build; `import * as` on a large package).
- No server-only libraries in client code (admin SDKs, DB clients, Node built-ins `fs`/`path`/`crypto`/`child_process`) — these belong on the server side of the boundary.
- No `require()` pulling a whole CommonJS library into client code.
- Third-party scripts (analytics, chat, ads) load via `next/script` with the right `strategy` (`afterInteractive`/`lazyOnload`) — not a raw blocking `<script>` in the head. Flag heavy trackers that block the main thread on load.
- A byte budget guards the build where the project sets one (`size-limit` on the client output — `devops`); the bundle is inspected with `next experimental-analyze` under Turbopack, or `@next/bundle-analyzer` under Webpack. An analyzer alone isn't a budget.

### Server/client boundary

- Minimize client JS: every `"use client"` file must actually need the browser (hooks, event handlers, `window`/`document`, a browser-only lib). Flag directives with none of these — they should be Server Components.
- Push interactivity to the leaves: a page marked `"use client"` for one small widget moves the reads into `…WithData` server components and keeps only the widget as a client leaf. Pass a client leaf only the fields it uses, so the serialised payload stays small; pass Server Components into client code as `children`, never by importing them. Server Components split per route automatically — don't flag heavy _server_ imports as client bundle weight.

### Dynamic imports

- Heavy and/or below-fold client components load via `next/dynamic` (or `React.lazy`) with a loading fallback — charts, rich-text editors, maps, PDF tooling, syntax highlighters, large date pickers. Flag heavy widgets behind modals/tabs/accordions that are imported eagerly at the top of the file. Don't flag always-visible above-fold widgets or small libs.

### Fonts

- Fonts load via `next/font` (google or local), chosen and loaded by the UI package and exposed as CSS variables (`tailwind`), with a subset — `next/font` self-hosts and removes the extra round-trip; `display: "swap"` is its default, so don't flag its absence. Flag legacy `<link>` Google-Fonts tags, `@import url(fonts.googleapis…)` in CSS, and local font files `next/font` could self-host. Preload only the fonts actually used above the fold; keep `adjustFontFallback` on, so the metric-matched fallback stops the swap shifting the layout. For any font/asset host you still hit directly, use `<link rel="preconnect">` (not for `next/font`, which self-hosts).

### Streaming

- Anything that waits on data sits behind its own `<Suspense>` with the component's own `<Component>Skeleton` — skeletons belong to components, so a missing route-level `loading.tsx` is not a finding where each waiting component has one. Where a page renders multiple independent server-fetched panels, each slow panel is wrapped in its own `<Suspense>` so one slow fetch doesn't block the rest. Don't flag static/near-instant segments where a skeleton would just flash. `<Suspense>` sits as low as it can, around the part that waits.
- No waterfalls — independent reads run with `Promise.all`, and cheap checks run before an expensive `await`; a promise can be streamed to a client leaf and read with `use()`. `useSearchParams` sits under `<Suspense>`.

### Caching

- **`cacheLife` thresholds:** `stale` under 30 seconds is excluded from prerendering (a request-time hole); `stale` under 5 minutes is prerendered but kept out of the app shell; `revalidate` of 0 or `expire` under 5 minutes is never prerendered and needs its own `<Suspense>`. A tier that lands in one of these without a recorded reason is a finding.
- Fetchers use the correct cache tier + `revalidate`, and tags that can be invalidated. Cache Components model: `use cache` + a named `cacheLife` tier (freshness-based, e.g. `realtime`/`frequent`/`daily`/`static`) + a `cacheTag` constant. Legacy model: `fetch(url, { next: { revalidate, tags } })` — never `unstable_cache`. Flag data with no tier, string-literal or undeclared tags, per-user data cached as shared, duplicate per-render fetches that need `cache(...)` memoization, and a short-lived `cacheLife` nested inside a longer one, which throws.
- After a mutation, `updateTag` on what it changed — it re-renders the route and clears the client cache, so no `refresh()` beside it — rather than leaving data stale or a blanket `revalidatePath`. Flag writes that don't invalidate what they changed.
- Every route prerenders a static shell — under Cache Components, reading request data or uncached data outside `<Suspense>` fails the build (the blocking-route error), so wrap the part that reads it. Deeper caching tiers/revalidation how-to → `nextjs` `references/caching.md` when installed.

### Rendering

- Stable `key` props on mapped elements (not the array index when the list reorders). The React Compiler memoises inline objects and callbacks — don't flag them or recommend manual `memo`/`useMemo`. Media/embeds carry explicit dimensions to prevent CLS.
- INP: `useTransition` or `useDeferredValue` for slow updates; scroll and touch listeners `passive`; `useLayoutEffect` only to measure, since it blocks paint; no data fetched in `useEffect`; `content-visibility: auto` on long lists; `<Link prefetch={false}>` on long link lists.
- CSS: one Tailwind compilation per app, with `@source not` excluding stories (`tailwind`).
- Long lists load in pages or windows — URL-driven pagination, a cursor, infinite scroll or virtualisation — never everything at once; an unbounded fetch grows with the data and hydrates an oversized tree.

### Core Web Vitals

Good at the 75th percentile of field data: **LCP ≤ 2.5 s · INP ≤ 200 ms · CLS ≤ 0.1**. From code, audit the proxies:

- **LCP** — an eager or high-priority hero image, no render-blocking scripts/CSS in the root layout, low TTFB (static-renderable public pages).
- **CLS** — image and embed dimensions, and the metric-matched font fallback (covered above).
- **INP** — heavy client work / large hydration / long tasks on interactive pages (big synchronous handlers, un-debounced input, oversized client trees). **INP is field-only** — it needs real interaction, so it can't be scored from code or a lab run; track it with production RUM (`web-vitals`). Note this limitation in the report rather than assigning it a code-derived score.
- Field data can't be read from code: check only that it's collected (`web-vitals` reporting, or CrUX for the origin), and mark the numbers "needs confirmation". Lab runs (Lighthouse CI on key pages — `devops`) catch regressions.

## Fixing what it found

Fixing is a separate request, after the report is written, and covers only the findings the owner chose. Then **update the report in place — never re-run the audit to update it**: a re-run re-checks the whole codebase, costs a full audit and raises new findings mid-fix. Mark each fixed finding `FIXED` with its commit and a one-line note of what changed, mark a finding the owner rules out `WON'T FIX` with their reason, and leave everything else as it stands. Recompute the scorecard categories the fixes touched and the Overall, and rewrite the one score-change row (previous → current) — never add a second row.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
