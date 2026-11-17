# engineering-skills

Claude Code skills for building web apps: 39 skills and 15 audit commands covering structure, naming, TypeScript, styling, accessibility, security, API design, scaffolding, and release.

**These are opinionated, and the opinions are specific.** They assume Next.js App Router, React 19, TypeScript, Tailwind v4, and Firebase on the backend. Skills like `firebase-architecture`, `nextjs-best-practices` and `tailwind-css` encode one particular way of building, not a survey of the options. If your stack is different, most of this will fight you — that's by design. I built it for my own projects and published it in case it's useful.

## Install

```shell
/plugin marketplace add Timonwa/engineering-skills
/plugin install eng@engineering-skills
```

Skills are model-invoked — Claude reaches for them when the task matches. Commands are yours to run: `/eng:frontend-audit`, `/eng:audit-all`.

Choose a scope when installing: **user** for every project, **project** to share with collaborators via `.claude/settings.json`, or **local** for just this repo.

## Project facts live in AGENTS.md

Every skill here reads project-specific values — palette, fonts, collection names, project IDs, rate-limit budgets — from the repo's own `AGENTS.md` rather than assuming them. Run `scaffold-agents-md` first in a new project; the rest of the collection depends on it.

## Skills

### Frontend

| Skill                     | What it covers                                                             |
| ------------------------- | -------------------------------------------------------------------------- |
| `accessibility`           | WCAG 2.2 AA via POUR, plus how to verify rather than assert it             |
| `html-best-practices`     | Element choice, headings, `<dl>`, tables, forms, media                     |
| `frontend-design`         | Design quality and distinctiveness, not the default component-library look |
| `frontend-security`       | Client-side OWASP 2025 — XSS, CSP, clickjacking, token storage             |
| `react-best-practices`    | React 19 — `use()`, Actions, derive-don't-sync, no hand-memoization        |
| `nextjs-best-practices`   | Next 16 — Cache Components, `use cache`, Proxy, async `params`             |
| `tailwind-css`            | Tailwind v4 CSS-first — the two-layer token system and the six CSS layers  |
| `design-system`           | Governance — when a one-off earns a token                                  |
| `reusables`               | Components controllable entirely from the outside                          |
| `storybook-setup`         | Init, the Storybook 9/10 addon landscape, colocated stories                |
| `storybook-story-writing` | CSF3 + `satisfies Meta`, tier titles, `fn()` spies                         |
| `vanilla-cookieconsent`   | GDPR consent as a state machine, separable from the library                |
| `seo`                     | Metadata, structured data, robots, sitemaps, AEO/GEO                       |

### Backend

| Skill                     | What it covers                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `api-architecture`        | Route→service→data layering, `.pick()` write schemas, RBAC guards, rate-limit tiers    |
| `backend-security`        | Server-side OWASP 2025 — BOLA/BFLA, injection, SSRF, sessions, resource limits         |
| `field-encryption`        | AES-256-GCM field encryption, and the service-boundary decrypt pattern                 |
| `feature-flags`           | DB-backed runtime toggles, safe-default-false, two-tier cache with a stated bound      |
| `maintenance-mode`        | A two-gate kill switch that can never lock you out of switching it off                 |
| `redis-patterns`          | Redis primitives — key builders, TTL discipline, fail-open caches vs fail-closed locks |
| `firebase-architecture`   | The house Firebase architecture — the Admin-SDK boundary, hybrid RBAC, write-safety    |
| `cloudinary-architecture` | The house delivery rules — URL grammar, credential boundary, account hardening         |
| `image-handling`          | The upload pipeline — client compression, server-side gating, bucket tiering           |

### Structure and conventions

| Skill                       | What it covers                                                                |
| --------------------------- | ----------------------------------------------------------------------------- |
| `code-structure`            | Thin route and layout entries, the four `ui/` tiers, a flat kind-first `lib/` |
| `naming`                    | The `<domain>.<kind>.ts` grammar, casing, assets, tokens                      |
| `typescript-best-practices` | Strict inference-first TS, Zod 4 as the source of truth                       |
| `scaffold-agents-md`        | Writes the project's `AGENTS.md` — the facts everything else here reads       |

### Scaffolding and migration

| Skill               | What it covers                                                                     |
| ------------------- | ---------------------------------------------------------------------------------- |
| `scaffold-next-app` | Adapts a create-next-app starter into the house structure                          |
| `scaffold-monorepo` | Adapts a starter into the pnpm + Turborepo workspace shell                         |
| `scaffold-feature`  | A new feature's files in the right places, with the right imports, day one         |
| `migrate-framework` | A gated framework or major-dependency migration, one verified step at a time       |
| `sync-apps`         | Finds drift in files that should match across sibling apps, and propagates the fix |

### Delivery

