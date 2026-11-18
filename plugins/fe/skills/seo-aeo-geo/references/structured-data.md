# Structured data (schema.org / JSON-LD) — reference

Behind the "Structured data" section of `SKILL.md`. Rendered via the `<JsonLd>` component (XSS-escaped) and built by `@id`-anchored helpers.

## Rules

- **JSON-LD only** for new work (Google's recommended format; microdata/RDFa are legacy).
- **Mark up only what's on the page.** Mismatched or invisible-content markup risks a manual action.
- **Connect the graph** with stable `@id`s — Organization/WebSite/WebPage/Breadcrumb reference each other rather than sitting as disconnected islands.
- **Validate**: Rich Results Test (eligibility) + Schema.org Validator (syntax). **Valid ≠ displayed** — Google chooses when to show rich results.
- **Values**: dates ISO 8601, URLs absolute/fully-qualified, enums exact (e.g. `https://schema.org/InStock`).
- **SSR the JSON-LD** (Server Component) so crawlers see it without executing JS.

## What actually earns rich results today

- **Still shown**, where eligible: `Product`, `BreadcrumbList`, `Article`, `Event`, `VideoObject`, `Organization` (logo and knowledge panel), `LocalBusiness`, `ProfilePage`, `DiscussionForumPosting`, `SoftwareApplication`, and review snippets (genuine reviews only). Google's search gallery is the current list; check it before promising a feature.
- **Gone from Google Search**: **`FAQPage`** rich results (no longer shown from May 2026, documentation removed), **`HowTo`** (removed 2023) and the **sitelinks search box** (`WebSite` `SearchAction`, removed November 2024). The markup is harmless but earns nothing there.
- **Never self-author `aggregateRating`/`review`** on your own Product/Organization/LocalBusiness — self-serving reviews violate Google's guidelines. Only mark up genuine, user-generated ratings.

## Required vs recommended (durable types)

- **Organization** — no required properties; rec `name`, `url`, `logo` (at least 112×112px in a format Google Images supports — a raster is safest — crawlable and legible on white, `logos-and-icons`), `sameAs`, `contactPoint`.
- **WebSite** — `url`, `name` (the site name Google shows); no `SearchAction`.
- **Article / BlogPosting** — no required properties; rec `headline`, `image`, `datePublished`, `author`, `dateModified`, `publisher`, `description`, `mainEntityOfPage`.
- **Product** — req `name`, `image`, `offers` (`price` + `priceCurrency`); rec `availability`, `sku`, `brand`, and only-if-genuine `aggregateRating`/`review`. A merchant listing needs a price above zero.
- **SoftwareApplication** — for SaaS/app pages; req `name`, `offers.price`, and one of `aggregateRating` or `review` — genuine only, so a page without real ratings is never eligible for the rich result; rec `applicationCategory` (e.g. `BusinessApplication`), `operatingSystem` (e.g. `Web`).
- **BreadcrumbList** — req `itemListElement` (`position`, `name`, `item`). The rich result shows on desktop only.
- **LocalBusiness** — req `name`, `address`; rec `geo`, `openingHoursSpecification`, `telephone`, `priceRange`.
- **Event** — req `name`, `startDate`, `location`; rec `endDate`, `eventStatus`, `offers` (with `url` to the ticket page), `performer`, `organizer`, `image`. Eligible only for an event at a physical location, bookable by the general public (not members- or invitation-only), one event per page; the online-event properties were removed in 2025.

## Examples

Organization + WebSite as a connected graph (sitewide, in the root layout):

```ts
const ORG_ID = `${SITE.url}/#org`;

export function organizationSchema() {
  return { "@context": "https://schema.org", "@type": "Organization", "@id": ORG_ID,
    name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon-512.png`, // a raster on its plate, ≥112px
    sameAs: SITE.socials,
    contactPoint: { "@type": "ContactPoint", email: "hello@acme.com", contactType: "customer support" } };
}
export function websiteSchema() {
  return { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE.url}/#website`,
    url: SITE.url, name: SITE.name, publisher: { "@id": ORG_ID } };
}
```

Article:

```ts
export function articleSchema(post: Post) {
  return { "@context": "https://schema.org", "@type": "BlogPosting",
    headline: post.title, description: post.excerpt,
    image: new URL(post.cover, SITE.url).toString(),
    datePublished: post.publishedAt, dateModified: post.updatedAt ?? post.publishedAt,
    author: { "@type": "Person", name: post.author, url: `${SITE.url}/about` },
    publisher: { "@id": `${SITE.url}/#org` },
    mainEntityOfPage: new URL(post.path, SITE.url).toString() };
}
```

Product (offer, no self-serving rating):

```ts
export function productSchema(p: Product) {
  const url = new URL(`/shop/${p.slug}`, SITE.url).toString();
  return { "@context": "https://schema.org", "@type": "Product",
    name: p.name, description: p.summary,
    image: p.images.map((s) => new URL(s, SITE.url).toString()),
    brand: { "@type": "Brand", name: SITE.name }, url,
    offers: { "@type": "Offer", price: p.price, priceCurrency: "USD",
      availability: "https://schema.org/InStock", url } };
}
```

SoftwareApplication (SaaS/app pages — the product page of a web app):

```ts
export function softwareApplicationSchema() {
  return { "@context": "https://schema.org", "@type": "SoftwareApplication",
    name: SITE.name, applicationCategory: "BusinessApplication", operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
  // eligible for the rich result only with a genuine aggregateRating or review — never self-authored
}
```

FAQPage — structurally valid, but **no rich result in Google Search** any more; keep it only if another consumer uses it:

```ts
export function faqSchema(items: { q: string; a: string }[]) {
  return { "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a } })) };
}
```

### `@graph` note

Bundling all of a page's nodes in one `<script>` via `{"@context": "https://schema.org", "@graph": [node, node, …]}` is equivalent to passing an array of nodes (what `<JsonLd data={[…]}>` emits) — validators and most docs show the `@graph` form, so don't flag one as wrong when you see the other.

## Common errors

- Missing required properties; content mismatch (markup describes what isn't on the page).
- Relative image/URL values (must be absolute); non-ISO dates; wrong enum strings.
- Disconnected nodes (no `@id` links) — technically valid but weaker for entity understanding.
- Rendering JSON-LD only client-side (crawler may miss it); or via `next/head` + `dangerouslySetInnerHTML` (legacy — use a Server Component `<script>`).
