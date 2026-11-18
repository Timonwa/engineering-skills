# vanilla-cookieconsent v3

How the library implements the standard in `SKILL.md`. Check the installed version's docs before relying on a default.

## Contents

- [Setup](#setup)
- [The config](#the-config)
- [Gating scripts](#gating-scripts)
- [Reading consent in the app](#reading-consent-in-the-app)
- [Withdrawal and records](#withdrawal-and-records)
- [Example](#example)

## Setup

- **v3 is not v2.** `import * as CookieConsent from "vanilla-cookieconsent"` and `import "vanilla-cookieconsent/dist/cookieconsent.css"`, then `CookieConsent.run(config)`, which returns a promise. v2's `initCookieConsent()` and its config shape are gone.
- **Browser-only:** run it once from a client component's effect, or a dynamic import; it touches `document` and cookies (`nextjs`).

## The config

- **Defaults worth knowing:** `mode: "opt-in"` (keep it — `"opt-out"` isn't consent), `autoShow: true`, `manageScriptTags: true`, `autoClearCookies: true`, `hideFromBots: true` (it treats `navigator.webdriver` as a bot, so Playwright never sees the banner — set it `false` in end-to-end tests), `disablePageInteraction: false` (keep it — no consent wall), `respectGpc: false` (set it `true`; the option exists from v3.2, and a saved choice still wins over it, so California's override is the app's own check), cookie `cc_cookie` with `expiresAfterDays: 182`, `sameSite: "Lax"`, `secure: true`.
- **`guiOptions`:** `equalWeightButtons: true` on both modals — the default, and never turned off to demote Reject.
- **`categories`:** `necessary: { readOnly: true }`; every other category is a plain object, off under opt-in — never `enabled: true`. Each one that sets provider cookies has an `autoClear` list (names or patterns, `{ name: /^_ga/ }`) so withdrawal deletes them; `services` lets people toggle single providers inside a category.
- **`language.translations`:** the consent modal has both `acceptAllBtn` and `acceptNecessaryBtn` — leaving the second out removes Reject from the first layer — plus `showPreferencesBtn` and a `footer` linking the policies. `preferencesModal.sections` tie copy to toggles with `linkedCategory`.
- **`revision`:** `0` turns revisions off; start at `1` and bump on every change to the categories, providers or policy.

## Gating scripts

- **`<script type="text/plain" data-category="analytics">`** is inert until the category is granted; the library then swaps the type and runs it. Hiding UI gates nothing — a normal `<script>` has run before any state changes.
- **Attributes:** `data-src` for an external file, `data-service` to tie it to one provider's toggle, `data-type="module"`, and `data-category="!analytics"` for cleanup that runs when a category that was on is turned off — not on a first refusal. A tag runs at most once; anything dynamic uses the callbacks instead.
- **Callbacks:** `onConsent` runs on every load with valid consent (start the granted SDKs there); `onChange` runs when the person changes their mind (start the newly granted, call the opt-out of the withdrawn).
- **Google Consent Mode:** the default call (`gtag("consent", "default", { … all "denied" })`) runs before anything else; in basic mode the Google tag itself is a gated tag, and `gtag("consent", "update", …)` runs from the callbacks.

## Reading consent in the app

- **After `run()`:** `acceptedCategory(name)`, `acceptedService(name, category)`, `getUserPreferences()`, `validConsent()`, `getCookie()`.
- **Events fire on `window`** — `cc:onFirstConsent`, `cc:onConsent`, `cc:onChange` (with `changedCategories` and `changedServices`), `cc:onModalShow`, `cc:onModalReady`, `cc:onModalHide`. A listener on `document` never fires, and the UI keeps working while the app's state silently doesn't update.
- **One hook** (`useCookieConsent`) reads the accepted categories on mount and again on those events, returning `null` per category until the library has run, so "undecided" differs from "refused". Nothing else reads the cookie.

## Withdrawal and records

- **The footer trigger:** `<button type="button" data-cc="show-preferencesModal">Cookie preferences</button>`, or `CookieConsent.showPreferences()`.
- **Withdrawal deletes and stops:** `autoClearCookies` with each category's `autoClear`, plus the provider's opt-out in `onChange`; `reloadPage: true` in a category's `autoClear` only for a provider that can't be stopped otherwise.
- **`reset(true)`** erases the choice and the library's state; call `run()` again with the config to show the banner — for a "reset my choices" control and for testing the first visit. Scripts that already ran aren't detected afterwards.
- **Embeds** use the companion `iframemanager`, which holds an iframe behind a click-to-load placeholder until its category is granted.
- **The record:** the library has no logging of its own. In `onFirstConsent` and `onChange`, post the `consentId`, the accepted and rejected categories, the revision and the accept type to the API.

## Example

```ts
// lib/config/consent.ts — the app's one consent config; domains, providers and copy are the project's
import type { CookieConsentConfig, CookieValue } from "vanilla-cookieconsent";

export type GrantedCategories = { analytics: boolean; marketing: boolean };

// The app passes its SDK start and opt-out, so this module imports no provider.
export function buildConsentConfig(
  onGranted: (granted: GrantedCategories) => void,
  onRecord: (cookie: CookieValue) => void,
): CookieConsentConfig {
  const applyChoice = (cookie: CookieValue) =>
    onGranted({
      analytics: cookie.categories.includes("analytics"),
      marketing: cookie.categories.includes("marketing"),
    });

  return {
    revision: 1,
    respectGpc: true,
    cookie: { expiresAfterDays: 182 }, // set `domain` to the parent domain only if the choice must span subdomains
    guiOptions: {
      consentModal: { layout: "box", position: "bottom right", equalWeightButtons: true },
      preferencesModal: { layout: "box", position: "right", equalWeightButtons: true },
    },
    categories: {
      necessary: { readOnly: true },
      analytics: { autoClear: { cookies: [{ name: /^_ga/ }, { name: "_gid" }] } },
      marketing: { autoClear: { cookies: [{ name: /^_fbp/ }] } },
    },
    language: {
      default: "en",
      translations: {
        en: {
          consentModal: {
            title: "Cookies on this site",
            description: "…",
            acceptAllBtn: "Accept all",
            acceptNecessaryBtn: "Reject all",
            showPreferencesBtn: "Manage choices",
            footer: '<a href="/privacy">Privacy policy</a> <a href="/cookies">Cookie policy</a>',
          },
          preferencesModal: {
            title: "Cookie preferences",
            acceptAllBtn: "Accept all",
            acceptNecessaryBtn: "Reject all",
            savePreferencesBtn: "Save choices",
            closeIconLabel: "Close",
            sections: [
              { title: "Strictly necessary", description: "…", linkedCategory: "necessary" },
              { title: "Analytics", description: "…", linkedCategory: "analytics" },
              { title: "Marketing", description: "…", linkedCategory: "marketing" }, // every category has its own section, or Accept all grants what nobody was shown
            ],
          },
        },
      },
    },
    onFirstConsent: ({ cookie }) => onRecord(cookie),
    onConsent: ({ cookie }) => applyChoice(cookie),
    onChange: ({ cookie }) => {
      applyChoice(cookie);
      onRecord(cookie);
    },
  };
}
```

```html
<!-- inert until "analytics" is granted -->
<script type="text/plain" data-category="analytics" data-src="https://analytics.example.com/script.js"></script>
```
