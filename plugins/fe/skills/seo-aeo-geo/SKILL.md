---
name: seo-aeo-geo
description: >-
  SEO, AEO and GEO — being found in search results, being the direct answer, and being cited by AI engines. Covers indexability per app and record state, metadata and canonicals, share cards, JSON-LD, robots and sitemaps, featured snippets and Google AI Overviews, and citation by ChatGPT, Perplexity, Copilot and Claude through their search crawlers, Bing and IndexNow. Use when adding a public page, its metadata or structured data, sitemaps or robots, or working on AI search visibility.
---

# SEO, AEO and GEO

Three goals, one foundation. **SEO** gets a page found and ranked in search results; **AEO** gets it chosen as the direct answer — a featured snippet, an AI Overview, a spoken reply; **GEO** gets it cited by the generative engines — ChatGPT, Perplexity, Copilot, Claude. All three start from the same thing: a crawlable, indexable page with clear text, correct metadata and the right robots rule, so the defaults are set once and every new page is right by building it the normal way.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## SEO — ranking in results

### What may be indexed

- **Each app is indexable or not, as a whole.** A marketing site and a help centre are; a dashboard, an admin panel and an API never are. The app's site config carries the flag, and its metadata factory and `robots.ts` read it.
- **An app that's never indexed** sends `X-Robots-Tag: noindex, nofollow` on every response from its `next.config` headers, which covers what page metadata can't — JSON, files, redirects.
- **Non-production tiers are never indexed**: noindex everywhere and `Disallow: /`. A blocked page's `noindex` is never read, so a linked staging URL can still be listed by its address — staging sits behind auth as well.
- **`robots.txt` controls crawling, `noindex` controls indexing.** To keep a page out of results, let it be crawled and send `noindex`; disallowing it hides the rule that would remove it.

### Metadata

- **One factory per app**, from a shared builder that takes the app's config; every page's metadata goes through it ([references/implementation.md](references/implementation.md)).
- **A canonical only when the page passes its own path.** The root layout sets none, and the factory has no default path: a default `/` would make every page that forgets its path claim to be the home page.
- **The root layout sets `metadataBase`** — without it a relative URL is a build error — and the title template (`%s · Brand`). The factory never spreads `title: undefined` over it.
- **`openGraph` and `twitter` replace the parent's whole object**, so the factory builds each one complete on every page.
- **Copy lives in typed catalogs**, keyed by page and split into indexable and not, never inline in a page. A dynamic route's `generateMetadata` passes real data: the record's title, a trimmed summary, its image, and whether it's public.
- **Titles** are unique, lead with the topic, and end with the brand from the template; about 50–60 characters, because Google truncates by pixel width. **Descriptions** are unique and say why to click, about 150–160 characters. Google rewrites both freely, so key words go first.

### Indexation follows the record

A page's indexability comes from its record's state, decided in one place:

| Record state                       | The page                                                        | In the sitemap |
| ---------------------------------- | --------------------------------------------------------------- | -------------- |
| Draft, or private to its owner     | 404 to everyone else                                            | No             |
| Published and public               | indexable, self-canonical                                       | Yes            |
| Unlisted — reached by a share link | `noindex`, `Referrer-Policy: no-referrer` (`access-control`)    | No             |
| Unpublished or archived            | 404, or `noindex` if its owner still visits                     | No             |
| Deleted for good                   | 410, from the proxy or a route handler — `notFound()` gives 404 | No             |
| Moved to a new address             | a permanent redirect (308) to it                                | The new one    |

**A status only counts if it's sent before streaming starts.** Once a `<Suspense>` fallback or `loading.tsx` renders, the response is already 200: a later `notFound()` only injects `noindex`, and a later `redirect()` becomes a client-side redirect. So the record is loaded and `notFound()` or `permanentRedirect()` called before any `await` behind a boundary — or the proxy and `next.config` redirects decide it first (`nextjs`).

