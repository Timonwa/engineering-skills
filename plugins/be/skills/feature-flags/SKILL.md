---
name: feature-flags
description: >-
  Runtime feature flags stored in the database — release, ops and experiment flags (never permissions or plan gates), a typed registry with a coded default per flag, one evaluation ladder on the server, last-known values then defaults when the store can't be read, two cache tiers with a stated propagation bound, flags resolved behind Suspense into a provider, a 404 for a switched-off route, audited changes, owners and removal dates against flag debt, and scheduled windows. Use when adding, flipping, scheduling or retiring a flag.
---

# Feature flags

A flag is a switch an operator flips while the system runs, without a deploy. Every flag has a coded default that keeps the app working as it does today, and the system only departs from it when it has positively read a live answer: **when in doubt, behave as before.**

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## What a flag is for

The four kinds of toggle from Pete Hodgson's article on martinfowler.com, and where each lives here:

| Kind                         | Lives                   | Example                                               |
| ---------------------------- | ----------------------- | ----------------------------------------------------- |
| **Release** — temporary      | this skill              | a new dashboard, off until it's ready                 |
| **Ops** — long-lived         | this skill              | a kill switch that sheds an expensive feature         |
| **Experiment** — temporary   | this skill, or a vendor | an A/B test, with bucketing and exposure logged       |
| **Permission** — per account | **not a flag**          | roles → `access-control`; plans → `plan-entitlements` |

- **A flag never grants or removes access.** Flags are global, cached and flipped by whoever runs the flag admin; who may do what is a permission (`access-control`), and what an account's plan includes is an entitlement (`plan-entitlements`).
- **Deploy-time config is env, not a flag** — hosts, credentials, tuning constants (`env`). Don't put config in a flag to skip a deploy, and never a secret.
- **Every published flag's name and state are public.** The evaluate route takes no session, so a name that reveals an unannounced feature, a customer or a security control stays in draft.
- **Targeting stays small:** global, plus at most one segment (a country). A percentage rollout is a stable hash of the flag key and the account id, modulo 100 — the flag key in the hash, so the same accounts aren't first into every rollout. An experiment needs stable bucketing, exposure logging and analysis — build it on purpose or use a vendor; it's not a field on a boolean.

## The registry

- **Every flag code reads is in one registry** with its kind and default, and the name union derives from it, so a typo is a compile error rather than a flag that quietly serves its default forever:

  ```ts
  export const FEATURE_FLAGS = {
    NEW_DASHBOARD: { kind: "release", default: false },
    SEARCH_ENABLED: { kind: "ops", default: true }, // a kill switch: on unless an operator turns it off
  } as const satisfies Record<string, { kind: FlagKind; default: boolean }>;
  export type FeatureFlagName = keyof typeof FEATURE_FLAGS;
  ```

