---
name: security-audit
description: >-
  Manually invoked. Red-team application-security review across frontend and backend, mapped to the OWASP Top 10 2025 and API Top 10 — access control, SSRF, CSRF, headers and CSP, sessions with operator step-up, the trusted client IP, field encryption and keys, uploads and user files, injection and XSS, abuse cases, the audit trail, cookie consent, supply chain and fail-open handling — naming the domain audits for depth rather than repeating them.
argument-hint: "[phase] [path]"
model: opus
effort: high
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
---

# Security audit

**Run this only when the user asks for it by name. It writes a report and changes no code; fixing a finding is a separate request.**

A **manually-invoked, red-team security audit** of an app or a specific diff/PR. It is **self-contained** — every check is spelled out inline, so it runs a full review with zero other skills installed — and each finding is verified against the real code before it lands in a phase-aware, scored report at `_reports/security-audit.md`.

> **Self-contained** — this checklist is comprehensive on its own and needs no other skill installed. Where the house skills **`backend-security`**, **`frontend-security`**, **`field-encryption`**, **`image-handling`**, **`audit-log`** and **`cookie-consent`** are installed, they are the fix target for what this finds; rules files themselves → **`firebase-security-rules-auditor`**.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[phase]` — `development` | `production`; sets the action-item tiers. Omitted → the audit phase the project's `AGENTS.md` records, else `production` (assume the app is live until told otherwise).
- `[path]` — a file, directory, or PR/diff to scope the audit to; omitted → the whole repo.

## Audit protocol

**Mindset — reviewer/attacker first.** Don't assume code is fine because it looks careful; find the sequence that breaks it. Report only findings you can justify as real, each verified before it lands.

### Method

1. **Resolve phase** — the phase arg if given; else the audit phase in `AGENTS.md`; else `production`, so a CRITICAL finding gets Fix-Now urgency instead of a pre-launch discount.
2. **Load the previous report** — if `_reports/security-audit.md` exists, read it, but still run every check against the source. Use it only to keep the ID of each finding still present (status `UNRESOLVED`), carry its `WON'T FIX` findings forward unchanged — never re-raised as new findings — drop its `FIXED` findings and any no longer present, continue ID numbering from its highest ID, and take its scores for the score-change row. First run → mark all `NEW`.
3. **Run the checklist** (below), collecting findings with `file:line` evidence.
4. **Verify** each candidate — construct the concrete failure/abuse case; drop what you can't show is real; mark uncertain ones "needs confirmation" rather than inflating. Drop one the project records as a deviation, with its reason, in `AGENTS.md` or a doc it links.
5. **Write the report** to `_reports/security-audit.md` — overwriting the whole file, so no resolved history accumulates — and post the **chat summary** (see Output). Recommend fixes in the report; never modify code. Never commit or push without explicit approval.

### Severity

- **CRITICAL** — actively exploitable or broken now: data loss/leak, security breach, or total failure of the audited concern. Fix immediately.
- **HIGH** — a serious defect that will bite in production or blocks launch. Fix before shipping.
- **MEDIUM** — a real issue with a workaround or limited blast radius. Schedule it.
- **LOW** — minor, polish, or defense-in-depth.

Findings are ordered worst-first in the report.

### Report format

Write to `_reports/security-audit.md` in the format in [references/report-format.md](references/report-format.md): the header line, the score change with its one Overall row, the findings table with its status legend and one section per finding, the scorecard and phase-tiered action items.

### Output

Every run produces two things:

- **Full report** → `_reports/security-audit.md`, in the format above, overwriting the prior run.
- **Chat summary** → a short recap posted in chat: the overall `<X>/10` (with Δ vs last run), a severity count (Critical / High / Medium / Low, i.e. C / H / M / L), the top findings worst-first (id · severity · one-line · `file:line`), and the report path. Note any "needs confirmation" items.

**Report-only** — this audit recommends fixes in the report; it never modifies code.

## Checklist