Pages that must work for people but not appear in results — sign-in, account pages, search results, filters — are `noindex` from the catalog's non-indexable half.

### Share cards

- **Every indexable page has a 1200×630 card** with alt text, as `og:image` and Twitter's `summary_large_image`.
- **The card is generated** with `ImageResponse` — from an `opengraph-image` file beside a static page, or an `/api/og` route for dynamic ones — and a page's own photo goes **inside** the card, so every share looks like the brand and the text stays legible.
- **The route validates its query** with a schema, caps the text, and takes a photo only from the project's own image origins — an open photo parameter makes it a proxy anyone can point anywhere.
- **Fonts are `.ttf`, `.otf` or `.woff`**; `ImageResponse` can't read `woff2`, and its whole bundle — JSX, fonts, images — stays under 500 KB.
- **`robots.txt` allows the card route** even when it disallows the rest of `/api/`: the platforms that fetch cards obey it.
- **The image URL is absolute**, because feeds and JSON-LD don't resolve relative ones.

### Structured data

- **JSON-LD only**, rendered by a Server Component through one XSS-safe component, so crawlers see it without running JavaScript.
- **A connected graph**: the Organization and WebSite nodes carry stable `@id`s that pages reference, rather than disconnected islands.
- **Mark up only what's on the page**, never self-authored ratings or reviews, and validate with the Rich Results Test.
- **Valid isn't shown.** FAQ rich results, HowTo and the sitelinks search box are gone from Google Search; check Google's search gallery before promising a feature. The Organization `logo` is at least 112px and reads on white — a raster is safest (`logos-and-icons`). An event page is eligible only for an in-person event the public can book, one event per page.

Types, properties and builders: [references/structured-data.md](references/structured-data.md).

### robots.txt and sitemaps

- **Google reads `user-agent`, `allow`, `disallow` and `sitemap` only**; `host` and `crawl-delay` do nothing there. Don't block the CSS, JavaScript and images a page needs to render.
- **The sitemap lists only canonical, indexable URLs that answer 200**, each with its real `lastModified`, which Google uses when it's consistently accurate. It ignores `priority` and `changeFrequency`. One file holds at most 50,000 URLs or 50 MB; beyond that, split it with `generateSitemaps` (its `id` is a promise from Next 16).
- **During maintenance**, `robots.txt` keeps answering 200, because a 5xx there stops Google crawling the whole site (`maintenance-mode`).

### Technical fundamentals

- **Core Web Vitals, at the 75th percentile:** LCP under 2.5 s, INP under 200 ms, CLS under 0.1 (`performance-audit`).
- **One host and one URL shape** — HTTPS, one of www or not, one trailing-slash and case policy — enforced with 301s.
- **Server-rendered content and real `<a href>` links**, so nothing important needs JavaScript to be found (`semantic-html`).
- **One `<h1>`** and a heading hierarchy that doesn't skip; images with meaningful `alt`, descriptive filenames and set dimensions.
- **Multi-locale pages** list every locale and an `x-default` with `hreflang`, each locale canonical to itself.

### Architecture and programmatic pages

- **URLs** are lowercase, hyphenated and readable, and mirror the hierarchy; every changed or removed URL gets a 301; important pages stay a few clicks from the home page; breadcrumbs mirror the path and ship `BreadcrumbList` ([references/site-architecture.md](references/site-architecture.md)).
- **Programmatic pages** exist only when each one deserves to on its own, with defensible data; never doorway or thin pages, which Google's scaled-content and site-reputation abuse policies target ([references/programmatic-seo.md](references/programmatic-seo.md)).

## AEO — being the direct answer

Answer engines quote one page as the answer: a featured snippet, Google's AI Overviews and AI Mode, a voice assistant reading a snippet aloud.