- **The default is what the app does today.** A release flag defaults off (the new path isn't live); an ops flag guarding a working feature defaults on, so losing the store never switches the product off.
- **Names are `UPPER_SNAKE_CASE`, validated and never renamed** — a rename orphans every code reference.
- **A new flag is two steps in one change:** add it to the registry, then create its record through the admin API — the same route an operator uses, so the audit entry and cache invalidation happen. A seed script calls that API with create-if-missing; it never writes the store directly or overwrites what an operator set.

## The record

- **One record per flag, its id the flag's name:** `enabled`, `status` (`draft` · `published`), targeting (an empty list means everyone), `startsAt`/`endsAt`, `archivedAt`, plus `owner` and, for release and experiment flags, a `removeBy` date.
- **A new flag is `draft` and off.** `status` says whether the flag may be read publicly at all; `enabled` says whether it's on. A draft can be created, referenced in code and reviewed before anyone outside can see it.

## Evaluation

One function, `evaluateFlag(name, context)` (and a batch form), is the only read path. It never throws, and it answers:

1. The store couldn't be read → the **last catalogue read**; if there has never been one, the flag's **coded default**.
2. No record, archived, or draft → the coded default.
3. `enabled` is off → `false`.
4. No targeting → `true`; the caller in the target → `true`; otherwise, or with no context to match → `false`.

- **Last known values, then defaults** is the industry standard: LaunchDarkly's SDKs keep serving what they last read through an outage, and OpenFeature returns the caller's default on any error. Dropping every flag to off during an outage would switch off live features and release whatever a kill switch was holding — worse than a briefly stale value.
- **Evaluate on the server.** The evaluate route returns resolved booleans, never records, so drafts and archived flags can't be seen from outside.
- **A route behind a switched-off flag answers 404** after the rate limit and before the session is checked, so a signed-out caller and a member see the same — the same as a route that doesn't exist (`access-control`).
- **A vendor later?** Put the evaluation behind an OpenFeature provider, so the call sites don't change; the registry's defaults become the default each call passes.

## Caching

- **An in-process tier in front of a shared one** (`redis`) in front of the store, the whole catalogue under one key, so an invalidation is one delete.
- **The in-process TTL is the propagation bound.** Another instance doesn't look at the shared tier until its own copy expires, so deleting the shared key notifies nobody. Keep it short (30 seconds to start); reach for pub/sub only when that isn't fast enough.
- **State the bound as a sum:** the writing instance sees its change at once; others within their in-process TTL; a cached page within its revalidate window. Publish the number and re-derive it when a TTL changes.
- **Every change clears both tiers** before it answers; the shared TTL is the backstop for a lost delete.
- **Caches fail open, to the next tier, then to last known values** (`redis`).

## In the app

- **Flags are resolved on the server and passed to a provider as booleans.** The provider never fetches: a client fetch renders the default first and flips after, a visible flash of the wrong version.
- **Behind their own `<Suspense>`**, in the route group's layout, never the root layout — a per-request context (the caller's country) makes the read dynamic. The catalogue itself is cached with a tag that every flag change expires (`nextjs`); the resolver is deduplicated per request.
- **After a change in the admin**, expire the tag and refresh the page.

## Changing a flag

- **Each transition is its own `POST` sub-route** — `publish`, `unpublish`, `archive`, `unarchive`, `enable`, `disable` — each with its own permission verb (`admin.feature-flag.update` and the like) and audit entry recording who, when, and the value before and after (`api-architecture`, `access-control`). Rate-limited like any write.
- **Rollout:** create (draft, off) → reference in code through the registry → publish → enable, for a segment or a percentage first where that helps.
- **Retirement:** fully on, then remove every code reference and the dead branch, drop it from the registry, and archive. Never archive a flag code still reads.
- **Archive, never delete.** A deleted flag leaves surviving references silently serving their default with no record of why, and the audit trail loses its subject.

## Flag debt

- **Release and experiment flags are temporary.** Each has an owner and a `removeBy` date, set when it's created; a scheduled check lists flags past their date, or fully on for weeks, and the owner removes them.
- **Ops flags are permanent on purpose**, marked as such, and reviewed now and then for whether they still guard anything.
- **Tests cover both branches** of every flag the code reads, and one run has every flag on — the next release's setting — with the flag set through the provider or the fake catalogue (`testing`).

## Scheduled windows

- **A flag with `startsAt`/`endsAt` is reconciled by the cron tick** (`api-architecture`): it compares `enabled` with what the window implies and flips only when they differ, with an audit entry and a cache clear — idempotent, so a missed tick heals on the next.
- **Precision is the tick's cadence**; the admin says so. Reading the window at evaluation time is exact, but writes no audit entry and clears no cache — use it only when minutes matter.
- **A schedule never outranks the ladder:** it does nothing to a draft or archived flag. A window field the admin can set is one the tick enforces, for every flag.

A worked example — the registry, the ladder and the provider — is in [references/example.md](references/example.md).

## Do / Don't

- **Do** register every flag with its kind and default; default to today's behaviour; evaluate on the server; serve last known values, then defaults; 404 a switched-off route; resolve flags behind `<Suspense>`; audit every change; give temporary flags an owner and a removal date; test both branches.
- **Don't** gate access or a plan with a flag; put config or a secret in one; publish a revealing name; fetch flags on the client; read flags in the root layout; drop every flag to off when the store fails; write flags straight to the store; delete a flag; leave a release flag in code after it's fully on.

## Related skills

The cache tier `redis` · the kill switch for the whole product `maintenance-mode` · permissions `access-control` · plan limits `plan-entitlements` · sub-routes, audit and the cron tick `api-architecture` · caching and Suspense `nextjs` · deploy-time config `env` · the store `firestore` · tests `testing`.
