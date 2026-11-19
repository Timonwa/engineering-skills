# engineering-skills

Sixty-two Claude Code skills for building web apps on Next.js, React and Firebase, in three plugins: `eng` for the whole repo, `fe` for the frontend and `be` for the API.

Most of what goes wrong in a web app isn't a missing feature. It's a route that skipped its guard, a cache that never cleared, a colour that fails contrast in dark mode, a secret that reached the browser, a name nobody can find again. These skills hold the rules that prevent those — where a file goes, which check runs first, what WCAG and OWASP ask — and the audits check a codebase against them.

Forty-five of them are model-invoked: Claude loads one when the work matches, so adding a route pulls in the API standard without you naming it. The other seventeen are commands you run deliberately — sixteen audits and a pull-request review.

**These are opinionated, and the opinions are specific.** They assume Next.js 16 App Router, React 19, TypeScript, Tailwind v4, a pnpm and Turborepo monorepo, and Firebase, Upstash Redis and Cloudinary behind the API. Within that stack, each rule follows the current industry standard — the platform's own docs, WCAG 2.2, OWASP — not one project's habits. If your stack is different, most of this will fight you — that's by design. I built it for my own projects and published it in case it's useful.

## Install

Run these in Claude Code:

```shell
/plugin marketplace add Timonwa/engineering-skills
/plugin install eng@engineering-skills
/plugin install fe@engineering-skills
/plugin install be@engineering-skills
```

`fe` and `be` each depend on `eng`, so installing either pulls it in. Install only the plugins a repo needs: a frontend over someone else's API needs `eng` and `fe`.

Pick a scope when it asks. **Project** shares the skills with everyone who clones the repo, which is usually right for a codebase you own. **Local** installs for the current repo only, for trying them on a codebase that isn't yours. **User** makes them available everywhere.

In a new project, run `agents-md` first. Every other skill reads the project's facts — palette, fonts, collection names, project IDs, rate-limit budgets, the brand voice — from the `AGENTS.md` it writes and the docs that file links.

## Skills

### eng — the whole repo

| Skill                   | What it's for                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `agents-md`             | The project's `AGENTS.md` — the facts and deviations everything else here reads                    |
| `code-structure`        | Thin route entries, components by product area, a flat kind-first `lib/`, server folders per app   |
| `naming`                | Verb-first, ownership-revealing names, the `<domain>.<kind>.ts` grammar, fields, events and tokens |
| `typescript`            | Strict inference-first TypeScript 7, tsconfig presets, erasable syntax, typed routes               |
| `schemas-and-contracts` | Zod at every boundary, `.pick()` write schemas, tolerant reads, a shared contracts package         |
| `monorepo`              | pnpm 11 and Turborepo — the catalog, build-script allowlists, workers, `--affected`                |
| `env`                   | Secrets in env, per-tier facts in constants, a Zod guard at boot, secret rotation                  |
| `testing`               | Vitest — mock only the I/O boundaries, in-memory fakes, deterministic tests, never weaken a test   |
| `devops`                | Prettier and ESLint, git hooks, hardened GitHub Actions, rulesets, releases, deploys and rollback  |
| `scaffold-app`          | Adapts a framework starter into the house app or monorepo shape, behind one approved manifest      |
| `scaffold-feature`      | One feature slice — schema, store, server layer, page, states, stories and tests — as stubs        |
| `migrate`               | A framework or major-version migration, one major and one verified step at a time                  |
| `ship-changes`          | Small Conventional Commits, one approved group at a time, and a PR only when asked                 |

### fe — the frontend

| Skill               | What it's for                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `nextjs`            | Next 16 — Cache Components, Server Actions with action results, `updateTag`, Proxy, streaming   |
| `react`             | React 19 — the Rules of React, derive don't sync, the Compiler, Actions, URL-owned panel state  |
| `semantic-html`     | The element the content is — landmarks, headings, lists, tables, links versus buttons, forms    |
| `accessibility`     | WCAG 2.2 AA beyond the markup, and the gates that verify it                                     |
| `tailwind`          | Tailwind v4 CSS-first — layer files, three token layers, dark mode, `cn()` with custom scales   |
| `design-system`     | The UI tiers, a base library installed as source, one component configured by props, drift      |
| `reusables`         | One shared component, hook or helper — agnostic, controllable from outside, copy through props  |
| `frontend-design`   | The craft of a UI built from the design system — hierarchy, type, colour, space, states, motion |
| `storybook`         | Storybook 10 where every story is a test — setup, CSF3, `fn()` spies, keyboard plays, axe       |
| `seo-aeo-geo`       | Being found, being the answer and being cited — indexability, metadata, JSON-LD, AI crawlers    |
| `copywriting`       | Product copy in the project's own voice and word list — the web, forms, errors and states       |
| `frontend-security` | XSS and safe rendering, security headers, a CSP that works with Cache Components, client tokens |
| `cookie-consent`    | Consent as regulators read it — equal-weight choices, each recorded, withdrawable at any time   |
| `logos-and-icons`   | Logo types, the favicon set, PWA, Android and Apple icons with their safe zones                 |

