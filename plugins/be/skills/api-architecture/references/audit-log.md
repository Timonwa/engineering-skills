# Audit log

An audit log is **evidence**: the record an investigation or a compliance review relies on to say who did what, when, from where, and what changed. What makes a log an audit log isn't who reads it but what it guarantees:

- **complete** for every security-relevant event, including the ones that were refused;
- **attributed** — the actor, their IP and user agent, and what changed;
- **append-only** — nothing edits or deletes an entry;
- **retained** by a policy, and surviving the deletion of the user it names;
- **exportable**, and on larger products streamable to the customer's security tooling.

## Three scopes, each with its own readers

| Scope                                                                  | Who reads it                                    | What it holds                                                                                                                    |
| ---------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **The platform**                                                       | The product's own operators, in the admin panel | Every privileged action across all customers, and every operator action                                                          |
| **An organisation or team** — in products where accounts belong to one | That organisation's owners and admins           | Everything that changed the organisation: members, roles, settings, keys, billing, and its members' sensitive actions within it  |
| **One account**                                                        | The account holder                              | Their own security events: sign-ins, password and email changes, second-factor changes, sessions revoked, keys and tokens issued |

Each entry records its scope (and the organisation, where there is one), so one event can appear in every log that should hold it — an owner removing a member shows in the organisation's log and in the platform's. A reader only ever sees the scope they're accountable for.

## What earns an entry

The sensitivity of the action, not the role of the actor:

- every privileged or administrative change;
- every change to an organisation's membership, roles, settings or credentials;
- every security-relevant action on an account — the steps of an account takeover;
- every refusal by a guard on a privileged permission. Every other refusal (someone without access to one record) still goes to the security log with the actor, method, path and IP, so probing shows up; it stays out of the audit log, where it would bury the entries that matter.

Ordinary edits to a user's own content don't belong here.

## The entry

- **action** — from one typed list, registered before the feature that uses it ships; never an ad-hoc string;
- **result** — success, or failure for a refusal;
- **scope** — platform, organisation (with its id) or account;
- **actor id and the actor's email, copied in**, so the trail survives the user being deleted;
- **target id and type**, when there is one, and **what changed** (before and after, for the fields that matter);
- the **IP**, **user agent**, **method and path**, and the timestamp.

## The rules

- **Fire-and-forget.** The write is never awaited, and its errors are swallowed and logged; a failed audit write never fails the request.
- **The privileged permission guard writes its own denial entries** (the permission required and the caller's roles, with the result marked as a failure), so routes need no denial code.
- **Append-only:** no edit or delete route, and no read-through cache. Reads are scoped — operators see the platform's, organisation owners their organisation's, the account holder their own.
- **Retention runs on a policy and a TTL field**, never by hand; the period is the project's (`AGENTS.md`), often set by what its customers' compliance asks for.
- **Deleting a user never deletes their audit entries.**

## Not an activity log

An activity log is a product feature: a feed of recent actions shown to members for awareness ("Ada published the event"). It may be fed from the same events, but it promises none of the above — it shows a selection, carries little detail, can be pruned, and goes with the content it describes. Its design belongs in the project's feature docs. Keep both apart from any per-record version history.
