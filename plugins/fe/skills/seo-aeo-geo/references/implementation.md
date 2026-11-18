# The implementation — code behind `SKILL.md`

The house helpers for a Next.js App Router app. Names and values are examples; the project's own come from `AGENTS.md`.

## Contents

- [Site config](#site-config)
- [The metadata factory](#the-metadata-factory)
- [The root layout](#the-root-layout)
- [Catalogs and dynamic pages](#catalogs-and-dynamic-pages)
- [The OG image route](#the-og-image-route)
- [JSON-LD](#json-ld)
- [robots.ts](#robotsts)
- [sitemap.ts](#sitemapts)
- [Headers for apps that are never indexed](#headers-for-apps-that-are-never-indexed)
- [hreflang](#hreflang)
- [llms.txt](#llmstxt)

## Site config

One object per app, built from per-tier constants (`env`), so every URL helper reads one source:

```ts
// lib/config/site.ts
export const SITE = {
  name: "Acme",
  url: SITE_ORIGINS[env.APP_ENV].web, // no trailing slash
  description: "…",
  twitter: "@acme",
  socials: ["https://github.com/acme", "https://www.linkedin.com/company/acme"], // → `sameAs`
  isIndexable: env.APP_ENV === "production", // false for every app that is never indexed, on every tier
} as const;
```

## The metadata factory

One builder per app, from a shared function that takes the app's config. A page's canonical is set **only when it passes its own path** — a default would point every page that forgets it at the home page.

```ts
// lib/seo/metadata.ts
type PageMetadataInput = {
  title?: string;
  description?: string;
  path?: string; // the page's own path; its canonical and og:url
  image?: { url: string; alt: string };
  isNoIndex?: boolean;
  type?: "website" | "article";
};

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const description = input.description ?? SITE.description;
  const image = input.image ?? { url: buildOgImageUrl({ title: input.title ?? SITE.name }), alt: input.title ?? SITE.name };
  const isIndexable = SITE.isIndexable && !input.isNoIndex;

  return {
    ...(input.title !== undefined && { title: input.title }), // never spread `title: undefined` over the template
    description,
    ...(input.path !== undefined && { alternates: { canonical: input.path } }),
    robots: isIndexable
      ? { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
      : { index: false, follow: false },
    // openGraph and twitter replace the parent's whole object, so each is built complete here
    openGraph: {
      type: input.type ?? "website",
      siteName: SITE.name,
      ...(input.path !== undefined && { url: input.path }),
      ...(input.title !== undefined && { title: input.title }),
      description,
      images: [{ ...image, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", site: SITE.twitter, ...(input.title !== undefined && { title: input.title }), description, images: [image] },
  };
}
```

## The root layout

`metadataBase` resolves every relative URL above; without it a relative URL is a build error. The root sets the title template and no canonical:

```ts
// app/layout.tsx
export const metadata: Metadata = {
  ...buildPageMetadata({}),
  metadataBase: new URL(SITE.url),
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
};
```

## Catalogs and dynamic pages

Titles and descriptions live in typed catalogs keyed by page, split into indexable and not:

```ts
// lib/seo/catalog.ts
type SeoEntry = { title: string; description: string; ogSubtitle?: string };

export const PUBLIC_SEO = {
  pricing: { title: "Pricing", description: "…", ogSubtitle: "Plans and pricing" },
} as const satisfies Record<string, SeoEntry>;

export const NOINDEX_SEO = {
  notFound: { title: "Not found", description: "…" },
} as const satisfies Record<string, SeoEntry>;

// app/(marketing)/pricing/page.tsx
export const metadata = buildPageMetadata({ ...PUBLIC_SEO.pricing, path: ROUTES.pricing });
```

A dynamic page passes real data, and follows the record's state:

```ts
export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchPublicEvent(slug);
  if (!event) return buildPageMetadata({ ...NOINDEX_SEO.notFound, isNoIndex: true }); // the page itself calls notFound()
  return buildPageMetadata({
    title: event.title,
    description: truncate(event.summary, 160),
    path: ROUTES.events.detail(slug),
    image: { url: buildOgImageUrl({ title: event.title, photoUrl: event.coverUrl }), alt: event.title },
    isNoIndex: event.visibility !== "public",
  });
}
```

## The OG image route

The card is generated, and a page's photo goes **inside** it. The route validates its query, takes photos only from the project's own image origins, and is allowed in `robots.txt`, because the crawlers that fetch cards obey it.

```ts
// lib/seo/og-image.ts — absolute, because feeds and JSON-LD can't use relative URLs
export function buildOgImageUrl(input: { title: string; subtitle?: string; photoUrl?: string | null }): string {
  const query = new URLSearchParams({ title: input.title });
  if (input.subtitle) query.set("subtitle", input.subtitle);
  if (input.photoUrl) query.set("photo", input.photoUrl);
  return `${SITE.url}/api/og?${query}`;
}
```

```tsx
// app/api/og/route.tsx
const OgQuerySchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(160).optional(),
  photo: z.httpUrl().refine((url) => OG_PHOTO_ORIGINS.includes(new URL(url).origin)).optional(), // never an arbitrary URL
});

export async function GET(request: Request) {
  const parsed = OgQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  const card = parsed.success ? parsed.data : { title: SITE.name };
  const font = await readFile(join(process.cwd(), "assets/fonts/Display-SemiBold.ttf")); // ttf, otf or woff — never woff2
  return new ImageResponse(<OgCard {...card} />, {
    width: 1200,
    height: 630,
    fonts: [{ name: "Display", data: font, weight: 600 }],
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
  });
}
```

A static page can instead use an `opengraph-image.tsx` file beside it; the rules are the same (`code-structure`'s `references/next-files.md`).

## JSON-LD

One XSS-safe component, rendered from a Server Component so crawlers see it without running JavaScript:

```tsx
export function JsonLd({ data }: { data: object | object[] }) {
  // escape < (script breakout), & (entity ambiguity), and U+2028/U+2029 (invalid raw in a script)
  const json = JSON.stringify(data)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
```

The schema builders are in [structured-data.md](structured-data.md).

## robots.ts

Google honours `user-agent`, `allow`, `disallow` and `sitemap` only; `host` and `crawl-delay` are ignored.

```ts
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  if (!SITE.isIndexable) return { rules: { userAgent: "*", disallow: "/" } }; // a linked URL can still be listed, so non-production tiers also sit behind auth
  return {
    rules: { userAgent: "*", allow: ["/", "/api/og"], disallow: ["/api/"] }, // the more specific allow wins for /api/og
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
```

## sitemap.ts

Only canonical, indexable URLs that answer 200, each with its real last change. Google ignores `priority` and `changeFrequency`; a file holds at most 50,000 URLs or 50 MB, so a large site splits with `generateSitemaps()` — whose `id` argument is a promise from Next 16, awaited before use.

```ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await fetchIndexableEvents(); // public and published only
  return [
    { url: `${SITE.url}${ROUTES.home}`, lastModified: STATIC_PAGES_UPDATED_AT },
    ...events.map((event) => ({ url: `${SITE.url}${ROUTES.events.detail(event.slug)}`, lastModified: event.updatedAt })),
  ];
}
```

## Headers for apps that are never indexed

A dashboard, an admin panel and an API send `X-Robots-Tag` on every response, which covers what metadata can't — JSON, files, redirects:

```js
// next.config — next.config can't import the env guard, so it reads APP_ENV directly
const NEVER_INDEXED = false; // true for a dashboard, an admin panel or an API

async headers() {
  const isIndexable = !NEVER_INDEXED && process.env.APP_ENV === "production";
  if (isIndexable) return [];
  return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
}
```

## hreflang

A multi-locale page lists every locale and an `x-default`, with a self-canonical per locale:

```ts
alternates: {
  canonical: `/${locale}${path}`,
  languages: { ...Object.fromEntries(LOCALES.map((l) => [l, `/${l}${path}`])), "x-default": `/${DEFAULT_LOCALE}${path}` },
}
```

## llms.txt

Optional. Google says it doesn't use these files; some AI tools and agents read them. Built from the same catalog, so it can't drift:

```ts
// app/llms.txt/route.ts
export function GET() {
  const lines = [`# ${SITE.name}`, "", `> ${SITE.description}`, "", "## Pages", ""];
  for (const [key, entry] of Object.entries(PUBLIC_SEO)) lines.push(`- [${entry.title}](${SITE.url}${ROUTES_BY_SEO_KEY[key]}): ${entry.description}`);
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
```