Run the **backend** blocks for server and API code and the **frontend** blocks for browser code, each mapped to the OWASP Top 10 2025 and the API Security Top 10 2023. This audit is the umbrella: it checks each risk at the level of "is the control there and does it hold", and where a domain audit is installed, it names that audit for the depth instead of repeating it — `access-control-audit` (every guard and verb), `api-audit` (route discipline), `env-audit` (env and secrets), `dependency-audit` (packages and advisories), `firestore-audit` and `redis-audit` (data-layer rules and failure directions). A domain that isn't installed gets its row checked here in full.

### Backend

**A01 Broken Access Control · API1 · API3 · API5**

- **Object, function and field level** — changing an id never reaches another account's record (404 before 403); every route and Server Action asserts its permission server-side, not just a session; writes take an allowlist and reads a projection, never a whole document.
- **Tenant scoping** on every list and lookup; ownership from the record, the actor from the verified token.
- **A second id in the body** (a target, a parent) is authorised too, not only the one in the path.
- **SSRF (A01 · API7)** — user-supplied URLs allowlisted, every resolved address checked (no private, loopback, link-local or metadata addresses), no redirects followed.
- **CSRF (A01)** — cookie-authenticated mutations checked in the proxy: `Origin` on the allowlist (falling back to `Referer`), and `Sec-Fetch-Site: cross-site` refused; responses that vary on them send `Vary`. A `GET` never changes state. A Server Action authorises and validates on its own, like any `POST`, and `experimental.serverActions.allowedOrigins` names only a known proxy.

**A02 · API8 Security Misconfiguration**

- CORS pinned to the tier's origins, never `*`; debug and local-only routes absent on deployed tiers. Absolute URLs (an email's link, a redirect) come from configured origins, never `Host` or `X-Forwarded-Host`.
- App Check enforced on the Firebase products clients call, and an API route that wants it verifies `X-Firebase-AppCheck`. The web API key restricted to its APIs and domains and per tier — needs confirmation, a console setting.

**A04 Cryptographic Failures**

- TLS everywhere; secrets compared in constant time (`timingSafeEqual`, both sides hashed first), never `===`; every token from a secure random source.
- **Field encryption** (OWASP Cryptographic Storage Cheat Sheet; NIST SP 800-38D) — a field that must be read back is encrypted in the service with AES-256-GCM through the runtime's crypto: a fresh random 12-byte nonce made inside the encrypt function, never passed in; `authTagLength: 16` on decipher; a versioned format naming the key (`v1:…`); the record's collection, id and field bound as associated data, so a ciphertext copied elsewhere fails. Decrypt fails closed with a generic error and never returns the stored bytes.
- **Keys** — one per store and one per purpose: the field key never signs tokens or cookies or keys a blind index. 32 random bytes, shape-checked at boot, kept in the secret manager, away from the data. Rotation works before it's needed — decrypt picks the key by version, the backfill checks the value is unchanged — and a retired key stays archived while any backup holds its ciphertext; whether the runbook exists needs confirmation.
- **What's encrypted, hashed or plain** — a value only ever verified is hashed, a low-entropy one HMACed with its own key; neither ciphertext nor a blind index reaches a list or public projection; an update returns the plaintext the caller sent, not the ciphertext it wrote.

**A05 Injection**

- A schema at every boundary — body, query, params, form data; no string-built queries, no user input in shell commands or file paths (path traversal), no operator objects from input reaching a NoSQL query; no user-controlled regex, and no regex open to catastrophic backtracking (ReDoS); stored rich HTML sanitised on the server against one policy.

**A06 Insecure Design · API6 · API4**

