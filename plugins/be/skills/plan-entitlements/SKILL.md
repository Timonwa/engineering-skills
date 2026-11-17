---
name: plan-entitlements
description: >-
  What an account's plan lets it use, kept apart from permissions — one entitlements map of features and limits instead of plan-name checks, the check order after permission, distinct error codes for "upgrade" versus "you can't", plan changes applied from the payment provider's webhooks, usage limits reserved in the work's transaction, trials, grace periods, downgrades over a limit, add-ons and credits, caching, the upgrade path in the UI, and tests. Use when gating a feature or a limit by plan, or changing plans.
---

# Plan entitlements

Access control answers "may this person do this?"; entitlements answer "does this account's plan include it?". They're separate checks with separate answers, so the person who can't act sees nothing to press, and the account that hasn't paid for something sees what it would take. Every entitlement is read from one map, on the server, from what the payment provider says was bought.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Entitlements, not plan names

- **One map, in the shared contracts**, from each plan to what it includes: **features** (on or off — custom domains, exports) and **limits** (a number with its period — storage, seats, sends per month). Code asks the map, never the plan: `hasFeature(entitlements, "custom-domain")`, `getLimit(entitlements, "storage-bytes")`. A check like `plan === "pro"` breaks the day a plan is renamed, split or given away.
- **Each feature and limit has a stable key** (`custom-domain`, `storage-bytes`), the same key the payment provider's product carries where it supports features, so the two can't drift.
- **An account's effective entitlements are computed by one function** — the plan, plus add-ons, plus any override an operator granted (a custom deal, a goodwill extension) — and every check reads its result. Overrides carry an end date and are audited (`api-architecture`).
- **A new plan is a row in the map**; a new feature is a key added to the plans that include it, in the same change as the route that checks it.
- **Plans are versioned.** Changing what a plan includes adds a new version; current subscribers keep the version they bought until they move, so an edit never silently changes what people pay for.
- **The resource owner's plan applies**, not the actor's: a member working in someone else's project uses that account's entitlements.

## Where they come from

