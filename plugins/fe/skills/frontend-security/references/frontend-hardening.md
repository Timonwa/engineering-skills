# Frontend hardening — patterns

The headers block, the two CSP setups and the client-side guards behind `SKILL.md`.

## Contents

- [The headers block](#the-headers-block)
- [CSP with Cache Components](#csp-with-cache-components)
- [CSP by nonce](#csp-by-nonce)
- [The sanitising component](#the-sanitising-component)
- [Origin-checked postMessage](#origin-checked-postmessage)
- [Sandboxed embed](#sandboxed-embed)
- [SRI on a CDN file](#sri-on-a-cdn-file)

## The headers block

Written out in every app's `next.config.ts`, and changed in all of them together:

```ts
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }, // add preload once decided
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }, // grant per app, per need
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }, // same-origin where nothing opens a sign-in popup
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};
```

## CSP with Cache Components

In `next.config.ts`, beside the headers block. Every directive is strict except `script-src`, which needs `'unsafe-inline'` until Next supports a strict policy with Cache Components (vercel/next.js#89754, #95354) — record it as a known gap.

```ts
const isLocal = APP_ENV === "local"; // never NODE_ENV

const CONTENT_SECURITY_POLICY = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isLocal ? " 'unsafe-eval'" : ""}`, // the recorded gap
  `style-src 'self'${isLocal ? " 'unsafe-inline'" : ""}`,
  `style-src-attr 'unsafe-inline'`, // only if server-rendered style="" attributes are used
  `img-src 'self' blob: data: https://<image-cdn>`,
  `connect-src 'self' https://<api-origin> https://identitytoolkit.googleapis.com https://securetoken.googleapis.com`,
  `frame-src https://<auth-domain>`, // Firebase Auth's sign-in popup
  `font-src 'self'`,
  `object-src 'none'`,
  `base-uri 'none'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
  `report-to csp`,
  `report-uri https://<report-endpoint>`, // for browsers without report-to
].join("; ");

// in headers(): first as Content-Security-Policy-Report-Only, then Content-Security-Policy
// { key: "Content-Security-Policy-Report-Only", value: CONTENT_SECURITY_POLICY },
// { key: "Reporting-Endpoints", value: `csp="https://<report-endpoint>"` },
```

## CSP by nonce

For an app that renders every page per request, without Cache Components. In the app's `proxy.ts`:

```ts
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isLocal = APP_ENV === "local"; // React's error overlay needs eval locally; never NODE_ENV

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isLocal ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isLocal ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    `img-src 'self' blob: data: https://<image-cdn>`,
    `connect-src 'self' https://<api-origin> https://identitytoolkit.googleapis.com https://securetoken.googleapis.com`,
    `frame-src https://<auth-domain>`,
    `font-src 'self'`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
    `report-to csp`,
    `report-uri https://<report-endpoint>`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp); // Next reads the nonce from here while rendering

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy-Report-Only", csp); // switch to Content-Security-Policy once reports are clean
  response.headers.set("Reporting-Endpoints", `csp="https://<report-endpoint>"`);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
```

Next puts the nonce on its own scripts; every `<Script>` you add takes it explicitly:

```tsx
import { headers } from "next/headers";
import Script from "next/script";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="https://<provider>/script.js" strategy="afterInteractive" nonce={nonce} />
      </body>
    </html>
  );
}
```

## The sanitising component

The only place `dangerouslySetInnerHTML` appears. It reads `RICH_TEXT_POLICY` from the shared contracts — the policy the server applies on save — so the tags, the attributes per tag and the URL schemes match.

```tsx
import DOMPurify from "isomorphic-dompurify";
import { RICH_TEXT_POLICY } from "@org/contracts"; // { allowedTags, allowedAttributes: { a: ["href", "title", "rel"] }, allowedSchemes: ["http", "https"] }

const ALLOWED_URI = new RegExp(`^(?:${RICH_TEXT_POLICY.allowedSchemes.join("|")}):`, "i");

DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
  const allowed = RICH_TEXT_POLICY.allowedAttributes[node.nodeName.toLowerCase()] ?? [];
  if (!allowed.includes(data.attrName)) data.keepAttr = false; // attributes are allowed per tag, as on the server
});

type SafeHtmlProps = { html: string; className?: string };

export function SafeHtml({ html, className }: SafeHtmlProps) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: RICH_TEXT_POLICY.allowedTags,
    ALLOWED_URI_REGEXP: ALLOWED_URI, // DOMPurify's default also lets tel:, sms:, ftp: and others through
    SANITIZE_NAMED_PROPS: true,
  });
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

Under Trusted Types, the same call passes `RETURN_TRUSTED_TYPE: true` so the sink receives TrustedHTML.

## Origin-checked postMessage

```ts
const ALLOWED_ORIGINS = new Set(["https://widget.example.com"]);

window.addEventListener("message", (event) => {
  if (!ALLOWED_ORIGINS.has(event.origin)) return;
  const parsed = WidgetMessageSchema.safeParse(event.data);
  if (!parsed.success) return;
  handleWidgetMessage(parsed.data);
});

iframeRef.current?.contentWindow?.postMessage(payload, "https://widget.example.com"); // never "*"
```

## Sandboxed embed

```tsx
<iframe
  src="https://third-party.example.com/widget"
  sandbox="allow-scripts allow-forms" // a same-origin document never gets allow-scripts with allow-same-origin
  referrerPolicy="no-referrer"
  title="Third-party widget"
/>
```

## SRI on a CDN file

```html
<script src="https://cdn.example.com/lib@1.2.3/lib.min.js" integrity="sha384-<hash>" crossorigin="anonymous"></script>
```

Pin the version and regenerate the hash on every upgrade; self-hosting avoids the question. Files that change by design, such as Google's tags, can't take SRI.
