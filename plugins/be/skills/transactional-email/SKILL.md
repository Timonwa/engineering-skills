---
name: transactional-email
description: >-
  Sending email from a Next.js API — transactional and marketing mail on separate providers and domains, a sender per purpose, SPF, DKIM and aligned DMARC, sends that never throw into the caller, one claim per message, per-recipient budgets, retries through a queue, bounce and complaint suppression, one-click unsubscribe where it's required, escaped input and header values, HTML that survives mail clients with a plain-text part, link scanners, local previews, and per-tier audiences. Use when adding or changing an email the app sends.
---

# Transactional email

The API sends every email the product owes someone — a receipt, a sign-in link, an alert — through the project's own provider, from code that can be tested and previewed. A send never decides whether the work that caused it succeeds, never reaches an address that bounced or complained, and never goes twice. What the email says is `emails`'; this skill is how it gets there.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Two kinds of mail

- **Transactional** — triggered by something the person did or that happened to their account: receipts, sign-in and reset links, security alerts, invitations. Sent without consent, because they asked for it.
- **Marketing and subscribed** — newsletters, onboarding series, digests someone opted into. Sent only with consent, and every one carries an unsubscribe.
- **Separate providers, or at least separate streams and subdomains** (`mail.` for transactional, `news.` for marketing), so a marketing campaign's complaints never sink a receipt or a sign-in link into spam.
- **A sender per purpose** — security, receipts, team, support — each its own address, display name and, where the provider allows, its own stream and API token. A reply-to that a person reads, on anything someone might answer.

## Getting delivered

