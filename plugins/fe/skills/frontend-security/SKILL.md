---
name: frontend-security
description: >-
  Browser-side security for React and Next.js apps, mapped to OWASP — XSS and safe rendering with one sanitiser policy shared with the server, the security headers every app sends from its own config, a Content Security Policy and how strict it can be with Cache Components, Trusted Types, framing and postMessage, third-party scripts and SRI, secrets and tokens in the client, open redirects, and the other client pitfalls. Use when building or reviewing frontend code, a page's headers, or a third-party script.
---

# Frontend security

Everything shipped to the browser can be read and edited: the source, every public value, the state in memory, every network call. So the client never enforces anything — the server re-decides it all (`backend-security`) — and nothing sensitive lives there. What the client does own is not running someone else's code: escaping and sanitising what it renders, and sending headers that tell the browser what it may run, frame and fetch.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The OWASP slice that runs in the browser

- **A05 Injection → XSS**, the main browser risk: safe rendering and the CSP below.
- **A02 Security Misconfiguration**: missing headers, a CSP full of `unsafe-*`, production source maps, verbose client errors.
- **A03 Software Supply Chain Failures**: npm packages and third-party scripts running with the page's privileges (SRI and third parties below; dependency gates are `devops`').
- **A01 Broken Access Control** is enforced on the server; the client's only duty is never to rely on its own checks.

## XSS and safe rendering

- **Let React escape.** Interpolated text is escaped, and React 19 turns a `javascript:` URL in `href`, `src`, `action` or `formAction` into one that does nothing. The danger is where React doesn't reach — `data:` and other schemes, `style`, spread props from untrusted objects, `dangerouslySetInnerHTML`, and sinks outside React (`location`, `router.push`, `window.open`).
- **HTML is rendered only through one sanitising component** (DOMPurify), the only place `dangerouslySetInnerHTML` appears. It reads the same policy the server applies when it saves rich text — `RICH_TEXT_POLICY` from the shared contracts: tags, attributes per tag and URL schemes (`backend-security`): the server is the authority, and the client sanitises again because what it renders may not have come through that save.
- **Know the DOM sinks** — `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, string `setTimeout`/`setInterval`, `on…` attributes, assignments to `location`, `href` or `src`. No untrusted input reaches them, and `eval` and `new Function` aren't used at all.
- **A user-supplied link is `z.httpUrl()`** — `http:` and `https:` only (`schemas-and-contracts`); `mailto:` and `tel:` appear only in links the app builds itself. `javascript:`, `data:`, `blob:` and `vbscript:` never pass.
- **Every source is untrusted** — search params, route params, `location`, `document.referrer`, `postMessage` data, API responses, and pasted or dropped HTML (`getData("text/html")`).
- **Server rendering doesn't sanitise.** Data a Server Component puts into a hand-built HTML string is as dangerous as any other; render through JSX, and sanitise any HTML string wherever it renders.
- **DOM clobbering:** sanitised HTML can still carry `id` and `name` values that shadow globals — keep DOMPurify's `SANITIZE_DOM` on, add `SANITIZE_NAMED_PROPS`, and never look up user HTML by name.
- **JSON-LD** goes through `seo-aeo-geo`'s component, which escapes `<` so a value can't close the script tag.

## Security headers

**Each app sends the same baseline on every response, from its own `next.config` `headers()`, matched on `/:path*`.** The block is written out in each app and changed in all of them in the same change, so no app drifts; an app adds only what's its own (`X-Robots-Tag`, `seo-aeo-geo`).

| Header                         | Value                                                                      | Why                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Strict-Transport-Security`    | `max-age=63072000; includeSubDomains` (`preload` once decided)             | HTTPS only, for two years; preloading commits every subdomain, so it's a decision     |
| `X-Content-Type-Options`       | `nosniff`                                                                  | a response is never sniffed into a script                                             |
| `Referrer-Policy`              | `strict-origin-when-cross-origin`, or stricter                             | paths and queries don't leak to other sites                                           |
| `X-Frame-Options`              | `DENY`                                                                     | for browsers without `frame-ancestors`                                                |
| `Permissions-Policy`           | every unused feature off (`camera=(), microphone=(), geolocation=()`)      | an app grants a feature only for the page that uses it; an injected script can use it |
| `Cross-Origin-Opener-Policy`   | `same-origin-allow-popups` where sign-in opens a popup, else `same-origin` | another window can't hold a reference to the page                                     |
| `Cross-Origin-Resource-Policy` | `same-site`                                                                | another site can't embed the app's responses                                          |
| `Content-Security-Policy`      | below                                                                      | what the page may run, load and connect to                                            |