### be — the API

| Skill                 | What it's for                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `api-architecture`    | Rate limit → authorise → validate → delegate → audit → respond; envelopes, errors, pagination      |
| `openapi-registry`    | The OpenAPI document generated from one registration per route, with a coverage test               |
| `auth`                | Firebase Auth with an httpOnly session cookie only the API mints, lockouts, MFA, operator sign-in  |
| `access-control`      | Permission verbs behind one `can()`, 404 before 403, tenant scoping, API keys and share links      |
| `rate-limiting`       | Layered limits on Upstash — named tiers, the trusted client IP, fail direction per tier, 429s      |
| `plan-entitlements`   | What a plan allows, apart from permissions — one entitlements map, usage reserved in transaction   |
| `audit-log`           | Who did what, when and from where — append-only, never lost, never failing the request             |
| `backend-security`    | Server-side OWASP Top 10 2025 and API Top 10 — BOLA, injection, SSRF, CSRF, abuse, App Check       |
| `field-encryption`    | AES-256-GCM per field, associated data, a key per purpose, rotation and crypto-shredding           |
| `firestore`           | Firestore behind the Admin SDK only — transactions, counters, TTL, indexes and rules as code       |
| `redis`               | Redis keys, TTLs and a failure direction per primitive — caches open, locks and claims closed      |
| `image-handling`      | Uploads on Firebase Storage — bytes checked, pixels capped, EXIF stripped, buckets by reader       |
| `cloudinary`          | Delivery and uploads through Cloudinary, on top of the official Cloudinary skills                  |
| `feature-flags`       | Database-backed flags with coded defaults, one server evaluation and a stated propagation bound    |
| `maintenance-mode`    | A two-gate kill switch, a 503 with `Retry-After`, and never on the admin app that turns it off     |
| `transactional-email` | Sending email — authenticated domains, suppression, one-click unsubscribe, retries off the request |
| `emails`              | The words of a transactional email — sender, subject, preheader and one action                     |
| `webhook-delivery`    | Webhooks to customers — Standard Webhooks signing, an outbox, retries over days, SSRF checks       |

## Commands

Seventeen commands, each marked `disable-model-invocation`, so Claude never starts one on its own. An audit takes an optional phase and path; `review-pr` takes a pull request or a branch.

