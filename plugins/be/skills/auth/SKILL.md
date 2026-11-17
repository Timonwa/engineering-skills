---
name: auth
description: >-
  Authentication with Firebase Auth and Next.js — sign-in on the client, an httpOnly session cookie only the API mints, server-first password sign-in behind a lockout, account linking, auth email the API sends itself, password rules and breached-credential checks, optional customer MFA, session lifetimes and renewal, sign-out that ends the session on the server, operator sessions with a second factor, API keys, and where the check sits in a Next.js app. Use when building or reviewing sign-in, sessions, sign-out, auth email or a signed-in gate.
---

# Auth

Firebase Auth proves who someone is; the API turns that proof into a session and checks it on every request. The browser signs in with the Firebase web SDK, trades the fresh ID token for an httpOnly session cookie the API mints, and from then on every server read and action carries that cookie. The client SDK's own state never decides who is signed in: a Server Component can't see it, and a token held in JavaScript is readable by any script on the page.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Signing in

- **The client SDK runs the provider's flow** — Google, an emailed link, a verification or reset link — through the auth hooks of `@timonwa/firebase-hooks/auth`; the project's own composites wrap them in its hooks package. Client persistence is off (`inMemoryPersistence`), and once the cookie is set the SDK signs out — Firebase's own pattern, so the cookie is the only session.
- **Password sign-in is server-first.** The browser posts the email and password to the API, which runs the lockout (`rate-limiting`), checks the password through Identity Toolkit, and answers a custom token the client signs in with. Signing in with the password in the browser skips the lockout, the alerts and the audit entry.
- **Creating an account with a password is server-first too**: the API creates the user, then the client signs in. Google and an emailed link create the account the first time they're used, when the session is established — the API writes the account record for a Firebase user that has none.
- **The ID token becomes a session only through the API**, which accepts a token from a sign-in in the last five minutes (`auth_time`), refuses older ones with 401, and sets the cookie. The session route is a mutation, so the proxy's origin check covers it against CSRF (`backend-security`).
- **Every answer is generic.** A wrong password, an unknown address, a locked or a disabled account read the same, with the same status and timing; a reset request answers "if that address has an account, we've sent a link" either way. An identifier-first page that answers differently for known and unknown addresses is enumeration by design — a project that wants it records the trade-off and keeps the step behind the auth rate-limit tier.
- **A `?redirect=` is followed only when it's a path on this site** (`safeRedirectPath` from `@timonwa/app-utilities`); anything else is an open redirect.

## One account per person

- **One account per email address**, whichever way someone signs in. Signing in with a provider for an address that already has an account fails with `auth/account-exists-with-different-credential`: answer by asking them to sign in the way they did before, then link the new provider to that account (`linkWithCredential`) — never create a second account.
- **Pre-hijacking:** someone can register a password account with another person's address before they ever arrive. An unverified account never gains a linked provider. Firebase removes an unverified password when a trusted provider (Google for its own addresses) signs in to the same email; anything else needs the email verified before linking.

The flow-by-flow table — which layer drives each, and the Identity Toolkit calls the Admin SDK lacks — is [references/flows.md](references/flows.md).

## Auth email

**The API sends every auth email** — verification, its resend, password reset, the sign-in link — through the project's own email provider, never the Firebase client or Firebase's templates. The Admin SDK generates each link (`generateEmailVerificationLink`, `generatePasswordResetLink`, `generateSignInWithEmailLink`) and the API points it at the app that asked, so the send is rate-limited, the answer never reveals whether an address is known, and the mail matches the product (`transactional-email`).

**Email verification is a wall.** The API refuses an unverified account (403) on every route except the few it needs to finish verifying, kept as an allowlist with a test; every signed-in gate redirects it to the verify page. Opening the link calls the session refresh so the cookie's `email_verified` changes.

## Passwords

From NIST SP 800-63B and OWASP:

