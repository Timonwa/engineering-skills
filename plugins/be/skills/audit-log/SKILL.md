---
name: audit-log
description: >-
  The audit log of a Next.js API — evidence of who did what, when, from where and what changed: platform, organisation and account scopes with their readers, what earns an entry (including refusals), the entry's fields and actor kinds, writes that are never lost and never fail the request, append-only storage with tamper evidence, retention and erasure, scoped reads that are themselves audited, export and streaming, and how it differs from an activity feed. Use when adding a privileged action, an audit action or an audit view.
---

# Audit log

An audit log is **evidence**: the record an investigation, a customer's security review or a compliance check relies on to say who did what, when, from where, and what changed. What makes a log an audit log isn't who reads it but what it guarantees — **complete** for every security-relevant event, refusals included; **attributed**; **append-only** and tamper-evident; **retained** by a policy and surviving the deletion of the user it names; and **exportable**.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Three scopes, each with its own readers

| Scope                                                                  | Who reads it                                    | What it holds                                                                                                                    |
| ---------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **The platform**                                                       | The product's own operators, in the admin panel | Every privileged action across all customers, and every operator action                                                          |
| **An organisation or team** — in products where accounts belong to one | That organisation's owners and admins           | Everything that changed the organisation: members, roles, settings, keys, billing, and its members' sensitive actions within it  |
| **One account**                                                        | The account holder                              | Their own security events: sign-ins, password and email changes, second-factor changes, sessions revoked, keys and tokens issued |

Each entry records its scope (and the organisation, where there is one), so one event appears in every log that should hold it — an owner removing a member shows in the organisation's log and the platform's. A reader only ever sees the scope they're accountable for.

## What earns an entry

The sensitivity of the action, not the role of the actor:

- every privileged or administrative change, and every operator action on a customer's data;
- every change to an organisation's membership, roles, settings, keys or billing;
- every security-relevant action on an account — the steps of an account takeover: sign-ins from a new device, credential and second-factor changes, sessions ended;
- every refusal by a guard on a privileged permission, and every failed second-factor or step-up check.

Every other refusal (someone without access to one record) goes to the **security log** with the actor, method, path and IP, so probing shows up and alerts, but stays out of the audit log, where it would bury the entries that matter (`backend-security`). Ordinary edits to a person's own content don't belong in either.

## The entry

- **action** — from one typed list of `scope.resource.action` names, the same grammar as the permission verbs (`access-control`), registered before the feature that uses it ships; never an ad-hoc string;
- **result** — success, or failure with the reason for a refusal;
- **scope** — platform, organisation (with its id) or account;
- **actor** — its kind (a person, an operator, an API key, the system for cron and webhooks) and id, the person's email copied in so the trail survives their deletion, and, when an operator acts as a customer, both of them;
- **target** — its type and id, and **what changed**: before and after, for the fields that matter, never a secret, token or password (`backend-security`);
- **context** — the IP, user agent, method and path, the request id that ties it to the application logs, and the time from the server's clock, in UTC.

## Writing it

- **A failed audit write never fails the request — and is never lost silently.** It runs after the response with `after()` (`nextjs`), never as a dangling promise a serverless instance can freeze mid-write; it retries, and a final failure goes to the error log and alerts.
- **Where the entry must exist if the change does** — a role granted, money moved, a key issued — it's written in the same transaction as the change (`firestore`), so neither lands without the other.
- **The privileged guard writes its own denial entries** — the permission required, the caller's roles, the result marked as a failure — so routes need no denial code (`access-control`).
- **One helper writes every entry** from the request and the actor the guard resolved; a route passes only the action, the target and the change.

## Keeping it trustworthy

- **Append-only:** no update or delete route, the store's rules deny clients, and no code path edits an entry. Corrections are new entries.
- **Tamper-evident:** the Admin SDK can still edit a document, so entries are also shipped to write-once storage — a log bucket with locked retention, or a storage bucket with a retention lock — or each entry carries a hash of the one before it, so a removed or altered entry breaks the chain.
- **Retention runs on a policy and a TTL field**, never by hand; the period is the project's (`AGENTS.md`), often set by what its customers' compliance asks for (a year is common; some regimes ask for longer).
- **Deleting a user never deletes their audit entries.** An erasure request is met for the product's data; audit entries are kept for their retention period as a legal obligation or legitimate interest, and the policy saying so is published. Where the law requires less, the email is replaced with a pseudonym rather than the entry removed.

## Reading it

- **Reads are scoped:** operators see the platform's, organisation owners and admins their organisation's, the account holder their own — each through a guard with its own verb (`access-control`).
- **Reading and exporting the log are audited too**, so access to the evidence is itself evidence.
- **Filters by actor, action, target and time**, newest first, with cursor pagination (`api-architecture`).
- **Export** as CSV or JSON for a date range; **streaming** to a customer's security tooling (a webhook or a log drain) where the product offers it, usually as a plan feature (`webhook-delivery`, `plan-entitlements`).
- **Alerts on the entries that matter** — a new owner, a key issued, a role granted to an operator — go to the people accountable for that scope.

## Not an activity feed

An activity feed is a product feature: recent actions shown to members for awareness ("Ada published the event"). It may be fed from the same events, but it promises none of the above — it shows a selection, carries little detail, can be pruned, and goes with the content it describes. Its design belongs in the project's feature docs. Keep both apart from any per-record version history.

## Tests

Each privileged route's test asserts its audit entry — the action, the actor, the target and the change — and that a refused call writes the failure (`testing`). A test over the action list asserts every privileged verb has an action that's written somewhere.

## Do / Don't

- **Do** register every action in one typed list; record the actor's kind and email, the target, the change and the request id; write after the response with retries, or in the change's transaction where both must exist; ship entries to write-once storage; audit reads and exports; keep entries past a user's deletion.
- **Don't** let an audit failure fail a request; fire an unawaited promise; edit or delete an entry; log a secret; put ordinary refusals or content edits in the audit log; show a reader another scope's entries; treat an activity feed as the audit log.

## Related skills

Where the audit step sits in a route `api-architecture` · guards, verbs and impersonation `access-control` · the security log and what never gets logged `backend-security` · `after()` `nextjs` · the transaction `firestore` · streaming `webhook-delivery` · plan features `plan-entitlements` · tests `testing` · retention and erasure across the product `field-encryption`.
