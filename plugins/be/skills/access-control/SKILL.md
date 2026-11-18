---
name: access-control
description: >-
  Access control for a Next.js API on Firebase — roles, relationships and attributes (RBAC, ReBAC, ABAC) behind permission verbs and one pure can(); guards as the only gate, 404 before 403; tenant scoping; invitations; escalation limits; two-person approval and access reviews; stale claims; API-key scopes; share links and passcodes; where plan and flag checks sit; UI gates that only hide; and tests. Use when adding a permission, role, guarded route, API key, share link, or a control only some people see.
---

# Access control

Who may do what is decided by **permission verbs**, never role names. Roles, relationships, API keys and share links all resolve to verbs; one pure function answers every question; the API's guards are the only place the answer protects anything. Moving a capability between roles is then one line in the map, and every guard and button follows it.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## The model

OWASP prefers relationship- and attribute-based checks to bare roles for applications, because a role alone can't say _whose_ resource. The house model is all three, in their places:

- **Platform roles** — the product's own operators (support, finance, admin). Global, few, and carried on the session as a claim, so they cost no read.
- **Resource roles** — a person's place on one resource: a member of an organisation, a workspace, a project. Resolved per request from the relationship (ownership, or an accepted membership), never stored in claims — a person can belong to any number of them.
- **Attributes** — the resource's own state (archived, suspended, published, the tenant it belongs to) — are checked by the guard or the service after the verb, never folded into a role.
- **Callers without a role** — an API key, a share link, a passcode — resolve to the verbs they were given, below.

An operator holds no resource verbs. They act on customers' resources through the operator routes, with operator verbs, audited as operator actions — never by borrowing a member's role.

## Verbs

- **Shape `scope.resource.action`** — `admin.user.suspend`, `project.member.invite`; multi-word resources hyphenated (`feature-flag`).
- **A fixed action vocabulary**, kept at the top of the permissions file:

  | Group         | Actions                                                                          |
  | ------------- | -------------------------------------------------------------------------------- |
  | Read          | `view` · `list` · `search` · `report` · `export`                                 |
  | Change        | `create` · `update` · `delete` · `duplicate`                                     |
  | Relationships | `invite` · `add` · `remove` (`remove` detaches; `delete` destroys)               |
  | Lifecycle     | `publish`/`unpublish` · `archive`/`unarchive` · `suspend`/`unsuspend` · `cancel` |
  | Approval      | `approve` · `reject` · `request`                                                 |
  | Escape hatch  | `perform` — only when nothing above fits                                         |

- **Every reverse action is its own verb**, so grants and audit entries can tell the directions apart.
- **One registry** — every verb in one constants file, typed as a union, in the shared contracts. An inline string is a bug.

## Roles to verbs

- **One map per role kind**, each role a `Set` of verbs, in the shared contracts beside the verbs.
- **Two models side by side:**
  - **Exclusion** — the top role of a scope gets the whole scope; the next gets it minus a named exclusion set. A new verb reaches them automatically.
  - **Allowlist** — every narrower, job-shaped role names its verbs. A new verb reaches it only when added — granting it is part of the same change as the route that needs it, or the verb is dead code.
- **Least privilege:** a role holds what its job needs and no more; read-only roles hold only read verbs. A person may hold several platform roles, and their verbs add up.

## The policy

- **`can(actor, permission)`** is pure — no reads, no side effects — so the API, the UI and the tests run the same predicate. `canAll` and `canAny` wrap it. The actor is `{ platformRoles?, resourceRole?, scopes? }`, built by the guard; a key's or link's `scopes` are verbs it was granted directly.
- **Deny by default:** an unknown role, a missing membership, a pending invite or an absent actor is no verbs.

## Guards

The guard is the only real gate; nothing upstream checks again, and the UI only hides.