From [Gmail's sender guidelines](https://support.google.com/a/answer/81126) and [Yahoo's](https://senders.yahooinc.com/best-practices/), which most providers follow:

- **SPF and DKIM on every sending domain**, with keys of at least 1024 bits (2048 where the provider supports it), and **DMARC published**, aligned with the From domain — `p=none` with reports (`rua`) to start, moving to `quarantine` once the reports are clean.
- **Valid forward and reverse DNS** and TLS — a provider handles both; check it does.
- **Spam rate under 0.3%**, and under 0.1% recommended, in Google Postmaster Tools. Above that, mail gets throttled or refused.
- **The provider's domain checks pass on every tier** before that tier sends anything real; a tier that only sends tests uses the provider's sandbox or a test domain.

## Sending

- **One client per provider**, in the server's `clients/` kind, with its tokens from env (`env`); **one service per email**, building the subject, the HTML, the text and the headers, and calling the client.
- **A send never throws into the work that caused it.** A failed receipt must not undo the order. The client logs the failure (type, sender, recipient count — never the address or the body) and returns `false`.
- **An email that could reveal whether an account exists** — a reset link, a verification resend — is queued and answered with the same generic success, in the same time, whether or not the address has an account (`auth`, OWASP). Only a send every address gets, like a sign-in link that also creates the account, may report its failure (503) so the person can try again.
- **One claim per message**, keyed by the type, the recipient and the event that caused it (`claim:email:order-receipt:<orderId>`), so a retried request or a redelivered webhook doesn't send twice; released if the send fails (`redis`). Where the provider takes an idempotency key, the claim key goes with the send, so a retried timeout can't deliver twice either.
- **Per-recipient budgets** on everything a caller can make the API send to an address — sign-in links, resets, invitations — however many IPs ask (`rate-limiting`).
- **Retry the transient only:** a timeout, a 5xx or a 429 retries with backoff and jitter, honouring `Retry-After`; a 4xx is a bug or a bad address and isn't retried. Bulk sends — a broadcast, a digest — go through a queue at the provider's rate, never a loop in a request.
- **Never send to a suppressed address** (below), and never to a tier's real users from local or test code: a non-production tier sends only to an allowlist, or to the provider's sandbox.

## Bounces and complaints

- **The provider's webhooks report bounces and complaints**; the API receives them like any webhook (verified, recorded once — `api-architecture`) and keeps a suppression list.
- **A hard bounce** suppresses the address for everything; **a complaint** (the person marked it as spam) suppresses it for everything but the transactional mail they'd be locked out without. **Soft bounces** suppress only after repeats.
- **The suppression list is checked before every send**, and the account shows the person when mail to them stopped, with a way to fix the address.

## Unsubscribe

- **Marketing and subscribed mail carries one-click unsubscribe** ([RFC 8058](https://www.rfc-editor.org/rfc/rfc8058)): a `List-Unsubscribe` header with one HTTPS URI, `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, and both headers covered by the DKIM signature — plus a visible unsubscribe link in the body. Gmail and Yahoo require it of bulk senders.
- **The URI identifies the recipient and the list on its own**, with a signed token, because the POST carries no cookie or login. The endpoint answers the POST without a page and never with a redirect, and a `GET` to the same URI shows a confirmation page — it never unsubscribes on a `GET`, which scanners send.
- **Honour it at once**, and within two days at most.
- **Transactional mail doesn't take it**; a notification someone can turn off in settings is subscribed mail, and does.

## Building the email

- **Every user value is HTML-escaped** in the template — names, event titles, messages relayed between people — and a link built from user input is an `http(s)` URL checked with the safe URL schema (`schemas-and-contracts`).
- **Layout tables carry `role="presentation"`**, and the HTML stays under about 100 KB — Gmail clips longer messages, unsubscribe link and all.
- **Header values are stripped of line breaks** — a subject or display name containing `\r\n` can inject headers.
- **HTML that survives mail clients:** a table layout about 600 px wide, inline styles, live text rather than images of text, `alt` on every meaningful image, `lang` on the root, and buttons made of text. Accessibility checks are `accessibility`'s.
- **A plain-text part** beside the HTML (`multipart/alternative`), generated from the same content.
- **A preheader** — the hidden first line inboxes show beside the subject — set on purpose, or the inbox fills it with the first text it finds.
- **Images are PNG or JPEG on absolute HTTPS URLs**, with `width` and `height`; no SVG, which major clients don't render. Logos sit on a solid plate, never an added outline, so they show on light and dark backgrounds (`logos-and-icons`).
- **A palette that survives dark mode:** clients invert colours on their own, so avoid pure black on white, test both, and declare `color-scheme` for the clients that honour it.
- **No tracking pixel or rewritten links on security and auth mail.** Link rewriting can expose a sign-in token to a third party and break single-use links.

## Links

- **Auth links are generated by the API** (`generateSignInWithEmailLink` and its siblings) and sent through the project's provider, never the auth provider's templates (`auth`).
- **Every link points at the tier that sent it**, built from the per-tier constants, never hard-coded.
- **Link scanners open links before people do.** A link that acts — confirms, unsubscribes, accepts — opens a page whose button does the action, so a scanner's `GET` changes nothing and a single-use token survives.

## Previews and tests

- **A local preview route** renders every email with fixture data, in light and dark mode, and answers 404 on every deployed tier.
- **A test per email** renders it and checks the subject, the escaping of a hostile value, the text part, and the unsubscribe headers where they belong; the provider is mocked at `fetch` (`testing`).
- **A real send to an inbox** happens only with the owner's say-so, to an address they name.

## Marketing audiences

- **Audience and group ids are per-tier constants** (`env`), so development never adds people to production's lists. A person joins an audience only after confirming their address (a confirmation email), and the app keeps the proof of consent — when, where and to what they agreed; the provider's unsubscribe and suppression records show only who left.
- **Marketing mail carries the sender's postal address**, as anti-spam law requires (CAN-SPAM in the US).
- **A new sending domain or subdomain is warmed up**, its volume raised gradually over weeks, and recipients who never engage are dropped from the list.
- **Adding someone to an audience never throws**, like a send.

## Do / Don't

- **Do** separate transactional from marketing mail; give each purpose its sender; publish SPF, DKIM and DMARC; log and return on a failed send; claim each message; budget per recipient; queue bulk sends; suppress bounces and complaints; add one-click unsubscribe to subscribed mail; escape every user value; send a text part; preview light and dark.
- **Don't** let a failed email fail the work behind it; reveal through a send failure whether an address has an account; send twice for one event; retry a 4xx; send from local code to real users; unsubscribe on a `GET`; use SVG images; track opens or rewrite links on security mail; hard-code a link's origin.

## Related skills

Auth links and which emails auth sends `auth` · per-recipient budgets `rate-limiting` · claims `redis` · provider webhooks `api-architecture` · tokens and per-tier constants `env` · the safe URL schema `schemas-and-contracts` · the fetch mock `testing` · email accessibility `accessibility` · what the email says `emails` · its voice `copywriting`.
