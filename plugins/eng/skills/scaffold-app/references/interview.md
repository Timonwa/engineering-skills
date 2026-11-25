# Interview

Ask the user in batches of at most four questions, with your agent's question tool where it has one, the house default first in every option list. Pre-fill from detection and ask to confirm ("the lockfile says pnpm 11 — keep it?"), never blind. Skip what detection already answered. Record every answer verbatim: they are the project facts `agents-md` writes into `AGENTS.md`.

## Contents

- One app (a single app, or each app being added)
- The workspace (only when there is or will be one)
- Add-run (an already house-shaped app)

## One app

**Batch 1 — shape**

1. **Package manager** — pnpm (house default) · yarn. Default = the starter's lockfile; if it's npm's, propose pnpm and say why.
2. **Router and layout** — confirm the App Router and that `app/` sits in `src/`.
3. **App shape** — decides the server folders (`code-structure`):
   - an app with its own backend (Server Actions, maybe route handlers, talking to the store) — default;
   - a frontend over a separate API (a sibling API app or an external backend);
   - the API app itself (only inside a workspace).

   With route handlers, also ask whether the API publishes a browsable reference (default no); yes adds the docs route and the OpenAPI registry (`openapi-registry`).

4. **Data store and auth** — none (default) · Firebase · other. Firebase turns on the Firebase client folder and the data paths (`firestore`, `auth`).

**Batch 2 — foundations**

1. **UI foundation** — decides `src/ui/`, the styles and, in a workspace, the `ui` package:
   - **Tailwind only** (default for a simple app) — the app's own `src/ui/` tiers and tokens in its own styles;
   - **a design system on Adire** — the registry, the shared `ui` package and the theme lines the trees mark _Adire_; how each is set up is Adire's own skill;
   - **another library, named by the owner** — read its official docs or skill, wire it as "the base library", and ask before assuming anything about it.
2. **House packages** (multi-select, each ticked by default, each confirmed) — `@timonwa/app-utilities` and `@timonwa/react-hooks` for every project; `@timonwa/firebase-hooks` when the app uses Firebase, for its client auth hooks. A ticked package is used instead of writing its helpers or hooks again.
3. **Storybook** — yes (default) · no.
4. **Tests** — Vitest (default) · none. End-to-end tests are an opt-in gate (`devops`).

**Batch 3 — repo** (standalone only; in a workspace the root owns these, so state that instead)

1. **CI, hooks and dependency updates** — yes to CI and hooks (default); Dependabot (default) · Renovate · none, never both.
2. **Visibility and maintainership** — private (default) · public; solo (default) · team. Public adds `LICENSE` and `SECURITY.md`, and asks whether it takes outside contributions — yes adds `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`. Team asks which to enable: CODEOWNERS, the commitlint hook, the PR-title check (all default on). Solo gets none of them.

**Batch 4 — integrations** (multi-select; every default off)

1. **Images** — none · Firebase Storage uploads (`image-handling`) · Cloudinary delivery (`cloudinary`).
2. **Shared cache and rate limiting** — Redis (`redis`, `rate-limiting`).
3. **Runtime toggles** — feature flags (`feature-flags`) · a maintenance kill switch (`maintenance-mode`) · cookie consent (`cookie-consent`).
4. **Error tracking** — none · Sentry · another the owner names: its SDK started in `instrumentation.ts` (`register()`), server errors reported from `onRequestError`, and the client's own init.
5. **Extras** — MDX content · transactional email (`transactional-email`) · field encryption (`field-encryption`) · SEO beyond the defaults (`seo-aeo-geo`).

**Batch 5 — product features** (only for an app with its own backend; a frontend over someone else's API leaves these to that backend)

1. **Payments** — none (default) · Stripe · Paystack · another the owner names.

**Every integration is installed and initialised, never built.** A selection adds its packages (each a manifest line the owner approves), its configured client, any provider component the library ships, its keys in `.env.example` by name, and a link to the provider's official skill or docs, or the owning house skill. It never builds the feature itself — no checkout, webhooks, subscription logic, upload flows or mail templates; those are the project's work. Nothing beyond the approved packages is installed.

## The workspace

**Batch 1 — workspace**

| Question                  | Options (default first)                           |
| ------------------------- | ------------------------------------------------- |
| Package manager           | pnpm (house default) · yarn                       |
| Package scope             | detected scope · `@app` · custom — never invented |
| Catalog for every version | yes · no                                          |
| Turborepo remote caching  | no · yes (`TURBO_TOKEN` and `TURBO_TEAM` in CI)   |

**Batch 2 — apps**

| Question                          | Options (default first)                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Apps to end up with               | detected + `site` · `site,dashboard` · `site,dashboard,admin,api` · custom                                |
| Dev port per app                  | `site` 3000, `dashboard` 3001, `admin` 3002, `api` 3003, `storybook` 6006 · custom                        |
| A separate API app                | no · yes (`apps/api`; its internals → `api-architecture`)                                                 |
| Firebase functions and extensions | no · yes, for a Firebase app (`functions/<worker>/` bundled to `deploy/`; `extensions/<instance-id>.env`) |

**Batch 3 — shared packages**

| Question                          | Options (default first)                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which packages                    | `typescript-config`, `eslint-config`, `tailwind-config`, `ui`, `contracts`, `hooks`, `utils`, `testing` · a subset — `ui` and `tailwind-config` follow the UI foundation answer |
| A Storybook app for `packages/ui` | yes (`apps/storybook`) · no                                                                                                                                                     |
| The starter's own packages        | replace with the house set · keep alongside (a `create-turbo` starter only)                                                                                                     |

Create a package only when a second app will use it on day one; otherwise its code starts in the app (`code-structure`). App names describe the app — `site`, `dashboard`, `admin`, `api` — and an app's routes never repeat its name; only `api` keeps a prefix.

**Batch 4 — automation**

| Question   | Options (default first)                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| CI         | GitHub Actions per `devops` · none                                                                                  |
| Git hooks  | husky + lint-staged + commitlint · none                                                                             |
| CODEOWNERS | yes for a team · no                                                                                                 |
| Visibility | private · public (`LICENSE`, `SECURITY.md`; with outside contributions, `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`) |
| Deploys    | each app's target named only; CI never deploys (`devops`)                                                           |

## Add-run

The app already has the house markers, so batches 1–3 are already decided on disk; asking again invites a contradiction. Ask one question: which Batch 4 and 5 integrations to add, listing only those not already present. Then:

- **Diff, never assume.** List the tree lines each selection owns and check each path; an existing file is an EDIT row or skipped, never overwritten.
- **Report drift the answers don't cover** as a separate list, and let the owner decide. Don't fold repairs into the manifest.
- **A structural change is not an add-run** — renaming a kind, moving `app/` into `src/`, splitting styles. Say so and stop.
