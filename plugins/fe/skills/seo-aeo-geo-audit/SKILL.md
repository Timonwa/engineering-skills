---
name: seo-aeo-geo-audit
description: >-
  Manually invoked. SEO, AEO and GEO audit of a public-facing app or a diff — indexability per app and record state, statuses sent before streaming, a canonical only from the page's own path, metadata through one factory, generated share cards behind a validated route, JSON-LD eligibility, robots and sitemaps as Google reads them, Core Web Vitals proxies, answers easy to find, and the AI engines' search crawlers, Bing and IndexNow. Writes a prioritised report.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# SEO, AEO and GEO audit

**Run this only when the user asks for it by name. It writes a report and changes no code; fixing a finding is a separate request.**

A **manually-invoked, red-team SEO, AEO and GEO audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/seo-aeo-geo-audit.md`.

> **Self-contained** — every check is spelled out below, so it runs with no other skill installed. It mirrors **`seo-aeo-geo`**, with **`nextjs`** and **`semantic-html`** where they meet it; those are the fix targets when installed. A check that lives in a search console rather than the code is marked "needs confirmation", never scored from code.

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
2. **Load the previous report** — if `_reports/seo-aeo-geo-audit.md` exists, read it, but still run every check against the source. Use it only to keep the ID of each finding still present (status `UNRESOLVED`), carry its `WON'T FIX` findings forward unchanged — never re-raised as new findings — drop its `FIXED` findings and any no longer present, continue ID numbering from its highest ID, and take its scores for the score-change row. First run → mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating. Drop one the project records as a deviation, with its reason, in `AGENTS.md` or a doc it links.
5. **Write the report** to `_reports/seo-aeo-geo-audit.md` — overwriting the whole file, so no resolved history accumulates — and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — pages that should rank can't be indexed, or pages that must stay out are indexed: a production `Disallow: /` or `noindex`, every page canonical to the home page, a private record public.
- **HIGH** — a key page loses its result or its eligibility: a wrong status, a duplicate without a canonical, structured data that breaks a rich result, a search or AI crawler blocked without a reason.
- **MEDIUM** — a weaker result on some pages: missing share cards, thin metadata, a page buried deep. Schedule it.
- **LOW** — polish, and checks that need a console to confirm.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/seo-aeo-geo-audit.md`, with one Overall row in the score change:

```
# SEO, AEO and GEO audit — <app/scope>

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
- **Why it matters:** <impact / who it affects> <· the source, e.g. Google Search Central: canonicalization>
- **Fix:** <the specific remediation>
- **Note:** <only once `FIXED` (the commit and what changed) or `WON'T FIX` (the owner's reason)>

## Scorecard
| Category | Score | Notes |
| --- | --- | --- |
| Indexability | <X>/10 | <one-line justification> |
| Metadata | <X>/10 | ... |
| Share cards | <X>/10 | ... |
| Structured data | <X>/10 | ... |
| robots.txt and sitemaps | <X>/10 | ... |
| Technical fundamentals | <X>/10 | ... |
| AEO | <X>/10 | ... |
| GEO | <X>/10 | ... |
| Analytics | <X>/10 | ... |

## Action items
Tiers by phase — `development` → **Fix Now / Before Launch / Post-Launch**; `production` → **Fix Now / Next Release / Backlog**. Each task references a finding ID.

### <Tier>
| # | Priority | Task (finding ID) | Effort |
| --- | --- | --- | --- |
```

### Output

Every run produces two things:

- **Full report** → `_reports/seo-aeo-geo-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

First scope it: which apps are **indexable** (a marketing site, a help centre) and which are never indexed (a dashboard, an admin panel, an API) — the app's site config should say. Never-indexed apps get only the noindex checks. Then audit in priority order — crawlable and indexable before on-page work matters — against `seo-aeo-geo` as the fix target if installed.

> **JS-rendered schema caveat.** `curl`, `fetch` and `WebFetch` don't run scripts, so JSON-LD injected on the client is invisible to them. Check the source and the rendered page before reporting "no structured data".

### Indexability

- **Each app is indexable or not, as a whole**, from its site config; a never-indexed app sends `X-Robots-Tag: noindex, nofollow` from its `next.config` headers on every response.
- **Non-production tiers** send noindex everywhere and `Disallow: /`; whether they also sit behind auth is "needs confirmation".
- **`noindex` controls indexing, `robots.txt` crawling** — a page that must leave the index is crawlable with `noindex`; a page both disallowed and noindex is a finding, because the noindex is never read. Share links (unlisted pages) are `noindex` with `Referrer-Policy: no-referrer`, never disallowed.
- **Indexation follows the record's state**, decided in one place: drafts and private records 404 to others; published ones are indexable and self-canonical; deleted ones 410 (from the proxy or a route handler — `notFound()` gives 404); moved ones redirect permanently (308). Unpublished or archived records answer 404, or `noindex` where the owner still visits. **The status is sent before streaming** — under Cache Components every dynamic route streams a static shell first, so a real 404, 410 or redirect comes from the proxy (or `next.config` for fixed redirects); a `notFound()` or `redirect()` in the page gives a 200 with injected noindex or a client-side redirect, which is a finding.
- **Pages people need but search shouldn't list** — sign-in, account, search results, filters — are noindex.

### Metadata

- **One metadata factory per app**; every public route's `metadata` or `generateMetadata` goes through it, and a dynamic page passes the record's real title, summary, image and public flag. The factory never spreads `title: undefined` over the template. No `next/head` or `next-seo`.
- **A canonical only when the page passes its own path** — a factory that defaults the path to `/`, or a root layout that sets a canonical, is a high-severity finding (every page that forgets claims to be the home page).
- **`metadataBase` and a title template** on the root layout; `openGraph` and `twitter` built whole on each page (they replace the parent's object).
- **Copy in typed catalogs**, never inline; titles and descriptions unique and the topic first. Google sets no length limit, only truncates — length alone is not a finding.

### Share cards

- **Every indexable page has a 1200×630 card** with alt text, `summary_large_image`, an absolute URL.
- **Generated with `ImageResponse`**; a dynamic card route validates its query with a schema, caps the text and takes photos only from the project's own origins — an open photo parameter is a finding.
- **Fonts `.ttf`, `.otf` or `.woff`**, never `woff2`; the bundle under 500 KB; flexbox only, no grid; the output deterministic so it caches.
- **`robots.txt` allows the card route** even when it disallows the rest of `/api/`.

### Structured data

- **JSON-LD only**, from a Server Component through one XSS-safe component (`<` escaped).
- **A connected graph** — Organization and WebSite with stable `@id`s that pages reference.
- **Only what's on the page**; no self-authored ratings or reviews.
- **Eligibility, not syntax** — FAQ rich results, HowTo and the sitelinks search box are gone from Google Search; relying on them for a result is a finding. Events are eligible only when in person, publicly bookable, one per page. The Organization logo is at least 112px and reads on white.

### robots.txt and sitemaps

- **Google reads `user-agent`, `allow`, `disallow` and `sitemap` only**; `host` or `crawl-delay` for Google is dead weight. CSS, JavaScript and images a page needs aren't blocked.
- **The sitemap lists only canonical, indexable URLs that answer 200**, with real `lastModified`; `priority` and `changeFrequency` do nothing for Google. At most 50,000 URLs or 50 MB per file; `generateSitemaps`' `id` is a promise from Next 16.
- **`robots.txt` answers 200 during maintenance** — a 5xx stops Google crawling the whole site.

### Technical fundamentals

- **Core Web Vitals proxies** at the 75th percentile — LCP ≤ 2.5 s (an eager or high-priority hero image; `priority` is deprecated), INP ≤ 200 ms, CLS ≤ 0.1 (`performance-audit`).
- **One host and URL shape**, enforced with 301s; every changed or removed URL has a 301; server-rendered content and real `<a href>` links; headings in order (Google needs no single `<h1>`, so that's not a finding); `<html lang>`; descriptive image filenames with dimensions set; `hreflang` with `x-default` on multi-locale pages, each locale canonical to itself; custom 404 and 500 pages; the viewport never blocks zoom.
- **URLs** lowercase, hyphenated and readable; important pages a few clicks deep; no orphans; breadcrumbs with `BreadcrumbList`; programmatic pages only where each deserves to exist (no doorway or thin pages).

### AEO — being the direct answer

- **Answers easy to find** — a heading naming the question where readers have one, the answer first, then the detail; a definition, steps or a table where the query asks for one. No special markup is required, and chunking content for engines is not a fix to recommend.
- **Snippet controls** (`nosnippet`, `data-nosnippet`, `max-snippet`) used deliberately, not left blocking pages that should be quoted.
- **Measured** in Search Console's Generative AI performance report — "needs confirmation", since it lives in the console.

### GEO — being cited by AI engines

- **Search crawlers allowed** — `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `Bingbot`. Blocking one removes the site from that engine's answers; a block without a recorded reason is a finding. Training crawlers (`GPTBot`, `ClaudeBot`, `Google-Extended`) are a separate recorded decision — `Google-Extended` doesn't affect Search.
- **In Bing's index** — changed URLs sent through IndexNow (a key file at the root); Bing Webmaster Tools verification is checkable only as its meta tag or file, and the sitemap submission is "needs confirmation".
- **Readable without JavaScript**, with AI crawlers added to `htmlLimitedBots` alongside Next's default list — a pattern that drops the defaults is a finding.
- **Quotable claims** — plain, sourced, with a visible updated date; **one entity** — the same name and description, `sameAs` on the Organization node, one canonical version of each page.
- **Measured** in Bing's AI Performance report and through the engines' referrals — "needs confirmation". `llms.txt` is optional; its absence is not a finding.

### Analytics

- Analytics and the tag manager fire only in production and only after consent (`cookie-consent`); Search Console and Bing Webmaster Tools verification is checked only as its meta tag or file.

> **Don't report as ranking signals:** bounce rate, time on page, pages per session. For a migration, map every old URL to its new one with a 301, preserve titles and content, and resubmit the sitemap.

## Fixing what it found

Fixing is a separate request, after the report is written, and covers only the findings the owner chose. Then **update the report in place — never re-run the audit to update it**: a re-run re-checks the whole codebase, costs a full audit and raises new findings mid-fix. Mark each fixed finding `FIXED` with its commit and a one-line note of what changed, mark a finding the owner rules out `WON'T FIX` with their reason, and leave everything else as it stands. Recompute the scorecard categories the fixes touched and the Overall, and rewrite the one score-change row (previous → current) — never add a second row.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
