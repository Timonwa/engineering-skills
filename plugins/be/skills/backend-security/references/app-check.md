# App Check

App Check attests that a request comes from your real app, not a script holding your public web config. It complements Auth and the rules; it never replaces them.

- **Enforce it in production** on every Firebase product the client calls directly (Auth, Storage, Firestore where clients read, Functions, AI Logic). Turn on monitoring first, watch the share of verified requests, then enforce.
- **Highest value** where an anonymous call costs money: AI Logic (a billing spike) and phone sign-in (SMS fraud).
- **Web provider: reCAPTCHA Enterprise.** Initialise it only in the browser, with automatic token refresh on.

```ts
if (typeof window !== "undefined") {
  initializeAppCheck(getFirebaseApp(), {
    provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), // public; a per-tier constant
    isTokenAutoRefreshEnabled: true,
  });
}
```

- **The API's own routes** aren't covered by enforcement; a route that wants it verifies the `X-Firebase-AppCheck` header with the Admin SDK's `appCheck().verifyToken()`.
- **Local development** uses a debug token registered in the console, never enforcement turned off on a deployed tier.
