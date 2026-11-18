---
name: cookie-consent
description: >-
  Cookie and tracking consent for a web app — what needs consent (any storage or read on the device), equal-weight accept and reject on the first layer, granular categories off by default, nothing non-essential before consent, withdrawal as easy as giving it, a minimal record of each choice, re-asking on a revision, Global Privacy Control, Google Consent Mode in basic mode, accessibility, and the vanilla-cookieconsent v3 mechanics in a reference. Use when adding a banner, an analytics or marketing script, or a consent category.
---

# Cookie consent

Consent is the person's legal choice, not a widget the product owns. The standard below survives a change of library; the `vanilla-cookieconsent` v3 mechanics that implement it are in [references/vanilla-cookieconsent.md](references/vanilla-cookieconsent.md). This is engineering guidance for the ePrivacy and GDPR rules and the laws that copy them, not legal advice — which categories exist, how long things are kept and which places the product serves are the project's and its counsel's call.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## What needs consent

- **Storing or reading anything on the person's device** that isn't strictly necessary for what they asked for — not only cookies, but `localStorage`, IndexedDB, tracking pixels and device fingerprinting (ePrivacy Article 5(3)).
- **Legitimate interest can't cover it.** Storing or reading on the device rests on consent or strict necessity only — never the controller's legitimate interest (EDPB cookie banner taskforce).
- **Strictly necessary** is narrow: the session and its security, load balancing, a cart, the consent choice itself, a preference the person set. It's disclosed, never toggleable, and never stretched to cover analytics or advertising.
- **Analytics needs consent in the EU.** The UK, from February 2026, exempts first-party statistical analytics used only to improve the service, shared only with whoever helps with that, with clear information and a free, simple way to object (PECR Schedule A1). A few EU regulators exempt tightly limited audience measurement. Relying on any exemption is counsel's decision, recorded in the project's docs; the default banner asks.
- **Where the person is decides the law**: the EU and UK (GDPR with ePrivacy or PECR) and Nigeria's NDPA ask for consent that is freely given, specific, informed, unambiguous and as easy to withdraw as to give; several US states ask instead for an opt-out of sale and sharing. One opt-in banner for everyone is the default, plus what California adds for its residents: Global Privacy Control honoured as an opt-out that overrides an earlier choice, a visible "Opt-out request honoured", and no pop-up asked in response to the signal (CCPA regulations §7025).

## The banner

- **Three actions on the first layer, with equal weight**: Accept all, Reject all, and Manage choices. Same size, same style, same number of clicks — the house rule. Regulators judge colour and contrast case by case, but a Reject hidden in the settings or visibly weaker than Accept is what they find against.
- **Every non-essential category is off until chosen.** No pre-ticked boxes, and no consent inferred from scrolling or carrying on.
- **Categories are granular and plain**: each says what it's for, which providers use it and how long its data is kept. Strictly necessary shows as "Always on".
- **A banner, not a wall.** The page stays readable behind it; refusing never blocks the product.
- **Links to the privacy and cookie policies** sit on the first layer.

## Before and after the choice

- **Nothing non-essential runs before consent.** A first visit with a cleared profile makes no analytics or marketing request — check the network tab; a script that ran before its toggle was checked is the commonest failure.
- **Granting starts the provider's SDK; withdrawing stops it**: its cookies are deleted and its own opt-out is called, because deleting cookies doesn't stop an SDK already running in memory.
- **Embedded third parties** — a video, a map, a social post — set their own cookies, so they load only after consent: a click-to-load placeholder that names the provider until then.
- **Server-set cookies follow the same rule**: a non-essential cookie the server sets reads the stored choice first.
- **Withdrawal is one click from every page** — a "Cookie preferences" link in the footer that reopens the choices.
- **Consent is not a feature flag.** A flag is the operator's choice; consent is the person's, never defaulted on, never resolved for them, never overridden centrally.

## Records and re-asking

- **Each choice is recorded** so it can be shown later (GDPR Article 7(1)): a random consent id, the categories accepted and refused, the policy revision, and the time — sent to the API when the person chooses, with no IP address or account needed. The consent cookie on their device alone isn't a record the product holds.
- **A revision number** is part of the stored choice. Changing the categories, the providers or the policy bumps it, which treats every stored choice as absent and asks again.
- **Choices expire**: ask again after six months to a year (the library defaults to about six months), so consent doesn't outlive what the person remembers agreeing to.

## Signals from the browser and from Google

- **Global Privacy Control** (`navigator.globalPrivacyControl`) is honoured as a refusal of the categories that sell or share data, and in California it overrides an earlier choice that allowed them; the preferences say the signal was honoured. Some US states require it, and it costs nothing elsewhere.
- **Google tags use Consent Mode v2 in basic mode**: no Google tag loads before consent; the consent defaults are set first (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`, all `denied`) and updated when the person chooses; `functionality_storage`, `personalization_storage` and `security_storage` follow their categories, and `wait_for_update` gives the banner time to answer. Advanced mode loads the tags first and sends cookieless pings before consent — a different reading of "nothing before consent", so it's a recorded decision, never the default.
- **Analytics maps to `analytics_storage`; marketing to `ad_storage`, `ad_user_data` and `ad_personalization`.**

## Accessibility

The banner is a dialog on first paint: reachable by keyboard from the first Tab, announced to screen readers, with a visible focus ring on every control. The choices panel traps focus while open, closes on Esc and returns focus to what opened it. After theming, contrast holds in light and dark (text 4.5:1, controls 3:1). Full method `accessibility`.

## Theming and the CSP

- **The banner takes the design system's tokens** — the library's `--cc-*` variables mapped to semantic tokens, set again under the project's own dark-mode selector, so it follows the app's theme rather than the library's.
- **"Manage choices" is restyled to match** the two primary buttons — the library draws it as a secondary one.
- **Gated scripts still meet the CSP**: an inline gated tag runs only where the page's policy allows it — a nonce on a per-request app, `'unsafe-inline'` with Cache Components — and the providers' origins are in `connect-src` and `img-src`, where they matter (`frontend-security`).

## Do / Don't

- **Do** put Accept all, Reject all and Manage choices on the first layer with equal weight; keep non-essential categories off; run nothing non-essential before consent; stop SDKs on withdrawal; link the preferences from every footer; record each choice with its revision; re-ask on a revision; honour Global Privacy Control; use Consent Mode in basic mode.
- **Don't** pre-tick a category; hide Reject; call analytics strictly necessary; block the page until someone accepts; route consent through feature flags; load a Google tag before consent without a recorded decision; rebuild the banner without its dialog semantics.

## Related skills

The CSP, embeds and third-party scripts `frontend-security` · loading scripts and client boundaries `nextjs` · overlay accessibility `accessibility` · the shape of the consent-record route `api-architecture` · banner copy `copywriting` · shared components `reusables`.