- **Signed-in responses send `Cache-Control: no-store`**, so a shared or back-button cache never holds them.
- **`X-XSS-Protection` is not sent** (or sent as `0`): the old filter it controlled caused vulnerabilities of its own. **`poweredByHeader: false`** removes `X-Powered-By`.
- **Check each tier** with Mozilla Observatory after a header change.

## Content Security Policy

A CSP tells the browser what a page may run, load and connect to, so script that slipped through doesn't run. How strict the script part can be depends on how the app renders:

- **With Cache Components (the house model, `nextjs`), a strict script policy isn't available yet.** A nonce needs the request's headers, which a static shell doesn't have (Next.js: Partial Prerendering is incompatible with nonces); a hash through `experimental.sri` covers external scripts but not Next's inline flight scripts, so a strict `script-src` blocks hydration (vercel/next.js#95354). Such an app sends every other directive strictly and `script-src 'self' 'unsafe-inline'`, recorded as a known gap and reviewed when Next supports a strict policy with Cache Components.
- **An app that renders every page per request, without Cache Components,** can use a nonce: `proxy.ts` makes one per request, sets it in the header and in `x-nonce`, and the layout reads `x-nonce` from `headers()` and passes it to every `<Script nonce>`. The cost is that nothing is static or cached at the CDN.

Either way:

- **Directives:** `default-src 'self'`; `object-src 'none'`; `base-uri 'none'`; `form-action 'self'`; `frame-ancestors 'none'` unless the app is meant to be embedded; `upgrade-insecure-requests`; and explicit lists for `connect-src`, `img-src` and `frame-src` — the API, the image CDN, and Firebase Auth (`identitytoolkit.googleapis.com` and `securetoken.googleapis.com` in `connect-src`, the auth domain in `frame-src` for the sign-in popup). A loose `connect-src` lets injected script send data anywhere.
- **`'unsafe-eval'` never ships.** Local development needs it for React's error overlay, and `style-src 'unsafe-inline'`; branch on the local tier (`APP_ENV`), never `NODE_ENV` (`env`). Server-rendered `style="…"` attributes need `style-src-attr 'unsafe-inline'` in production too, a far smaller risk than script; record it when used.
- **Roll out as `Content-Security-Policy-Report-Only`**, reporting through `Reporting-Endpoints` and `report-to`, plus `report-uri` for browsers that lack `report-to`; enforce once the reports are clean, and keep reporting after.
- **The proxy skips prefetch requests** (the `missing` matcher on `next-router-prefetch` and `purpose: prefetch`), so a nonce isn't minted for them.
- **Trusted Types** (`require-trusted-types-for 'script'`) turn every DOM sink into a checked operation, and every major browser supports it. It stays report-only until everything that writes to a sink has a policy: React 19.3 or later, the sanitiser returning TrustedHTML (DOMPurify's `RETURN_TRUSTED_TYPE`, policy `dompurify`), Next's runtime, and libraries such as the consent banner, which writes `innerHTML` without one.

The headers block, both CSP setups and the sanitiser are in [references/frontend-hardening.md](references/frontend-hardening.md).

## Framing and messages

- **Framing is denied** (`frame-ancestors 'none'` and `X-Frame-Options: DENY`) unless the app is built to be embedded. Then only named ancestors are allowed, and `X-Frame-Options` is left out: it can't name an origin, and a browser that ignores `frame-ancestors` would block the embed.
- **`postMessage`:** every received message checks `event.origin` against an allowlist and parses the payload with a schema before acting; every sent message names its target origin, never `"*"`.
- **Third-party embeds sit in a sandboxed iframe** with only the permissions they need. `allow-scripts` with `allow-same-origin` undoes the sandbox only for a document from your own origin — never give both to one — while a cross-origin embed (a video, a map) often needs both and can't reach your origin. Embeds that set cookies load only after consent (`cookie-consent`).

## Third-party scripts

- **Every third-party script runs with the page's privileges** — it can read the DOM, the form fields and any readable cookie. Keep few, self-host where possible, and isolate risky ones in a sandboxed iframe.
- **Analytics and marketing scripts load only after consent** (`cookie-consent`), and their origins are named in the CSP.
- **SRI (`integrity` and `crossorigin`) on every fixed, versioned file from a CDN**, so a changed file fails to load instead of running. Scripts whose content changes by design — Google's tags — can't take SRI; they load only after consent, from origins named in the CSP.
- **Prune the bundle:** an unused dependency is attack surface and supply-chain risk for nothing.

## Secrets and tokens in the client

- **Nothing secret ships.** A public variable and anything in the bundle is readable; per-tier public facts are constants (`env`), and a key that must be in the client (a public analytics or maps key) is safe to expose and restricted by origin at its provider.
- **The session is an httpOnly, Secure, SameSite cookie** the API sets (`auth`): script can't read it, so XSS can't steal it. No token goes in `localStorage` or `sessionStorage`; a short-lived token the client SDK needs lives in memory only.
- **No personal data or tokens** in URLs, `localStorage`, analytics payloads, `console` or devtools-visible state; production source maps aren't served publicly; a service worker never caches signed-in responses.

## Other pitfalls

- **Open redirects:** a `?redirect=` is followed only when it's a same-origin path (`safeRedirectPath`, `auth`).
- **Sign-out** clears what the browser kept with `Clear-Site-Data` (`auth`).
- **`target="_blank"`** links carry `rel="noopener noreferrer"`.
- **Prototype pollution:** untrusted JSON never goes through a deep merge that follows `__proto__` or `constructor`.
- **CSRF** is stopped on the server (`backend-security`); the client sends requests same-origin, never defeats `SameSite`, and treats a Server Action as a public endpoint like any route.
- **Uploads:** browser checks are for the person; previews use `URL.createObjectURL` and revoke it; an uploaded SVG is never rendered inline (`image-handling`).
- **CORS:** never paper over it with `mode: "no-cors"`; `credentials: "include"` goes only to the product's own origins.

## Do / Don't

- **Do** let React escape; sanitise HTML in one component with the server's allowlist; check every user URL's scheme; send the header baseline from every app, changed together; send every CSP directive strictly and record the script gap under Cache Components; roll out in report-only; check `postMessage` origins; sandbox embeds; SRI on CDN files; keep the session in an httpOnly cookie.
- **Don't** rely on client checks; pass raw HTML to a sink; ship `unsafe-eval`; use the hash route with an App Router app (it blocks hydration); set a nonce CSP without knowing it makes every page dynamic; grant a permission an app doesn't use; store a token in web storage; ship a secret in a public variable; `postMessage` to `"*"`; follow an unchecked redirect; load a tracking script before consent.

## Related skills

**This skill sets the rules and never writes an audit report.** An audit of this area is `/security-audit`, written from its own template. Run it rather than writing a report from here.

Server-side threats, CSRF and Server Actions `backend-security` · the session cookie `auth` · public values and tiers `env` · the safe URL schema `schemas-and-contracts` · consent before scripts `cookie-consent` · proxy and rendering `nextjs` · indexing headers `seo-aeo-geo` · uploads `image-handling` · dependency gates `devops` · a full review `security-audit`.