- **No markup makes a page the answer.** Google says a site can't request a featured snippet, and there are "no additional requirements" for AI Overviews or AI Mode: the page must be indexed and eligible for a snippet. Optimising for them "is still SEO".
- **Write so the answer is easy to find** — a heading that names the question where readers have one, the answer in the first sentence or two beneath it, then the detail; a definition for "what is", numbered steps for "how to", a table for "X or Y". This is writing for people, not a format engines require: Google says there's no need to break content into tiny pieces.
- **Limit what's quoted** with `nosnippet`, `data-nosnippet`, `max-snippet` or `noindex`.
- **Measure it** in Search Console's Generative AI performance report.

## GEO — being cited by AI engines

- **Allow each engine's search crawler** — it's how the engine finds pages to cite, and each is separate from its training crawler:

  | Engine            | Search crawler     | What blocking it does                               |
  | ----------------- | ------------------ | --------------------------------------------------- |
  | ChatGPT search    | `OAI-SearchBot`    | the site isn't shown in ChatGPT search answers      |
  | Claude            | `Claude-SearchBot` | Claude can't index it for search results            |
  | Perplexity        | `PerplexityBot`    | it isn't surfaced in Perplexity's results           |
  | Microsoft Copilot | `Bingbot`          | it leaves Bing's index, which Copilot's answers use |

  Training crawlers (`GPTBot`, `ClaudeBot`, `Google-Extended`) are a separate business decision, recorded in `AGENTS.md`. User-triggered fetchers (`ChatGPT-User`, `Claude-User`, `Perplexity-User`) act for a person who asked; OpenAI and Perplexity say robots.txt may not apply to them.

- **Be in Bing's index:** verify the site in Bing Webmaster Tools, submit the sitemap with a true `lastmod`, and send changed URLs through **IndexNow** when content is added, updated or deleted — Bing says these freshness signals reach its AI answers. IndexNow shares submissions with Bing, Naver, Seznam.cz, Yandex and Yep; Google doesn't take part.
- **Text a crawler reads without JavaScript** — server-rendered pages, and AI crawlers named in `htmlLimitedBots`, because Next streams metadata to bots it doesn't list.
- **Claims an engine can quote:** stated plainly, backed by data and named sources, with a visible updated date, and kept current.
- **One entity everywhere:** the same name and description on every page, the Organization node with `sameAs` links to official profiles, and one canonical version of each page — Bing says duplicates blur which version to trust.
- **What isn't documented:** none of these engines publishes how it picks sources inside an answer, and Bing says no tool can guarantee inclusion. Skip vendor "AI visibility" scores and inauthentic mentions; Google says chasing mentions "isn't as helpful as it might seem".
- **Measure it** in Bing Webmaster Tools' AI Performance report (citations in Copilot and Bing's AI summaries), through referrals from the engines' domains in analytics, and with a monthly check of the key queries in each engine.
- **`llms.txt` is optional** — Google doesn't use it; some tools read it. When a project wants one, it's built from the same catalog.

Crawlers, writing and monitoring in detail: [references/aeo-geo.md](references/aeo-geo.md).

## Do / Don't

- **Do** decide indexability per app and per record state; send `X-Robots-Tag` from apps that are never indexed; set a canonical only from the page's own path; keep copy in catalogs; generate cards behind a validated route; connect the JSON-LD graph; list only indexable URLs in the sitemap; record the AI-crawler decision; allow each engine's search crawler; send IndexNow on change; write answers people can find.
- **Don't** default the canonical; disallow a page you need deindexed; leave the card route blocked; take arbitrary photo URLs; use `woff2` in a card; mark up absent content or self-author ratings; promise FAQ or HowTo results; expect Google to read a sitemap's priority; rely on `llms.txt` or chunk content for engines; mass-produce thin pages; leave a moved URL without a 301.

## Related skills

The Metadata API, `ImageResponse` and caching `nextjs` · metadata file names `code-structure` · share links `access-control` · the 503 during maintenance `maintenance-mode` · the logo `logos-and-icons` · markup `semantic-html` · names `naming` · per-tier constants `env` · clear writing `copywriting` · auditing a site `seo-audit`.