- **The payment provider says what was bought; the store says what's in force.** A verified webhook updates the account's subscription record and its entitlements snapshot in one transaction, and every check reads the store — never the provider per request, which is slow and fails when the provider does.
- **Never trust the browser's return.** The success page can be faked, so it grants nothing by itself — but webhooks can be delayed, so on return the server asks the provider for the payment's status and applies it if it's paid. That and the webhook run the same idempotent fulfilment; until either has, the page says the payment is being confirmed.
- **Each provider status maps to access** in one table: active and trialing get the plan; past-due (or the provider's "attention") gets the grace period; unpaid, cancelled and completed fall to the free plan.
- **Webhooks arrive out of order and more than once** — apply each from the state it carries, ignore one older than the record, and record each event once (`api-architecture`'s webhooks reference).
- **A reconciliation job** compares the stored subscriptions with the provider's on a schedule, and alerts on any difference, so a lost webhook can't leave an account on the wrong plan for long.

## The check

The order on every route, after the rate limit (`api-architecture`):

1. **A feature that's switched off** answers 404, as if the route didn't exist, before the session is checked (`feature-flags`).
2. **The session and the permission** — who is this, and may they do this (`auth`, `access-control`)?
3. **The resource's attributes** — does its state allow it?
4. **The entitlement** — does the account's plan include it?
5. **The usage limit** — reserved in the same transaction as the work (below).

- **Checked in the service, on the server.** The UI runs the same functions to decide what to show, and protects nothing.
- **Its own error codes**, both 403: `FEATURE_NOT_IN_PLAN` and `PLAN_LIMIT_REACHED`, with the key, the limit and the current usage in `details`. The UI branches on the code: a permission refusal hides or explains, an entitlement refusal offers the plan that includes it. Not 402, which HTTP still reserves for future use.

## Usage limits

- **Reserve before the work, in the same transaction.** Read the account's usage, refuse if `used + requested > limit`, and increment — all inside the transaction that creates the thing being counted, so two requests at the edge can't both fit. A check followed by a separate write lets both through.
- **Settle when the real amount is known** (the file's final size, the message actually sent): the worker corrects the counter by the difference, and a failed or cancelled job releases its reservation.
- **Periods are keys, not resets.** A monthly counter is a document in the store keyed by the account's billing period (`usage/<accountId>_<periodStart>`), so it can sit in the work's transaction, and a new period starts at zero with no reset job to miss. Lifetime limits (storage, seats) have no period.
- **A scheduled recount** rebuilds each counter from the records and logs every correction, because counters drift.
- **Warn before the wall**, once per threshold per period (80% and 95% are common): an email and a notice, not a surprise refusal.
- **A quota is not a rate limit.** A quota counts per billing period and belongs to the plan; a rate limit protects the service over seconds (`rate-limiting`).

## Plan changes

- **Upgrades apply at once**, from the webhook. With a provider that prorates, its proration decides the charge; with one that has no proration or in-place change, the old subscription is cancelled and the new one starts, with the unused days credited as the product decides and states.
- **Downgrades and cancellations apply at the end of the paid period**, on the provider's schedule; until then the account keeps what it paid for.
- **Over a limit after a downgrade: keep the data, block new use.** Existing files, members and records stay readable; creating more is refused with `PLAN_LIMIT_REACHED` until the account is back under. If the product ever removes data over a limit, it says so in its terms, gives a stated period, and reminds the account before it happens.
- **A failed payment opens a grace period** — the provider's retry schedule where it retries, or the app's own retries and reminders where it doesn't: the account keeps access, sees a notice, and is emailed; when the retries end unpaid, it falls to the free plan's entitlements under the downgrade rules above.
- **Payers who can't be charged automatically** — bank transfer, USSD, mobile money — buy a prepaid period and renew by hand, with reminders before it ends; their access follows the period they paid for.
- **Refunds, chargebacks and disputes take back what they bought** — the plan falls back, and a credit pack's unused balance is removed.
- **Trials** are the trial plan's entitlements with an end date, with a reminder a few days before it ends. At the end, the account moves to what it chose or to the free plan — never charged without having agreed to it.
- **Add-ons and credit packs** add to the effective entitlements: an add-on recurs with the subscription; a pack is a balance spent atomically, like a usage limit, and kept apart from the period's quota so the two never mix. Packs that expire carry their expiry.
- **Every plan change is recorded** with who or what made it (the webhook, an operator), the old and new plan, and when.

## Caching

- **Entitlements travel with the account** — a snapshot on the account's record, so a check costs the read the guard already made. Where they're cached, the cache is expired by the event that changes the plan, never by time alone (`redis`, `nextjs`).
- **Never in session claims.** A plan in a claim lives until the session is re-minted, so a downgrade would keep the old plan running; read it from the store.

## The UI

- **Show what an upgrade would unlock.** A feature the plan lacks is visible, marked, and leads to the plan that includes it — unlike a permission the person lacks, which is hidden (`access-control`).
- **Usage is visible** where it matters — a meter beside storage, seats or sends — with the limit and the period's end.
- **The upgrade path names the plan and the price**, and returns to where the person was once the webhook has applied.

## Tests

- **The map, plan by plan, in both directions** — each plan's features and limits, so a pricing change shows as a diff.
- **Each gated route:** an account without the feature gets 403 `FEATURE_NOT_IN_PLAN`; one at its limit gets `PLAN_LIMIT_REACHED`; one within it succeeds.
- **Concurrency at the edge:** two reservations that only fit one at a time — exactly one succeeds.
- **Webhooks:** a replayed event changes nothing; an older event after a newer one is ignored; a downgrade over a limit keeps the data and blocks new use (`testing`).

## Do / Don't

- **Do** read every entitlement from one map; compute effective entitlements in one function; take plan changes only from verified webhooks; reserve usage in the work's transaction; key counters by period; keep data over a limit; give failed payments a grace period; show upgrade paths; test the map both ways.
- **Don't** check a plan's name; call the provider per request; grant access from the success page; check a limit and write in separate steps; reset counters with a job; put the plan in session claims; answer an entitlement refusal with 402 or the same code as a permission refusal; delete data over a limit without notice.

## Related skills

Who may act, and the check order `access-control` · webhooks and audit entries `api-architecture` · rate limits versus quotas `rate-limiting` · counters and transactions `firestore` · cache invalidation `redis`, `nextjs` · switching a feature off `feature-flags` · usage emails `transactional-email` · tests `testing`.