| Command                    | The question                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/eng:audit-all`           | How healthy is the repo overall? Every installed audit that applies, rolled into one report                |
| `/eng:codebase-audit`      | What hygiene has slipped? Debt, dead code, strictness, tests, CI, branches and deploys                     |
| `/eng:conventions-audit`   | Is every name and file where the house puts it? The repo against `naming` and `code-structure`             |
| `/eng:dependency-audit`    | Are the dependencies under control? The catalog, unused and misplaced packages, build scripts, advisories  |
| `/eng:env-audit`           | Are config and secrets where they belong? The env guard, `.env.example` parity, `NEXT_PUBLIC_`, rotation   |
| `/eng:security-audit`      | How would an attacker get in? Frontend and backend against the OWASP Top 10 and API Top 10                 |
| `/fe:accessibility-audit`  | Can everyone use it? Every WCAG 2.2 A and AA criterion, with the lint, Storybook and end-to-end gates      |
| `/fe:frontend-audit`       | Is the App Router code built the house way? Structure, the client boundary, caching, Tailwind, icons       |
| `/fe:performance-audit`    | Is it fast for the person loading it? Images, bundle weight, fonts, streaming, caching, Core Web Vitals    |
| `/fe:seo-aeo-geo-audit`    | Can search and AI engines find, read and cite it? Indexability, metadata, JSON-LD, robots, AI crawlers     |
| `/fe:storybook-audit`      | Is every shared component in a story that tests it? Coverage against the shared UI, and story quality      |
| `/fe:content-audit`        | Does the copy sound like the product and say what it means? UI and email copy against the voice            |
| `/be:api-audit`            | Is every route built the same safe way? The six steps, validation, limits, flags, plans, webhooks, email   |
| `/be:access-control-audit` | Can anyone reach what isn't theirs? Guards on every route and action, object and field checks, keys        |
| `/be:firestore-audit`      | Is the store read and written safely and cheaply? Reads per request, transactions, indexes, rules, backups |
| `/be:redis-audit`          | Does each Redis use fail the right way? One client, key builders, TTLs, failure direction, eviction        |
| `/eng:review-pr`           | Is this pull request ready to merge? Its goal, the project's rules and real bugs, each finding proven      |

Each audit writes a report to `_reports/<name>.md`. A finding carries a severity, its location, the evidence that proves it real and a specific fix; one that can't be proven from the code — a console setting, a DNS record — is marked "needs confirmation" rather than inflated. The report closes with a scorecard and how the score moved since the last run, carrying unresolved findings forward under their old IDs and listing the ones fixed since.

None of them edit code — the Edit tool is withheld for the whole run, and fixing a finding is a separate request. `review-pr` reports in chat and stays read-only too, unless you ask it to comment on the pull request or fix findings.

## What the skills won't do

**Invent a project value.** A colour, a collection name, a budget or a word in the brand voice comes from the project's `AGENTS.md` and the docs it links. A value that isn't written down is asked for, never guessed.

**Copy one project's habits.** Each rule follows the current standard — the platform's docs, WCAG, OWASP — not whatever a codebase happens to do. Where a project departs from a rule and records why, the project wins; where it departs without a reason, the skill asks before following either, and an audit reports it.

**Install, commit or push unasked.** Scaffolding shows one manifest of every file it will create, edit, move or delete and waits for approval. Commits go one approved group at a time, and nothing is pushed or opened as a pull request unless you ask.

**Weaken a failing test.** A red test means the code gets fixed. A test is never deleted, skipped or loosened to go green, and a flaky one is fixed at once rather than quarantined.

## Vendor skills

The skills above are the house rules on top of the vendors' tools. Where an official skill agrees with them, the plugin depends on it, so you get the vendor's updates directly:

| Plugin | Official skills                                                                                     | Source                                                              |
| ------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `eng`  | `turborepo`                                                                                         | [vercel/turborepo](https://github.com/vercel/turborepo)             |
| `fe`   | `next-dev-loop`, `next-cache-components-adoption`, `next-cache-components-optimizer`                | [vercel/next.js](https://github.com/vercel/next.js)                 |
| `be`   | `firebase-app-hosting-basics`, `firebase-security-rules-auditor`, `extension-to-functions-codebase` | [firebase/agent-skills](https://github.com/firebase/agent-skills)   |
| `be`   | `upstash-ratelimit-js`                                                                              | [upstash/skills](https://github.com/upstash/skills)                 |
| `be`   | `cloudinary-transformations`, `cloudinary-docs`                                                     | [cloudinary-devs/skills](https://github.com/cloudinary-devs/skills) |

The rest of each vendor's set is left out: some skills work against these rules — reading the database from the browser, unsigned uploads, keys in client code — and the others cover tools outside the stack.

## Repo layout

```text
plugins/<plugin>/                 # eng, fe, be
  .claude-plugin/plugin.json      # the plugin's manifest and its dependencies
  skills/<skill-name>/
    SKILL.md                      # the skill or command itself
    references/                   # longer material, loaded only when needed
shared/project-specifics.md       # the opening section every skill shares
scripts/                          # the checks behind the package scripts
.claude-plugin/marketplace.json   # the marketplace, with the official skills it points at
```

Plugins install separately, so each skill carries its own copy of the shared opening. It's written once in [shared/project-specifics.md](shared/project-specifics.md); `pnpm sync:opening` copies it into every `SKILL.md`, and `pnpm check:opening` fails when one has drifted.

## Contributing

Issues and pull requests are welcome. A rule that misfires in your project is worth reporting, and so is one that's fallen behind the standard it cites.

Each skill is a Markdown file, so there's no build step. The scripts only format and check them:

| Script               | What it does                                                             | Needs                       |
| -------------------- | ------------------------------------------------------------------------ | --------------------------- |
| `pnpm format`        | Format everything with Prettier                                          | `pnpm install` first        |
| `pnpm format:check`  | Check formatting without writing                                         | `pnpm install` first        |
| `pnpm validate`      | Validate the marketplace and plugin manifests                            | the Claude Code CLI on PATH |
| `pnpm check:skills`  | Fail on a `SKILL.md` over 200 lines or a description over 550 characters | Node                        |
| `pnpm check:opening` | Fail on a skill whose shared opening has drifted                         | Node                        |
| `pnpm sync:opening`  | Copy the shared opening into every skill                                 | Node                        |

The repo uses [pnpm](https://pnpm.io), and Prettier is its only dependency — install it if you want the format scripts, or run `pnpm dlx prettier --write .` instead.

Keep a change to one skill where you can, and run `pnpm check:skills`, `pnpm check:opening` and `pnpm validate` before opening a pull request.

## Related

- [writing-skills](https://github.com/Timonwa/writing-skills) — technical and content writing: docs pages, READMEs, API references, help-centre guides, articles, newsletters, editing and review. Install it beside these if you write as well as code.

## License

[MIT](LICENSE)