| Skill                | What it covers                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `devops`             | CI/CD, supply-chain hardening, env strategy, pre-commit gates                             |
| `turborepo-monorepo` | pnpm workspaces + Turborepo v2 — task graph, caching, `--affected`                        |
| `stage-commit`       | Small Conventional Commits, one review-gated commit at a time                             |
| `changelog`          | A CHANGELOG entry and release notes, drafted from changesets or commit history            |
| `pr-review`          | Hunts bugs across many angles, verifies each before reporting, checks project conventions |

### Brand and assets

| Skill             | What it covers                                                                       |
| ----------------- | ------------------------------------------------------------------------------------ |
| `branding`        | Brand voice and the product's own UI copy                                            |
| `logo-generation` | A brand's logo, icon and favicon set, with the wordmark outlined so it needs no font |
| `svg-generation`  | Clean, accessible, themeable SVG                                                     |

## Audit commands

Each is manually invoked, report-only, and writes a scored report to `_reports/`. None of them modify code. `audit-all` detects which apply to the repo, runs those, and aggregates one summary.

| Command                     | What it checks                                                                |
| --------------------------- | ----------------------------------------------------------------------------- |
| `/eng:audit-all`            | Detects what applies, runs each audit, aggregates one report                  |
| `/eng:accessibility-audit`  | WCAG 2.2 AA, keyboard, focus, contrast, ARIA                                  |
| `/eng:api-audit`            | Thin handlers, validation at every boundary, pagination, rate-limit coverage  |
| `/eng:codebase-audit`       | Repo-health triage — debt, dead code, strictness, coverage                    |
| `/eng:conventions-audit`    | The repo against the `naming` and `code-structure` standards                  |
| `/eng:dependency-audit`     | Version drift, unused deps, the catalog, lockfile, advisories                 |
| `/eng:environment-audit`    | Zod-at-boot env, `.env.example` completeness, no secrets reaching the client  |
| `/eng:firestore-audit`      | Firestore rules, indexes, query shape, and cost — a scored report             |
| `/eng:frontend-audit`       | App Router structure, boundaries, caching, React idioms                       |
| `/eng:performance-audit`    | Images, bundle weight, fonts, streaming, Core Web Vitals                      |
| `/eng:access-control-audit` | Unprotected routes and actions, object- and function-level authorization gaps |
| `/eng:redis-audit`          | Key namespacing, TTL coverage, atomicity, per-request command cost            |
| `/eng:security-audit`       | A red-team pass over whatever the app has — frontend, backend, or both        |
| `/eng:seo-code-audit`       | Metadata, robots, sitemap, structured data, crawlability                      |
| `/eng:storybook-audit`      | Story coverage against shared UI, and story quality                           |

## Vendor plugins

The skills above cover _architecture_ — how I wire Firebase, Cloudinary and Redis into a project. The product mechanics belong to the vendors, so this marketplace points at their official skills rather than copying them, and you get their updates directly.

They're declared as dependencies of `eng`, so installing it pulls all 22 in automatically:

| Vendor     | Skills                                                                                                                                                                                                                                                                                       | Source                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Firebase   | `firebase-basics`, `firebase-auth-basics`, `firebase-firestore`, `firebase-hosting-basics`, `firebase-app-hosting-basics`, `firebase-data-connect-basics`, `firebase-remote-config-basics`, `firebase-ai-logic-basics`, `firebase-security-rules-auditor`, `extension-to-functions-codebase` | [firebase/agent-skills](https://github.com/firebase/agent-skills)   |
| Upstash    | `upstash-redis-js`, `upstash-ratelimit-js`, `upstash-qstash-js`, `upstash-workflow-js`, `upstash-blob-js`, `upstash-search-js`, `upstash-vector-js`, `upstash-cli`                                                                                                                           | [upstash/skills](https://github.com/upstash/skills)                 |
| Cloudinary | `cloudinary-docs`, `cloudinary-next`, `cloudinary-react`, `cloudinary-transformations`                                                                                                                                                                                                       | [cloudinary-devs/skills](https://github.com/cloudinary-devs/skills) |

Each is referenced as a single-skill plugin pinned to its upstream folder, so the set is curated for web work. Firebase's `firebase-crashlytics` and `xcode-project-setup` are excluded as mobile-only, and Upstash's three `upstash-box-*` skills are excluded — they cover sandboxed AI containers, not web apps.

Pair `firebase-architecture` with the Firebase set, `redis-patterns` with Upstash, and `cloudinary-architecture` with Cloudinary.

## Related

- [technical-writing-skills](https://github.com/Timonwa/technical-writing-skills) — documentation: docs-site pages, READMEs, API references, help-centre guides, prose editing, and a docs audit. The two plugins compose — install both if you write documentation as well as code.

## License

MIT
