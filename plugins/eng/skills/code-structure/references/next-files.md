# Next.js files

The files Next.js reads by name, where each sits, and what the house puts in it. Everything else in an app lives outside `app/`.

## Contents

- [Route files](#route-files)
- [Metadata files](#metadata-files)
- [Beside app/](#beside-app)
- [Overlays with their own URL](#overlays-with-their-own-url)
- [Entry files](#entry-files)

## Route files

| File               | Where                         | Holds                                                                                                                                                                 |
| ------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page.tsx`         | its segment                   | the import and render of a `…PageContent`, and at most a guard                                                                                                        |
| `layout.tsx`       | its segment or group          | a shell from `ui/layouts/` with this app's regions as props                                                                                                           |
| `template.tsx`     | its segment                   | a wrapper that remounts on every navigation, for an enter animation or an effect that must rerun per page; a `layout.tsx` otherwise                                   |
| `loading.tsx`      | its segment                   | the segment's skeleton                                                                                                                                                |
| `error.tsx`        | its segment                   | a Client Component rendering the view from `components/errors/`; it doesn't catch the `layout.tsx` beside it                                                          |
| `not-found.tsx`    | its segment, or `app/`        | the view from `components/errors/`                                                                                                                                    |
| `global-error.tsx` | `app/` only                   | the last boundary, for errors in the root layout; it replaces that layout, so it renders its own `<html>` and `<body>` and imports the global styles and fonts itself |
| `default.tsx`      | each parallel slot            | what a slot shows when a full page load can't recover its state — usually `null`; a missing one is an error for a named slot and a 404 for `children`                 |
| `route.ts`         | its segment, never a page one | a route handler; one segment holds a `page.tsx` or a `route.ts`, never both. How it's written is `api-architecture`'s                                                 |

## Metadata files

`opengraph-image`, `twitter-image`, `icon`, `apple-icon`, `favicon.ico`, `sitemap`, `robots` and `manifest` are also read by name, from `app/` or a segment. A generated one (`.tsx`, `.ts`) builds its content from `lib/`; what goes in it is `seo`'s and `logos-and-icons`'.

## Beside app/

- **`src/proxy.ts`** — the request proxy.
- **`src/instrumentation.ts`** — `register()` runs once when the server starts (tracing, a monitoring SDK) and `onRequestError` reports every server error to the error tracker.
- **`public/`**, at the app's root rather than in `src/` — files served as they are from the site root. A file Next generates from `app/` (`robots`, `sitemap`, `favicon.ico`) never also sits here.

## Overlays with their own URL

A drawer, dialog or tab that only needs to survive a reload or be shared keeps its state in a search param (`?drawer=invite`). One that is also a page in its own right — a photo, an event's details — is a **parallel slot plus an intercepting route**, so a click opens it over the list and a reload or a shared link opens the full page:

```txt
app/(dashboard)/photos/
  layout.tsx                 renders {children} and {modal}
  page.tsx                   the list
  [photoId]/page.tsx         the full page
  @modal/
    default.tsx              returns null
    (.)[photoId]/page.tsx    the same content in a dialog
```

Closing the dialog is `router.back()`. The slot's pages are thin entries like any other; the dialog and the full page render the same section from `components/`.

## Entry files

```tsx
// app/(marketing)/about/page.tsx — a page must default-export
import { AboutPageContent } from "@/components/marketing/about";

export default function AboutPage() {
  return <AboutPageContent />;
}
```

```tsx
// app/(marketing)/layout.tsx — a layout is a thin entry too
import { NAV_ITEMS } from "@/lib/constants";
import { MarketingLayout } from "@/ui/layouts";

export default function MarketingRouteLayout({ children }: { children: React.ReactNode }) {
  return <MarketingLayout nav={NAV_ITEMS}>{children}</MarketingLayout>;
}
```