- Each sensitive flow has its abuse case designed in — budgets per tier (per IP and per account, the IP read from your own proxy's hops, IPv6 by /64), lockouts on credentials and secrets that fail closed; body and decompressed-size caps, page caps and timeouts; every check-then-act that matters atomic — money, stock, coupons, seats — and a public API's `Idempotency-Key` replaying the stored response.

**A07 Authentication Failures · API2**

- Sessions only the API mints, in an `httpOnly`, `Secure`, `SameSite` cookie named `__Host-` or `__Secure-`; an absolute session cap; sign-out ending the session on the server; passwords to NIST length with a breach check and no composition rules; generic answers that don't reveal which addresses have accounts. Tokens verified with their algorithm, issuer and audience pinned.
- **Operators** — a second factor, a separate cookie, an absolute cap of a day and an idle timeout of an hour or less, and step-up for granting roles, moving money or exporting data.

**A08 Software or Data Integrity Failures**

- Webhooks verified on the raw body with a timestamp window, recorded once; scheduled routes behind the scheduler's verified identity; no unsafe deserialisation.

**Uploads and user files (A01 · A05 · A06)** — OWASP File Upload Cheat Sheet

- **The type comes from the bytes** (`file-type`) checked against an allowlist, never the client's `contentType` or the extension, and the real type is stored as the object's `contentType`. The caps live in one module that the browser check, the server check and the storage rules all read; the server assumes the browser check never ran.
- **Images are decoded within a pixel limit** (`sharp`'s `limitInputPixels`) and re-encoded before they're served; orientation is applied, then EXIF stripped, GPS never kept. A user's SVG is never served as an image — rasterised or refused.
- **Objects are named by record id**, never the user's filename; a direct-to-storage upload writes only to a path the API reserved, with the storage rules matching the record and its declared size.
- **The bucket is chosen by who may read**: public display images and private files never share a bucket under uniform access. A private file is read only through a signed link minted right after the access check, in the same request — minutes long, never stored, `Content-Disposition: attachment` on a download.
- **User files are served from the storage domain**, never the app's origin; a delete removes the file before the record, so no bytes outlive it. Derivatives and caching are `performance-audit`'s.

**A09 Security Logging and Alerting Failures**

- Privileged acts in an append-only audit log; other refusals in the security log with actor, method, path and IP; personal data only in those access-controlled logs, with a retention period. That spikes in 429s, lockouts and refusals alert someone needs confirmation — it lives in monitoring config. Secrets in logs and URLs are `env-audit`'s.
- **The audit trail holds as evidence** (OWASP Logging Cheat Sheet) — which mutations write an entry is `api-audit`'s; here, what the entry is worth. Each holds an action from one typed list, the result (refusals and failed step-ups included), the scope, the actor's kind and id with their email copied in (and both people when an operator acts as a customer), the target with before and after for the fields that matter, and the IP, user agent, request id and server time in UTC — never a secret, token or password.
- **Written so it's never lost and never fails the request** — one helper, after the response with `after()` and retries, a final failure logged and alerted; inside the change's transaction where both must exist. A dangling promise or an audit write that can fail the request is a finding.
- **Append-only and tamper-evident** — no update or delete path, clients denied by the rules, entries copied to write-once storage or hash-chained. Retention runs on a policy and a TTL; deleting a user leaves their entries; each scope is read only by its own readers, and reading or exporting the log is itself audited.

**A10 Mishandling of Exceptional Conditions**

- No catch that grants access; generic error bodies with stable codes and a correlation id, no stack traces, queries or paths outside local.

**API9 · API10**

- Versioned routes with the API reference as the inventory; every upstream response validated, time-boxed and rate-limited.

### Frontend

**XSS (A05)**

- `dangerouslySetInnerHTML` only through one sanitising component sharing the server's policy, with named props sanitised against DOM clobbering; user links checked against the shared URL schema (`http`/`https`); no `eval`, `new Function` or string `setTimeout`; untrusted values kept out of `style`, spread props and non-React sinks (`location`, `router.push`, `window.open`, `innerHTML`, `insertAdjacentHTML`, `document.write`); JSON-LD escapes `<`; an uploaded SVG is never inlined.

**Headers and CSP (A02)**

- Every app sends the baseline: `Strict-Transport-Security` (`max-age=63072000; includeSubDomains`), `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` unless the app is built to be embedded and names its ancestors, `Permissions-Policy`, `Cross-Origin-Opener-Policy` (allowing popups where sign-in needs them), `Cross-Origin-Resource-Policy`, `Cache-Control: no-store` on signed-in responses, no `X-Powered-By`, and `X-XSS-Protection` absent or `0`. (Owned here; other audits point to it.)
- A CSP with `default-src`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors` (`'none'`, or the named ancestors of an embeddable app), `form-action`, `upgrade-insecure-requests`, and explicit `connect-src`, `img-src` and `frame-src` lists; a reporting endpoint (`Reporting-Endpoints` with a `report-uri` fallback). `'unsafe-eval'` only on the local tier, branched on `APP_ENV`, never `NODE_ENV`. Under Cache Components, `script-src 'unsafe-inline'` recorded as a known gap is not a finding; a per-request app uses the nonce route, with the proxy skipping prefetches. Trusted Types stays report-only until its prerequisites are in place. Whether the policy went report-only before enforcement needs confirmation.

**Cross-window and embeds**

- `postMessage` sends to a named target origin, never `"*"`, and receiving checks the origin and validates the payload; `target="_blank"` links carry `rel="noopener noreferrer"`; embeds sandboxed, with `allow-scripts` and `allow-same-origin` together only for cross-origin documents.

**Secrets, tokens and navigation (A04)**

- No secret in the bundle (`NEXT_PUBLIC_*` secrets are `env-audit`'s); no auth token in `localStorage` or `sessionStorage`; no service worker caching signed-in responses; `credentials: "include"` only to your own origins, never `mode: "no-cors"` to dodge CORS; no PII in URLs or analytics; no production source maps; `?redirect=` followed only for a path on this site; sign-out sends `Clear-Site-Data`.

**Cookie consent** — privacy, not an OWASP category: ePrivacy Article 5(3), GDPR, the EDPB cookie banner taskforce and Nigeria's NDPA

- **Accept all, Reject all and Manage choices on the first layer, with equal weight** — the same size, style and number of clicks; no category pre-ticked; no consent inferred from scrolling; no legitimate interest claimed for anything stored on the device.
- **Nothing non-essential stored or read before consent** — cookies, `localStorage`, pixels, embeds (a click-to-load placeholder until then); a non-essential cookie the server sets reads the choice first. Analytics and tag-manager gating is `seo-aeo-geo-audit`'s; whether a first visit with a cleared profile makes no non-essential request needs confirmation in a browser.
- **Withdrawing is as easy as giving** — a preferences link in every footer reopens the choices; withdrawing deletes the provider's cookies and calls its own opt-out. Consent is never routed through feature flags.
- **Each choice is recorded through the API** — a random consent id, the categories, the policy revision and the time, with no IP or account needed; a revision bump asks again, and a choice expires within a year. Global Privacy Control is honoured; Google tags run Consent Mode in basic mode unless advanced is a recorded decision. The banner's dialog semantics are `accessibility-audit`'s.

**Supply chain (A03)**

- SRI on fixed-content CDN files. Action pins, scanners, advisories and build-script allowlists are `dependency-audit`'s — run it.

## Fixing what it found

Fixing is a separate request, after the report is written, and covers only the findings the owner chose. Then **update the report in place — never re-run the audit to update it**: a re-run re-checks the whole codebase, costs a full audit and raises new findings mid-fix. Mark each fixed finding `FIXED` with its commit and a one-line note of what changed, mark a finding the owner rules out `WON'T FIX` with their reason, and leave everything else as it stands. Recompute the scorecard categories the fixes touched and the Overall, and rewrite the one score-change row (previous → current) — never add a second row.

## Boundaries

- **Report-only** — this audit recommends fixes in the report; it never modifies code.
- **Verify each finding is real** — construct the concrete case; drop what you can't show; mark uncertain ones "needs confirmation" rather than inflating.
- **Suggest fixes using the repo's existing helpers** — but only where those helpers themselves conform to the standard; when the repo's own convention is the violation, the suggestion is the standard, not a tidier copy of the drift.
- **Never commit or push without explicit approval.**
