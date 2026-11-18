# AEO and GEO — reference

Behind the AEO and GEO sections of `SKILL.md`. Google's [AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) is the anchor: "optimizing for generative AI search is optimizing for the search experience, and thus still SEO."

> Treat figures in the wild with suspicion — most "AEO" and "GEO" statistics are single-vendor studies with false precision, and the engines change monthly. Don't hardcode percentages or per-product internals as facts.

## What Google says to do — and to ignore

- **Nothing extra is needed** for AI Overviews and AI Mode: a page that's indexed and eligible for a snippet can be shown. What's shown is limited with `nosnippet`, `data-nosnippet`, `max-snippet` or `noindex`.
- **Ignore for Google Search:**
  - "chunking" content into tiny self-contained pieces — there's no such requirement;
  - `llms.txt`, AI text files or special Markdown — Search ignores them;
  - chasing inauthentic mentions across the web — they help less than they seem, and spam systems discount them;
  - adding structured data in the hope of AI visibility — it isn't required.
- **Do the fundamentals:** helpful, people-first content with clear headings and direct answers, real expertise and named authors, accurate dates, fast crawlable pages, and the page's main content in HTML, not behind a login or a script.
- **Watch it in Search Console's Generative AI performance report**, not in a vendor's "AI visibility" score.

## Writing that every engine reads well

Clear writing helps readers first, and it's also what any engine can quote. None of this is a ranking trick:

- Answer the question near the top of the section that asks it, then elaborate.
- Match the shape to the question: a definition for "what is", numbered steps for "how to", a table for "X vs Y", pros and cons for an evaluation.
- Cite named sources with links and dates; prefer first-hand data; keep competitive pages up to date and show when they were.
- Keyword stuffing makes a page worse for people and engines alike.

## AI crawlers in robots.txt

An engine's search crawler must be allowed for it to cite you. Each vendor separates **search** (citations) from **training**, and each token is set independently:

```txt
User-agent: OAI-SearchBot      # ChatGPT search results
User-agent: GPTBot             # OpenAI model training only
User-agent: Claude-SearchBot   # Claude's search results
User-agent: ClaudeBot          # Anthropic model training only
User-agent: PerplexityBot      # Perplexity search results (not training)
User-agent: Google-Extended    # Gemini training and grounding — not Google Search
User-agent: Bingbot            # Bing's index, which Copilot answers from
Allow: /
```

- **User-triggered fetchers** (`ChatGPT-User`, `Claude-User`, `Perplexity-User`) act for a person who asked for the page. OpenAI says robots.txt "may not apply" to `ChatGPT-User`, and Perplexity says `Perplexity-User` "generally ignores" it; Anthropic says blocking `Claude-User` stops Claude fetching the page when someone asks.
- **OpenAI** notes a robots.txt change can take about 24 hours to reach ChatGPT search, and a site opted out of `OAI-SearchBot` can still appear as a navigational link.
- Blocking `Google-Extended` does **not** remove you from Google Search or its AI features (those use `Googlebot`).
- `CCBot` (Common Crawl) is training-oriented and can be blocked without losing search citations.
- Allowing search bots while blocking training ones is a coherent choice; which to allow is a **business decision → record it in `AGENTS.md`**.
- **Next.js streams metadata** to clients it doesn't list as HTML-limited bots, appending it to `<body>`; AI crawlers aren't on its default list, so either add them to `htmlLimitedBots` in `next.config` — keeping Next's default bots in the pattern, since setting it replaces the default list — or keep `generateMetadata` fast and cacheable (`nextjs`).

## Bing, Copilot and IndexNow

Microsoft Copilot answers from Bing's index, so Bing is the way in for Copilot:

- **Verify the site in Bing Webmaster Tools** and submit the sitemap. Its `lastmod` must be the page's real last change, never the date the sitemap was generated.
- **Send IndexNow** for every URL added, updated or deleted: a `GET` for one URL or a JSON `POST` of up to 10,000, with a key file at the site root. Bing shares submissions with the other participating engines (Naver, Seznam.cz, Yandex, Yep); Google doesn't take part, so the sitemap still matters for Google.
- **Bing's advice for being cited:** clear headings, tables and FAQ sections; claims backed by data, examples and sources; content kept current; text, images and video consistent about the same entity; one authoritative version of each page; Bing Places details current for a local business.
- **Bing's AI Performance report** counts citations in Copilot, Bing's AI summaries and some partner integrations, with the grounding queries behind them. It doesn't show placement inside an answer.

Sources: [Introducing AI Performance in Bing Webmaster Tools](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/), [Sitemaps in AI-powered search](https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/), [IndexNow documentation](https://www.indexnow.org/documentation).

## What the engines don't say

- **OpenAI** documents its crawlers but not which search providers ChatGPT search draws on, or how it ranks sources.
- **Anthropic** documents its crawlers and that Claude cites its sources, but not the index behind Claude's search.
- **Perplexity** documents `PerplexityBot` as its search crawler, not used for training, and nothing about ranking.
- So treat claims about "ranking factors" for these engines as unverified; the safe work is the documented part — crawl access, Bing's index, clear and current pages.

## llms.txt — optional

A proposed convention (llmstxt.org): a Markdown `/llms.txt` listing a site's key pages. Google Search ignores it, and it neither helps nor harms ranking. It's cheap for a docs or content site whose readers use developer tools that read it; never treat it as a visibility lever.

## Monitoring

Pick the top 10–20 queries, run them through the engines monthly, and log who is cited and whether you appear; pair it with Search Console's Generative AI performance report for Google, Bing's AI Performance report for Copilot, and referrals from the engines' domains in analytics. Vendor tools churn fast; the manual method lasts.

## Boundary

"Traffic dropped" or "why am I not ranking" → the `seo-aeo-geo-audit` skill.
