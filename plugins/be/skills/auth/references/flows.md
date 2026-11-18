# Auth flows

Which layer drives each flow, and the calls behind it. The Identity Toolkit REST API (`identitytoolkit.googleapis.com/v1`, keyed by the public web API key) covers what the Admin SDK can't: checking a password, exchanging a custom token, applying a reset code. Map its error codes (`INVALID_LOGIN_CREDENTIALS`, `EXPIRED_OOB_CODE`, …) to the client SDK's `auth/*` codes, so one message catalogue serves every path.

## Contents

- [Sign-in and sessions](#sign-in-and-sessions)
- [Auth email](#auth-email)
- [Account changes](#account-changes)
- [The cookie](#the-cookie)
- [Session records](#session-records)
- [Troubleshooting](#troubleshooting)

## Sign-in and sessions

| Flow                 | Driver           | How                                                                                                                                                                       |
| -------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Password sign-in     | API, then client | API: lockout → REST `accounts:signInWithPassword` → `createCustomToken(uid, { sessionId, sessionStartedAt })`. Client: `signInWithCustomToken` → ID token → session route |
| Create account       | API, then client | API: `createUser({ email, password })` and the account record, then the same custom-token sign-in                                                                         |
| Google, emailed link | Client           | `signInWithPopup` / `signInWithEmailLink` → ID token → session route, which writes the account record the first time                                                      |
| Session create       | API              | `verifyIdToken` → `auth_time` within five minutes → `createSessionCookie(idToken, { expiresIn })` → `Set-Cookie`; client then `signOut()`                                 |
| Session verify       | API              | `verifySessionCookie(cookie, true)`, or `verifyIdToken(token, true)` for a `Bearer` header, then the session record                                                       |
| Session refresh      | API              | `createCustomToken` carrying the original `sessionId` and `sessionStartedAt` → REST `accounts:signInWithCustomToken` → `createSessionCookie`                              |
| Operator second step | API, then client | Password → a short-lived encrypted ticket → the ticket and a TOTP or backup code → a custom token with the operator claim → the admin session route                       |

## Auth email

| Flow               | Driver           | How                                                                                                                                                                                                       |
| ------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verification       | API              | `generateEmailVerificationLink(email, actionCodeSettings)` → the project's email provider                                                                                                                 |
| Verification apply | Client, then API | `applyActionCode(oobCode)` → the session refresh route, if this device has a cookie                                                                                                                       |
| Sign-in link       | API, then client | `generateSignInWithEmailLink` → email; the client completes with `signInWithEmailLink`                                                                                                                    |
| Password reset     | API              | `generatePasswordResetLink` → email (the same answer for unknown addresses); the form posts the code and new password to the API, which checks the password rules and calls REST `accounts:resetPassword` |

`actionCodeSettings.url` points at the app that asked, so the link opens that app's email-action page (`?mode=verifyEmail|resetPassword|signIn&oobCode=…`), and the Firebase console's action URL is never read.

## Account changes

| Flow            | Driver | How                                                                                                                                               |
| --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Password change | API    | Lockout → REST `accounts:signInWithPassword` with the current password → rules check → `updateUser({ password })` → revoke other sessions → alert |
| Email change    | API    | Current password → `generateVerifyAndChangeEmailLink(oldEmail, newEmail)` sent to the new address, and a notice to the old one                    |
| Suspension      | API    | `updateUser({ disabled: true })` → `revokeRefreshTokens(uid)` → audit                                                                             |

## The cookie

```ts
// The API's session service — the only place that builds it.
const SESSION_COOKIE = env.cookieDomain ? "__Secure-session" : "__Host-session";

function buildSessionCookie(value: string, maxAgeSeconds: number) {
  return serialize(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: true, // Chrome and Firefox accept it on localhost
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
    domain: env.cookieDomain, // the tier's parent domain, or unset for one origin
  });
}
```

Firebase's `createSessionCookie` takes `expiresIn` in milliseconds; `Max-Age` is in seconds.

## Session records

One document (or key) per session, written by the session route:

- **id** (the `sessionId` claim), **uid**, **started at**, **last seen**, the **device id**, and a readable device label from the user agent;
- verification loads it after `verifySessionCookie` and refuses a missing one with 401;
- sign-out deletes this one; "sign out everywhere" deletes the account's and revokes refresh tokens;
- it expires with the session's absolute cap, by TTL.

The read costs one lookup per request. A cache in front of it must be cleared by the delete, or a signed-out session keeps working until the cache expires.

## Troubleshooting

- **The server sees the user, the client shows them signed out** — the gate isn't passing the server's user to the session provider, or the cookie name the session service reads differs from the one the session route writes.
- **A redirect loop on a signed-in page** — the cookie expired, its `Domain` doesn't cover the current host, or the cached current user wasn't expired after sign-in, so the gate still sees the old answer.
- **A role or verification change doesn't show** — the claims ride on the cookie, so call the session refresh route, then `router.refresh()`; refreshing the client SDK's token alone changes nothing the server reads.
- **Every server read fails on one machine only** — the API's origin doesn't resolve from inside the Next server (a container, a proxy), even though the browser reaches it.