- **At least 15 characters when the password is the only factor**, 8 when it's one of two; allow at least 64, every character including spaces and Unicode, and never truncate.
- **No composition rules** (no "one uppercase, one symbol") and **no scheduled changes** — a change is forced only on evidence of compromise.
- **Check each new password against a breached-password list** (Have I Been Pwned's range API sends only a hash prefix); refuse a match. **Check again at sign-in**: a password that has since appeared in a breach signs in, then must be changed before anything else, because reused breached passwords are what credential-stuffing tries.
- **Changing the password or the email needs the current password** (or a fresh sign-in), and emails the owner — the old address, for an email change — with a way to report it.
- Firebase's password policy enforces the length; the API enforces the rest, because it's the only path that sets a password.

## The session cookie

- **Minted, cleared and parsed only in the API's session service.** One place knows the attributes, so no app drifts from them.
- **Attributes:** `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, a `Max-Age` equal to the session's life. **Name it `__Host-…` with no `Domain`** when one origin uses it; when it must span the product's subdomains, set `Domain` to the tier's parent domain and name it `__Secure-…`. Local development on `localhost` keeps both, since Chrome and Firefox treat it as secure. (Classic Firebase Hosting forwards only a cookie named `__session`; App Hosting has no such limit.)
- **Lifetime:** a cookie of a few days (Firebase allows five minutes to two weeks), renewed while the person is active — on page open or focus, once it's at least a set age — and **never past an absolute cap** from the sign-in it descends from, at most 30 days (NIST AAL1). The original sign-in time rides on each re-minted cookie as a claim, so a refresh can't stretch it.
- **Re-mint after anything that changes a claim** — verification, a role, a plan held in claims. The cookie keeps the claims it was minted with; the session refresh route re-mints it from the account as it stands (a custom token carrying the session's start time, exchanged for a new cookie).
- **A device cookie** — a random id, long-lived, surviving sign-out — lets the API recognise a device it has seen, and email the owner when a sign-in comes from one it hasn't.

## Ending sessions

- **The sign-out response sends `Clear-Site-Data: "cache", "storage"`**, so the browser drops cached pages and stored data from the session; not `"cookies"`, which would also clear the device cookie.
- **Signing out ends the session on the server**, not only in the browser: a cleared Firebase cookie stays valid until it expires. Give each session its own id — a claim on the custom token it's minted from — and a record in the store; verification checks the record, signing out deletes it, and the account's security page lists the sessions and ends any one of them. A project without session records revokes the account's refresh tokens on sign-out instead, which ends every device.
- **"Sign out everywhere"** revokes the refresh tokens (`revokeRefreshTokens`) and deletes every session record; verification passes `checkRevoked: true`, so every cookie minted before is refused.
- **Revoke every other session** when the password changes, the account is recovered, or a role is taken away, and **disable and revoke** when an account is suspended.

## Customer second factors

- **Offer every account an optional second factor** — TOTP, or a passkey where the provider supports it — with backup codes, the same rules as operators below. Accounts that move money (payouts, refunds) are prompted to turn it on.
- **Turning it off needs the second factor or a fresh sign-in**, and emails the owner, like a password change.

## Operator sessions

The admin panel is a higher assurance level (NIST AAL2):

- **A second factor is required** — TOTP or a passkey, with single-use hashed backup codes; a used TOTP step is remembered so a code can't be replayed, and repeated wrong codes lock the factor for a while.
- **A separate cookie**, minted only after the second factor and read only by the admin routes, which never accept the customer cookie. Operator powers count only on a token carrying the claim the second factor's custom token sets, so a password-only sign-in holds none.
- **Short lifetimes:** an absolute cap no longer than 24 hours (12 is common) and an idle timeout no longer than an hour (15–30 minutes is common), the idle clock renewed on every request and kept server-side (`redis`); an unreachable clock is a 401.
- **Step-up for the most sensitive actions** — granting roles, moving money, exporting data — asks for the second factor again when the last one is older than a few minutes.

## On the API

- **One `requireSession` guard** accepts a `Bearer` ID token or the session cookie, verifies with revocation checked, refuses an unverified email outside the allowlist, and returns the token and the actor. Guards for permissions build on it (`access-control`).
- **Identity comes from the verified token** (`token.uid`), never from a body, query or header.
- **Only the auth routes set or clear the cookie**, each through the shared builder.

## API keys

For a public API, customers create keys for their own scripts and integrations; what a key may do is `access-control`'s.

- **Generated by the API** — 32 random bytes, with a readable prefix naming the product and tier (`<product>_live_…`, `<product>_test_…`) and a short checksum at the end, so secret scanners and people can recognise one and a scanner can tell a real key from a lookalike without calling the API. A public product registers the format with GitHub's secret-scanning partner programme, so a leaked key is reported to it.
- **Shown once, stored as a hash** (SHA-256 is enough for a random key) with its prefix, last four characters, name, scopes, creator, created, last used and expiry — never the key itself.
- **Sent as `Authorization: Bearer <key>`**, never in a URL, and accepted only on the routes that take keys; a key never mints a session.
- **Revocable at once, and rotatable** — a new key works beside the old one until the old is revoked. Issuing and revoking are audited and emailed to the account's owners.
- Keys for each tier are separate; a test key never works on the live tier.

## In the Next.js app

Next.js's own rule: the real check sits beside the data, because layouts don't re-render on navigation and don't stop their child segments rendering. Here the data is the API, which checks every request — so the app's checks are for the experience:

- **Each signed-in route group's layout resolves the user behind `<Suspense>`** and redirects a signed-out, unverified or unfinished account before the shell renders. Never at the root layout: it would hold every page, including public ones, behind a request.
- **A page read that gets a 401 redirects to sign-in**, so a session that ends mid-visit lands on sign-in, not the error page; a mutation's 401 stays a message on its form.
- **The current user is one server helper** (`getCurrentUser`, with `requireAuth` and `requireGuest` beside it) that sends the cookie to the API's profile route. It's cached with `"use cache: private"` and a tag, which every profile change and sign-in or out expires (`nextjs`). The helper never imports `firebase-admin`.
- **Client state is the server's user**, passed from the gate through a session provider; roles come from it, not from SDK claims. The SDK holds no session after the exchange.
- **The proxy may check that the cookie exists**, never that it's valid; verification needs the API.

## Do / Don't

- **Do** sign in through the API for passwords; keep one account per email and link providers to it; offer customers a second factor; store API keys only as hashes; mint the cookie only in the API; answer every credential failure the same; send auth mail from the API; check new passwords against breaches; end sessions on the server; cap a session's total life; require a second factor for operators; gate each route group's layout behind `<Suspense>`; take identity from the token.
- **Don't** persist auth in the client SDK; trust an ID token older than five minutes for a new session; reveal whether an address has an account without recording the trade-off; impose composition rules or scheduled password changes; clear a cookie and call it signed out; let a refresh stretch a session past its cap; read the session in the root layout; keep the SDK signed in after the cookie is set.

## Related skills

Permissions `access-control` · lockout and auth rate tiers `rate-limiting` · the route around the guard `api-architecture` · CSRF and server threats `backend-security` · the idle clock `redis` · auth email delivery `transactional-email` · caching the current user `nextjs` · the sign-in UI `react`.