| The route acts on                       | Guard                                                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| A platform resource (operator routes)   | `requirePermission(request, verb)` — session, claims, `can()`; audits a denial               |
| One resource or anything under it       | `load<Resource>WithPermission(request, id, verb)` — session, load, resolve the role, `can()` |
| A resource whose role is already loaded | `require<Resource>Permission(request, verb, role)`                                           |
| A second verb in the same handler       | `requireActor(actor, verb)` — against the actor in hand, without verifying the token again   |
| The caller's own record                 | `requireSession(request)` — no permission; there's no one else's to protect (`auth`)         |

- **404 before 403.** A resource guard loads first, so a stranger asking for an id they can't see gets 404 — never a 403 that confirms it exists (OWASP's guessable-id rule).
- **Ownership comes from the record, the actor from the token.** A body field never names whose resource it is, who the caller is, or what role they hold.
- **Scope every query by the tenant.** A list or lookup filters by the organisation or owner the guard resolved; an id from the client alone never reaches another tenant's data.
- **Fields are authorised too.** A write accepts only the fields that verb may change (a `.pick()` allowlist, so a role can't be set through a profile update); a response returns only what that caller may see (`schemas-and-contracts`).
- **Failure is central:** guards throw typed errors (`ForbiddenError`, `NotFoundError`) that `errorResponse` maps; a guard never returns a boolean a route might ignore (`api-architecture`).

## API keys

A key lets a customer's own scripts and integrations call the API. Issuing, storing and revoking it is `auth`'s; what it may do is here:

- **Scopes are verbs from the same registry**, chosen when the key is made; a new key holds none until some are picked, and a read-only key holds only read verbs.
- **A key never holds a verb its creator lacks**, acts only on the account or organisation it was made in, and stops working when that account is suspended or the creator loses the verbs.
- **The key's guard builds the actor from its scopes** and runs the same `can()`, so every route that takes keys reuses its existing guard. Operator routes never accept a key.
- Keys get their own rate-limit tier, keyed by the key (`rate-limiting`), and their actions are audited with the key's id as the actor.

## Share links and passcodes

A link or code grants access to whoever holds it. Following the W3C's capability-URL guidance, except where Google's noindex rule overrides it:

- **Unguessable:** at least 120 bits from a secure generator (a v4 UUID, or 16 random bytes), never a sequential or derived id.
- **One resource, read only:** the link resolves to an actor with one read verb on one resource; a `GET` never triggers an action.
- **Expiring and revocable:** each link has an expiry or a single use, the owner can revoke it and issue another, and an expired, revoked or wrong link answers 404 — the same as a resource that doesn't exist.
- **A passcode is a weaker secret:** stored encrypted or hashed, compared in constant time, its attempts rate-limited per resource and caller with a lockout (`rate-limiting`); a correct code sets a short-lived cookie for that resource only, so the code isn't sent again.
- **Nothing leaks it:** the page sends `Referrer-Policy: no-referrer`, loads no third-party scripts, and is `noindex` (a meta tag and `X-Robots-Tag`) — never disallowed in `robots.txt`. The W3C note suggests listing the links' path there, but Google never reads a `noindex` on a page it's blocked from crawling, so a blocked link can still be indexed from links elsewhere (`seo-aeo-geo`).
- **Access bought or earned is a relationship**, not a link: "ticket holders may see this album" is checked against the purchase, like a membership.

## Where plans and flags sit

Access control answers "may this caller do this?". Two other checks answer different questions and come after it, each with its own error code so the UI can tell "you can't" from "your plan doesn't include this":

1. **Permission** — this skill.
2. **The resource's attributes** — its state allows it.
3. **The plan's entitlement** — the account's plan includes it, and a usage limit is reserved in the same transaction as the work (`plan-entitlements`).

A feature that's switched off answers as if the route didn't exist, before any of these (`feature-flags`).

## Hierarchy and escalation

- **"May this member manage that one?"** is a rank check beside the verbs: a member may invite, change or remove only a role strictly below their own. A co-owner can't remove the owner or another co-owner.
- **Nobody grants themselves** a role, or grants a role above their own.
- **The last holder of the top role** can't be removed or demoted, so a scope never ends up with no one able to administer it.
- Role changes on platform roles are audited (`audit-log`).

## Invitations

How a person gains a resource role:

- **Single-use and expiring** (days, not months), stored as a hash like any token; resending replaces the old one.
- **Bound to the invited email**, accepted only by a signed-in account whose verified email matches. A forwarded link is useless to anyone else.
- **The role is fixed when it's sent**, by someone allowed to grant it (the rank rules below), and checked again on acceptance — if the inviter has since lost the right, the invite is void.
- **The owner sees and revokes pending invites**; a pending invite grants nothing.

## Operator safeguards

- **Two people for the riskiest acts** (NIST AC-5, separation of duties): granting a platform role, a large refund or payout change, a bulk export or deletion. One operator requests, a second approves; nobody approves their own request, and both are audited.
- **Access is reviewed on a schedule** — each quarter, the owner confirms every platform role is still needed, and unused ones are removed. **Offboarding** removes roles and revokes sessions the same day.
- **Grants can expire:** a role given for a task (support on one account, an incident) carries an end date and lapses on its own. **Break-glass** access — the emergency path round the normal rules — is time-limited, alerts the owners when used, and is reviewed after.

## Claims go stale

Claims are a cache of the stored roles, never the record:

- **Write the role documents first, then re-derive the claims from them** with `setCustomUserClaims`, awaited in the request; keep claims small (Firebase caps them at 1,000 bytes).
- **A claim lives on in every session until it's re-minted.** A granted role lands on the next session refresh (`auth`); a role taken away **revokes the person's sessions**, because waiting for expiry leaves the old powers live.
- Anything that must hold the instant it changes — a suspension, a removal from a resource — is read from the store per request, never from claims.

## The UI

- **The UI runs the same `can()`** on an actor built from the session (and the resource role the page resolved), through a `usePermission` hook and a small gate component that renders its children only when the verb holds.
- **A UI gate hides a control; it protects nothing.** Every action it hides is still guarded by the API.
- **Hide what can't be done; don't disable it without saying why.** A read-only role sees no edit buttons rather than a page of dead ones.

## Data-layer rules

Where clients read the store directly, the security rules mirror the same model — default-deny, ownership and membership checked in the rule, role fields immutable to clients (`firestore`). Where every read and write goes through the API, the rules deny clients entirely.

## Tests

- **The role map, verb by verb, in both directions** — the roles that hold each verb and the roles that don't — so a change to the map shows up as a diff in the test.
- **The hierarchy:** every pair of roles, manage or not.
- **Each key-taking route:** a key without the scope gets 403. **Each link:** a wrong, expired and revoked link each get 404.
- **Each guarded route:** 401 without a session, 404 for an id the caller can't see, 403 for a caller who can see it but lacks the verb, and the success path (`testing`).

## Adding a permission

1. Add the verb to its scope's list, with an action from the vocabulary.
2. Decide who holds it: exclusion roles get it unless you add it to their exclusion set; add it to each allowlist role that should.
3. Assert both directions in the role-map test.
4. Rebuild the contracts package if consumers read its build, then guard the route with the verb.
5. Gate the control in the UI with the same verb.

## Do / Don't

- **Do** check verbs; bind invites to the invited email; require a second approver for the riskiest operator acts; review access on a schedule; keep `can()` pure; resolve resource roles per request; load before checking so a hidden id is a 404; take ownership from the record and identity from the token; scope queries by tenant; revoke sessions when a role is removed; make links unguessable, expiring and revocable; test every verb both ways.
- **Don't** check a role name in a route or component; store permissions on a user document; put resource roles in claims; trust a body's owner or role field; give operators resource verbs; treat a UI gate as protection; let a role grant a role at or above its own; let a key outrank its creator; let a link perform an action.

## Related skills

Sessions, claims and key issuing `auth` · plan checks `plan-entitlements` · flags `feature-flags` · attempt limits `rate-limiting` · the route the guard sits in `api-architecture` · field allowlists and projections `schemas-and-contracts` · security rules `firestore` · server threats `backend-security` · tests `testing` · the audit `access-control-audit`.
