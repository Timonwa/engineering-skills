# The app tree

What one app looks like when this skill is done — listed the way a repo renders, folders first then files, each alphabetical. The rules behind the shape live in `code-structure`. Every line is annotated, and anything conditional says what turns it on; the server kinds are marked by the app shape that turns them on (`own backend` or `over an API`). Asset names follow `naming` — `logo` is the symbol plus the name, `icon` is the symbol on its own, and the suffix is the colour of the artwork itself.

The tree is drawn for the default UI foundation, Tailwind only. Lines marked **(Adire)** exist only when the interview chose a design system on Adire, which turns on the registry and its `components.json`, the theme layers in `src/styles/`, the router-agnostic `Link` with `LinkProvider` mounted in `providers.tsx`, and `ThemeScript` with its provider for dark mode on `[data-mode]`; how each is set up is Adire's own skill. Another library the owner names is wired as the base library per its own docs or skill.

## Contents

- The repo root
- `src/app/` — routes
- `src/components/` — pages by product area
- `src/ui/` — the app's own tiers
- `src/lib/` — the kinds and the server boundary
- `src/styles/` and `src/testing/`

## The repo root

```txt
.
|___ __mocks__/                          # manual mocks for the SDKs tests can't run, each export
|                                        # typed with the SDK's own signature; only if tests mock an SDK
|___ _docs/                              # project docs - guides, specs, runbooks
|    |___ README.md                      # the folder map, and which doc a newcomer reads first
|___ _reports/                           # audit output, committed - the diff shows what got fixed
|    |___ README.md                      # each report, how to refresh it, how to read severity
|___ .claude/                            # agent config, one folder per agent the team uses
|    |                                   # (.claude/, .cursor/, .gemini/); Claude Code's shown
|    |___ agents/                        # project-only subagents, if any
|    |___ skills/                        # project-only skills, if any
|    |___ README.md                      # what is invocable, what the settings do, how to add
|    |___ settings.json                  # shared: permissions, hooks
|    |___ settings.local.json            # personal overrides, gitignored
|___ .github/                            # everything GitHub itself reads
|    |___ actions/                       # reusable composite actions
|    |    |___ setup/                    # the one setup step every job calls
|    |         |___ action.yml           # pnpm + Node from .nvmrc + install; checkout stays in the workflow
|    |___ ISSUE_TEMPLATE/                # the forms new issues start from
|    |    |___ bug_report.md             # repro steps, expected vs actual
|    |    |___ config.yml                # template chooser + external links
|    |    |___ documentation.md          # docs-only issues
|    |    |___ feature_request.md        # problem first, proposal second
|    |    |___ general.md                # anything the other templates miss
|    |___ workflows/                     # CI and repo automation
|    |    |___ auto-assign.yml           # assigns an owner when a PR opens
|    |    |___ ci.yml                    # parallel jobs: format, lint-and-types, build, test, stories;
|    |    |                              # checks only - CI never deploys (devops)
|    |    |___ codeql.yml                # SAST scanning on push and PR
|    |    |___ issue-label.yml           # labels issues from their template
|    |    |___ label.yml                 # PR labels by changed path and by commit type
|    |    |___ pr-title.yml              # PR titles must be Conventional Commits; only if team-maintained
|    |    |___ release-notes.yml         # release-drafter: a release and tag on every push to main
|    |    |___ stale.yml                 # closes abandoned issues and PRs
|    |___ CODEOWNERS                     # required reviewers per path; only if team-maintained
|    |___ dependabot.yml                 # grouped version updates; only if updates = Dependabot (default)
|    |___ labeler.yml                    # the path -> label map label.yml reads
|    |___ pull_request_template.md       # the checklist every PR opens with
|    |___ release-notes.yml              # release-drafter's categories and the labels that bump the version
|___ .husky/                             # git hooks, installed by `prepare`
|    |___ commit-msg                     # runs commitlint; only if team-maintained
|    |___ pre-commit                     # runs lint-staged - Prettier over the staged files only
|___ .storybook/                         # only if Storybook = yes
|    |___ main.ts                        # stories glob, addons, framework
|    |___ preview.tsx                    # global decorators, the style import, a11y config
|___ .vscode/                            # editor settings every contributor shares
|    |___ extensions.json                # recommends the Prettier and ESLint extensions
|    |___ settings.json                  # format-on-save with Prettier
|___ public/                             # Next serves this at the root; the subfolders are ours
|    |___ .well-known/security.txt       # a public site: where to report a vulnerability
|    |                                   # (RFC 9116); its Expires date is renewed yearly
|    |___ docs/                          # downloadables - press kit, whitepapers
|    |___ video/                         # streamed by URL; long-form belongs on a CDN
|    |___ android-chrome-192x192.png     # manifest icon, 192px
|    |___ android-chrome-512x512.png     # manifest icon, 512px
|    |___ icon-dark.svg                  # symbol only, dark
|    |___ icon-light.svg                 # symbol only, light
|    |___ icon.svg                       # symbol only, brand colour - the default
|    |___ llms.txt                       # what AI crawlers may use
|    |___ logo-dark.svg                  # symbol + name, dark
|    |___ logo-light.svg                 # symbol + name, light
|    |___ logo.svg                       # symbol + name, brand colour - the default
|___ scripts/                            # maintenance scripts
|    |___ check-env.mjs                  # fails when .env and .env.example name different keys;
|                                        # run as `check:env`, and CI runs it
|___ src/                                # everything importable, behind the `@/*` alias
|    |___ app/                           # routes only - see below
|    |___ assets/                        # the only assets folder - things code imports
|    |    |___ fonts/                    # only self-hosted faces; a Google font needs no files
|    |    |___ images/                   # every UI image - imported, so dimensions are inferred
|    |___ components/                    # pages and features by product area - see below
|    |___ content/                       # the MDX itself; only if the app ships prose
|    |    |___ blog/                     # one folder per content type, one file per entry
|    |    |___ drafts/                   # not published; the loader skips this folder
|    |    |___ newsletter/               # one file per issue, same frontmatter contract
|    |___ lib/                           # everything that isn't a component - see below
|    |___ styles/                        # the only CSS in the project - see below
|    |___ testing/                       # fixtures and fakes the tests share - see below
|    |___ ui/                            # the app's own reusable UI - see below
|    |___ instrumentation.ts             # register() starts error tracking or tracing, and
|    |                                   # onRequestError reports server errors; only if chosen
|    |___ proxy.ts                       # the kill-switch gate and header rewrites; beside app/
|___ .editorconfig                       # whitespace rules every editor honours
|___ .env.example                        # every key the app reads, names only - no values, no comments
|___ .gitignore                          # includes .env*, next-env.d.ts, build output
|___ .nvmrc                              # 24 - one Node version for devs, CI, and the host
|___ .prettierignore                     # build output and the lockfile
|___ .prettierrc.json                    # Prettier formats every file type; proseWrap preserve
|___ AGENTS.md                           # conventions for agents
|___ commitlint.config.ts                # Conventional Commits via commit-msg; only if team-maintained
|___ components.json                     # (Adire) the registry CLI's config, so an install writes here
|___ .gitattributes                      # * text=auto eol=lf - the same line endings on every OS
|___ CODE_OF_CONDUCT.md                  # only if the repo takes outside contributions
|___ CONTRIBUTING.md                     # only if the repo takes outside contributions
|___ eslint.config.mjs                   # the starter's flat config + eslint-config-prettier and only-warn
|___ LICENSE                             # required the moment the repo goes public
|___ lint-staged.config.mjs              # what pre-commit runs: prettier --write, staged files only
|___ next-env.d.ts                       # generated on dev/build; gitignored, never committed
|___ next.config.ts                      # cacheComponents, typedRoutes, security headers
|___ package.json                        # scripts + deps, the ticked house packages among them;
|                                        # exact pnpm 11 packageManager, engines.node >=24
|___ playwright.config.ts                # only if E2E = yes
|___ pnpm-lock.yaml                      # always committed; CI installs --frozen-lockfile
|___ pnpm-workspace.yaml                 # even standalone: the allowBuilds map
|___ postcss.config.mjs                  # loads the Tailwind v4 plugin
|___ README.md                           # what this is and how to run it
|___ renovate.json                       # dependency updates; only if updates = Renovate
|___ SECURITY.md                         # public repos - how to report a hole privately
|___ tsconfig.json                       # strict, `@/*` -> src/*
|___ vitest.config.ts                    # only if unit tests = yes
|___ vitest.setup.ts                     # resets mocks after each test, seeds the env guard's keys,
                                         # mocks server-only; only if unit tests = yes
```

## `src/app/` — routes

Routes only — thin files, no components, no logic. This is one app holding every area, so the URL divides them: the main pages sit at the root, and the signed-in and operator areas take a real segment (`/dashboard`, `/admin`). In a workspace where each area is its own app, a route never repeats its app's name — see the workspace trees.

```txt
src/app/
|___ (admin)/                            # the operator routes
|    |___ admin/                         # real segment, so every URL here starts /admin
|    |    |___ feature-flags/            # route segment; only if feature flags = yes
|    |    |    |___ page.tsx             # thin entry, imports the composed page
|    |    |___ users/                    # route segment
|    |         |___ page.tsx             # thin entry, imports the composed page
|    |___ error.tsx                      # covers every page in the group, not just one
|    |___ layout.tsx                     # renders AdminLayout; redirects a non-staff visitor behind
|    |                                   # <Suspense> - a convenience, the real check sits beside the data
|    |___ loading.tsx                    # the group's Suspense fallback
|___ (auth)/                             # the sign-in, sign-up, and reset routes
|    |___ auth/                          # real segment, so every URL here starts /auth
|    |    |___ forgot-password/          # route segment
|    |    |    |___ page.tsx             # thin entry, imports the composed page
|    |    |___ login/                    # route segment
|    |    |    |___ page.tsx             # thin entry, imports the composed page
|    |    |___ signup/                   # route segment
|    |    |    |___ page.tsx             # thin entry, imports the composed page
|    |    |___ page.tsx                  # thin entry, imports the composed auth landing page
|    |___ layout.tsx                     # thin entry, renders ui/layouts/AuthLayout
|___ (dashboard)/                        # the signed-in product area
|    |___ dashboard/                     # real segment, so every URL here starts /dashboard - this
|    |    |                              # one app holds every area, so the URL divides them
|    |    |___ overview/                 # route segment: /dashboard/overview
|    |    |    |___ page.tsx             # thin entry, imports the composed page
|    |    |___ settings/                 # route segment: /dashboard/settings
|    |         |___ page.tsx             # thin entry, imports the composed page
|    |___ error.tsx                      # thin client entry; covers the whole group, not one page
|    |___ layout.tsx                     # renders DashboardLayout; redirects a signed-out visitor behind
|    |                                   # <Suspense> - a convenience, the real check sits beside the data
|    |___ loading.tsx                    # the group's Suspense fallback
|___ (legal)/                            # the policy and terms routes, sharing a layout
|    |___ cookies/                       # route segment
|    |    |___ page.tsx                  # thin entry, imports the composed page
|    |___ privacy/                       # route segment
|    |    |___ page.tsx                  # thin entry, imports the composed page
|    |___ terms/                         # route segment
|    |    |___ page.tsx                  # thin entry, imports the composed page
|    |___ layout.tsx                     # thin entry, renders ui/layouts/LegalLayout
|___ (marketing)/                        # the public sales routes, sharing a layout
|    |___ about/                         # route segment
|    |    |___ page.tsx                  # thin entry, imports the composed page
|    |___ pricing/                       # route segment
|    |    |___ page.tsx                  # thin entry, imports the composed page
|    |___ layout.tsx                     # renders MarketingLayout + constants/nav.constant.ts
|    |___ page.tsx                       # thin entry, imports the composed home page
|___ api/                                # only if something outside these pages calls in
|    |___ docs/                          # the OpenAPI spec + the page that renders it; only if an API reference = yes
|    |    |___ openapi/                  # the generated spec, built from the route registry
|    |    |    |___ route.ts             # serves the JSON
|    |    |___ route.ts                  # serves the browsable reference
|    |___ v1/                            # versioned, so a breaking change adds v2
|         |___ admin/                    # the operator-only surface, behind a role check
|         |    |___ feature-flags/       # only if feature flags = yes
|         |         |___ [flagId]/       # publish, archive, or reschedule one flag
|         |         |    |___ route.ts   # the single-flag operations
|         |         |___ route.ts        # list the catalogue, create a draft
|         |___ cron/                     # scheduled work, one dispatcher the scheduler calls
|         |    |___ route.ts             # verifies the scheduler, then runs the due tasks
|         |___ health/                   # liveness, not behind auth
|         |    |___ route.ts             # what the deploy health-check hits
|         |___ public/                   # unauthenticated reads the maintenance page needs
|         |    |___ maintenance-window/  # only if a kill switch = yes
|         |         |___ route.ts        # readable while everything else returns 503
|         |___ webhooks/                 # provider callbacks, one folder per provider; built with
|         |                              # the feature that needs one, never by the scaffold
|              |___ <provider>/          # verifies the signature, dedups, then queues
|                   |___ route.ts        # the endpoint the provider posts to
|___ unauthorized/                       # where a failed guard sends a signed-out visitor
|    |___ page.tsx                       # thin entry, imports the composed page
|___ apple-icon.png                      # iOS home-screen icon; tag injected too
|___ error.tsx                           # thin client entry, fallback for the groups with none
|___ favicon.ico                         # legacy fallback; only works at the app root
|___ global-error.tsx                    # catches the root layout; self-contained, no app styles
|___ icon.svg                            # .svg or .png; wins over the .ico where supported
|___ layout.tsx                          # imports globals.css, sets the metadata base, renders
|                                        # providers.tsx; never reads the session. (Adire) ThemeScript in <head>
|___ manifest.ts                         # generated; a public/site.webmanifest would win instead
|___ not-found.tsx                       # thin entry, imports the composed 404
|___ opengraph-image.tsx                 # ImageResponse OG card
|___ providers.tsx                       # every client provider in one place, so layout.tsx stays a
|                                        # server component: ThemeProvider from @timonwa/react-hooks
|                                        # (only with a theme toggle), FlagProvider (flags = yes).
|                                        # (Adire) LinkProvider (hands next/link to the router-agnostic
|                                        # Link, so no call site passes it) and Adire's theme provider
|___ robots.ts                           # generated; a public/robots.txt would silently win
|___ sitemap.ts                          # generated from routes.ts, never a static file
```

## `src/components/` — pages by product area

`.tsx` only, plus colocated stories and tests. One folder per product area; inside it, one folder per page, nested the way its URL is. A route group that is one area (marketing, auth, legal) is one folder; a group that holds many areas (the dashboard) gives each feature its own folder.

```txt
src/components/
|___ _shared/                            # widgets several features use, specific to this app;
|    |                                   # grouped by concern, each group with a barrel of its
|    |                                   # client-safe exports (server-coupled components are
|    |                                   # imported by path); no root _shared barrel
|    |___ providers/                     # the app's own client providers; only if flags = yes
|         |___ FlagProvider.tsx          # takes the server-resolved flags
|         |___ index.ts                  # the group barrel
|___ admin/                              # the operator screens
|    |___ feature-flags/                 # pairs with app/(admin)/admin/feature-flags/
|    |    |___ FlagTableSection.tsx      # one file per section
|    |    |___ index.tsx                 # the only thing page.tsx imports
|    |___ users/                         # pairs with app/(admin)/admin/users/
|         |___ index.tsx                 # composes this page's sections
|         |___ UserTableSection.tsx      # one file per section
|___ auth/                               # the sign-in, sign-up, and reset screens
|    |___ forgot-password/               # pairs with app/(auth)/auth/forgot-password/
|    |    |___ ForgotPasswordForm.tsx    # this page's only section
|    |    |___ index.tsx                 # the only thing page.tsx imports
|    |___ login/                         # pairs with app/(auth)/auth/login/
|    |    |___ index.tsx                 # composes this page's sections
|    |    |___ LoginForm.tsx             # this page's only section
|    |___ signup/                        # pairs with app/(auth)/auth/signup/
|    |    |___ index.tsx                 # composes this page's sections
|    |    |___ SignupForm.tsx            # this page's only section
|    |___ index.tsx                      # pairs with app/(auth)/auth/ - the method chooser
|___ errors/                             # what the error and not-found route files render
|    |___ error/                         # pairs with every error.tsx - a client component
|    |    |___ index.tsx                 # takes the error + reset, renders ErrorLayout
|    |___ global-error/                  # pairs with app/global-error.tsx
|    |    |___ index.tsx                 # inlines its styles - globals.css never loads here
|    |___ maintenance/                   # what the 503 renders; only if a kill switch = yes
|    |    |___ index.tsx                 # reads the window from the public endpoint
|    |___ not-found/                     # pairs with app/not-found.tsx
|    |    |___ index.tsx                 # composes this page's content
|    |___ unauthorized/                  # pairs with app/unauthorized/
|         |___ index.tsx                 # a real route, unlike the three above
|___ guards/                             # client-side gates; only if RBAC = yes
|    |___ RequireRole.tsx                # hides what can() denies; never the only check
|___ legal/                              # the policy and terms screens
|    |___ cookies/                       # pairs with app/(legal)/cookies/
|    |    |___ index.tsx                 # the only thing page.tsx imports
|    |___ privacy/                       # pairs with app/(legal)/privacy/
|    |    |___ index.tsx                 # composes this page's content
|    |___ terms/                         # pairs with app/(legal)/terms/
|         |___ index.tsx                 # composes this page's content
|___ marketing/                          # the public sales screens
|    |___ about/                         # pairs with app/(marketing)/about/
|    |    |___ index.tsx                 # composes this page's sections
|    |    |___ StorySection.tsx          # one file per section
|    |___ home/                          # pairs with app/(marketing)/ - the root route
|    |    |___ CtaSection.tsx            # one file per section
|    |    |___ FeaturesSection.tsx       # a second section, same rule
|    |    |___ HeroSection.tsx           # a third
|    |    |___ index.tsx                 # the only thing page.tsx imports
|    |___ pricing/                       # pairs with app/(marketing)/pricing/
|         |___ data.ts                   # stub records; delete it when the real source lands
|         |___ index.tsx                 # composes this page's sections
|         |___ PlansSection.tsx          # one file per section
|___ overview/                           # a dashboard feature: pairs with app/(dashboard)/dashboard/overview/
|    |___ _shared/                       # shared within this feature only
|    |___ index.tsx                      # the only thing page.tsx imports
|    |___ StatsSection.tsx               # one file per section
|    |___ WelcomeSection.tsx             # a second section
|___ settings/                           # a dashboard feature: pairs with app/(dashboard)/dashboard/settings/
     |___ index.tsx                      # composes this page's sections
     |___ ProfileSection.tsx             # one file per section
```

## `src/ui/` — the app's own tiers

The app's own reusable UI in three tiers, one folder per component, whatever the UI foundation. In a workspace it holds only what no shared UI package provides. Links are plain `next/link` unless Adire.

```txt
src/ui/
|___ base/                               # atoms: render one thing, no sub-components
|    |___ Badge/                         # one folder per component
|    |    |___ Badge.stories.tsx         # one per tone
|    |    |___ index.tsx                 # the component - renders a label, so no test to write
|    |___ Button/
|    |    |___ Button.stories.tsx        # the variants, states, and sizes
|    |    |___ Button.test.tsx           # the disabled and loading states have logic
|    |    |___ index.tsx                 # the component
|    |___ Link/                          # (Adire) the router-agnostic link every component renders
|    |    |___ index.tsx                 # (Adire) ships LinkProvider; providers.tsx mounts it with next/link
|    |___ ThemeScript/                   # (Adire) an inline <script> the root layout renders in <head>
|    |    |___ index.tsx                 # (Adire) sets data-mode from the stored choice or the OS
|    |                                   # before first paint; no story - it renders nothing to show
|    |___ index.ts                       # the tier barrel
|___ blocks/                             # composed of base, owns its own state, plus the page regions
|    |___ Accordion/                     # one folder per component
|    |    |___ Accordion.stories.tsx     # single-open and multi-open
|    |    |___ Accordion.test.tsx        # it owns open/closed state, so assert it
|    |    |___ index.tsx                 # the component; ships AccordionItem as a named export
|    |___ Card/
|    |    |___ Card.stories.tsx          # surface, padding, and the content slots
|    |    |___ index.tsx                 # the component - renders children, so no test to write
|    |___ Footer/                        # the app passes its links from constants/
|    |    |___ Footer.stories.tsx        # every column group, and the narrow layout
|    |    |___ index.tsx                 # the component - renders the links it is given, so no test
|    |___ Hero/                          # the hero the marketing pages share
|    |    |___ index.tsx                 # the component
|    |___ MinimalFooter/                 # the legal and auth variant - legal links only
|    |___ Navbar/                        # the app passes its nav items from constants/
|    |    |___ index.tsx                 # the component
|    |    |___ Navbar.stories.tsx        # signed in, signed out, and the mobile menu
|    |    |___ Navbar.test.tsx           # the mobile menu traps focus, so assert it
|    |___ PageHeading/                   # the title + description pair every page repeats
|    |    |___ index.tsx                 # the component
|    |    |___ PageHeading.stories.tsx   # with and without the description
|    |___ Sidebar/                       # the app passes the signed-in nav items
|    |___ index.ts                       # the tier barrel
|___ layouts/                            # the page shells, taking regions as slot props
|    |___ AdminLayout/                   # denser than the dashboard, tables over cards
|    |___ AuthLayout/                    # centred card, no nav - nothing to click away to
|    |    |___ AuthLayout.stories.tsx    # a form slotted in, at both breakpoints
|    |    |___ index.tsx                 # the component - pure composition, so no test to write
|    |___ DashboardLayout/               # takes the sidebar as a slot, never imports it
|    |    |___ DashboardLayout.stories.tsx  # sidebar open and collapsed
|    |    |___ DashboardLayout.test.tsx  # it remembers the collapsed state
|    |    |___ DashboardLayoutSkeleton.tsx  # the static shell the group layout's Suspense shows
|    |    |___ index.tsx                 # the component
|    |___ ErrorLayout/                   # the shared shell for error, 404, and unauthorized
|    |___ LegalLayout/                   # minimal chrome and a reading measure, not marketing
|    |___ MarketingLayout/               # full navbar + footer; home, about, pricing
|    |___ index.ts                       # the tier barrel
|___ index.ts                            # re-exports every tier
```

## `src/lib/` — the kinds and the server boundary

Kind-first, flat inside each kind — never a feature folder. Which kinds `server/` holds depends on where the app's data comes from (`code-structure`):

- **own backend** — the app talks to its store and services itself: `actions/`, `services/`, `data/` (store access), `clients/`, `utils/`.
- **over an API** — the app reads and writes only through an API it doesn't contain: `actions/`, `data/` (the API reads, with their caching), `utils/`.

```txt
src/lib/
|___ config/                             # the app's own settings, bare names
|    |___ endpoints.ts                   # every API path - never a literal URL in a caller
|    |___ env.ts                         # Zod-validated at boot; fails the deploy, not a request
|    |___ index.ts                       # the kind barrel - server-only, because it re-exports env;
|    |                                   # client code imports @/lib/config/routes by path
|    |___ routes.ts                      # every page path; its own RouteTable type, `as const satisfies`
|    |___ site.ts                        # canonical name, URL, OG defaults; per-tier values keyed off APP_ENV
|___ constants/                          # frozen domain values, no logic
|    |___ auth.constant.ts               # sign-in methods, referral sources
|    |___ feature-flag.constant.ts       # the typed flag-name union; only if flags = yes
|    |___ index.ts                       # the kind barrel, one explicit export line per file
|    |___ nav.constant.ts                # the links the navbar and footer both render
|    |___ <domain>.constant.ts           # one domain's frozen values plus its inferred type
|___ data/                               # static content records, no fetching
|    |___ faq.data.ts                    # the questions the marketing pages render
|    |___ index.ts                       # the kind barrel, one explicit export line per file
|    |___ plan.data.ts                   # the pricing tiers and what each includes
|    |___ <domain>.data.ts               # one domain's records, typed by types/
|___ hooks/                              # client-side React hooks. General hooks come from
|    |                                   # @timonwa/react-hooks (Firebase auth flows from
|    |                                   # @timonwa/firebase-hooks) when ticked; this kind holds only
|    |                                   # what they lack
|    |___ index.ts                       # the kind barrel, one explicit export line per file
|    |___ use-<subject>.ts               # one hook, named for what it gives you
|___ schemas/                            # Zod schemas with their inferred types; in a workspace the
|    |                                   # shared ones live in the contracts package instead
|    |___ index.ts                       # the kind barrel, one explicit export line per file
|    |___ shared.schema.ts               # cross-domain primitives - timestamp, pagination, email
|    |___ <domain>.schema.ts             # one domain's schemas, each with its inferred type
|___ seo/                                # the app's metadata factory and structured-data builders
|    |___ index.ts                       # the kind barrel
|    |___ metadata.ts                    # buildMetadata, seeded from config/site.ts
|    |___ structured-data.ts             # the JSON-LD builders
|___ server/                             # the one non-kind folder - a hard runtime boundary
|    |___ actions/                       # both shapes: the mutations a form or client handler invokes
|    |    |___ auth.action.ts            # sign in, sign out, request a reset
|    |    |___ index.ts                  # the kind barrel
|    |    |___ user.action.ts            # update the profile, delete the account
|    |    |___ <domain>.action.ts        # one domain's Server Actions
|    |___ clients/                       # own backend: one configured SDK singleton per service
|    |    |___ cloudinary/               # only if image delivery = Cloudinary
|    |    |    |___ client.ts            # the configured SDK every caller reuses
|    |    |    |___ index.ts             # the client barrel; URL builders come from @timonwa/app-utilities
|    |    |___ email/                    # only if the app sends mail
|    |    |    |___ client.ts            # one agent per mail type, each with its token
|    |    |    |___ index.ts             # the client barrel
|    |    |___ firebase/                 # only if store = Firebase
|    |    |    |___ client.ts            # lazy Firestore, Auth, and Storage singletons
|    |    |    |___ index.ts             # the client barrel
|    |    |    |___ rest.ts              # the auth flows the Admin SDK cannot do
|    |    |___ payments.client.ts        # only if payments = yes: the provider's SDK client (Stripe,
|    |    |                              # Paystack, or the one named), initialised and nothing more
|    |    |___ redis/                    # only if the app needs a shared cache
|    |    |    |___ client.ts            # the one connection; never a second `new Redis()`
|    |    |    |___ index.ts             # the client barrel
|    |    |    |___ keys.ts              # every key built here; inline strings are banned. Locks,
|    |    |                              # dedup and cache helpers arrive with their first use (`redis`)
|    |    |___ index.ts                  # the kind barrel
|    |    |___ <service>.client.ts       # a one-file client needs no folder
|    |___ data/                          # own backend: store access, the only place queries live.
|    |    |                              # over an API: the API reads, each with `use cache`,
|    |    |                              # cacheLife and cacheTag (nextjs)
|    |    |___ auth.data.ts              # own backend: the session record, read and written
|    |    |___ batch.data.ts             # own backend: commits each batch as it fills, past the write cap
|    |    |___ collections.data.ts       # own backend: every collection path; no literal elsewhere
|    |    |___ index.ts                  # the kind barrel
|    |    |___ user.data.ts              # the user record: queried (own backend) or fetched (over an API)
|    |    |___ <domain>.data.ts          # one domain's reads
|    |___ services/                      # own backend: business logic the routes and actions call
|    |    |___ auth.service.ts           # verifies the session, returns the caller or throws
|    |    |___ feature-flag-cron.service.ts  # reconciles scheduled flags each tick; only if flags = yes
|    |    |___ feature-flag.service.ts   # the evaluation ladder; only if flags = yes
|    |    |___ index.ts                  # the kind barrel
|    |    |___ user.service.ts           # the only caller of user.data.ts
|    |    |___ <domain>.service.ts       # one domain's business logic
|    |___ utils/                         # helpers that must never reach the browser
|    |    |___ action-result.utils.ts    # both shapes: the success and error shapes actions return
|    |    |___ api.utils.ts              # over an API: the typed fetchers and session helpers
|    |    |___ auth-guard.utils.ts       # own backend: the session + permission check every route runs
|    |    |___ encryption.utils.ts       # own backend: AES-256-GCM field encryption; only if needed
|    |    |___ errors.utils.ts           # own backend: the typed error classes routes throw
|    |    |___ index.ts                  # the kind barrel
|    |    |___ list-params.utils.ts      # own backend: cursor, limit, and filter parsing for lists
|    |    |___ logger.utils.ts           # structured server logs, never console.log
|    |    |___ rate-limit.utils.ts       # own backend: the wrapper that caps a route by tier
|    |    |___ response.utils.ts         # own backend: the shared success and error builders
|    |    |___ sanitize.utils.ts         # own backend: strips fields no caller should ever receive
|    |___ index.ts                       # `server-only` barrel, never mixed with client code. Exports
|                                        # actions + services (own backend) or actions + data and the
|                                        # identity helpers a guard calls (over an API)
|___ types/                              # shapes with no const or schema behind them
|    |___ auth.type.ts                   # the session and caller shapes
|    |___ index.ts                       # the kind barrel, one explicit export line per file
|    |___ nav.type.ts                    # the shape nav.constant.ts satisfies; href typed `Route`
|    |___ <domain>.type.ts               # one domain's shared shapes
|___ utils/                              # pure helpers. General helpers come from
     |                                   # @timonwa/app-utilities when ticked; this kind holds only
     |                                   # what it lacks
     |___ browser.utils.ts               # isBrowser, feature and platform detection
     |___ cn.ts                          # the class-merge helper every component uses: twMerge over clsx
     |___ color.utils.ts                 # contrast ratios and colour-space conversions
     |___ cookie.utils.ts                # read, write, and delete browser cookies
     |___ cookieconsent.utils.ts         # the consent config; only if consent = yes
     |___ form.utils.ts                  # FormData to object, and dirty-field diffing
     |___ image.utils.ts                 # dimensions and aspect ratios
     |___ index.ts                       # the kind barrel, one explicit export line per file
     |___ maintenance.utils.ts           # window maths; only if a kill switch = yes
     |___ mdx-loader.utils.ts            # reads src/content; only if the app ships prose
     |___ storage.utils.ts               # bucket paths and public URLs; only if uploads
     |___ upload.utils.ts                # the app's upload caps around the package's compression
     |                                   # and file validators; only if uploads
     |___ url.utils.ts                   # query-string building
     |___ <domain>.utils.ts              # anything this app alone needs
```

## `src/styles/` and `src/testing/`

One Tailwind compilation per app. Tailwind only: one `globals.css` entry with the tokens, plus only the layer files the app needs; dark mode follows the OS (`prefers-color-scheme`), and a theme toggle adds a `data-theme` variant and a pre-paint script. **(Adire)** the theme layers come from the registry, with dark mode on `[data-mode="dark"]` set by `ThemeScript` before first paint (`tailwind`).

```txt
src/styles/
|___ themes/                             # (Adire) one file per theme
|    |___ <name>.css                     # (Adire) the ramps in @theme, the semantic roles on :root
|                                        # and [data-mode="dark"] with a prefers-color-scheme
|                                        # fallback, then @theme inline exposing the roles
|___ animations.css                      # @keyframes and the classes using them; only once the app has some
|___ base.css                            # (Adire) element defaults, in @layer base
|___ components.css                      # authored classes, in @layer components; only once a class
|                                        # pattern repeats
|___ forms.css                           # (Adire) form-control defaults
|___ globals.css                         # the only entry a layout imports. Tailwind only: the ramps in
|                                        # @theme, the semantic roles on :root with their
|                                        # prefers-color-scheme dark overrides, @theme inline exposing
|                                        # the roles (hex or OKLCH), @layer base, then the imports of
|                                        # the files here; the `dark` variant on [data-theme="dark"]
|                                        # only with a theme toggle. (Adire) the one list of the layer
|                                        # order, and the `dark` variant on [data-mode="dark"]
|___ overrides.css                       # (Adire) single-value tweaks; after the theme, so source order wins
|___ prose.css                           # long-form typography; only if the app ships prose
|___ themes.css                          # (Adire) which theme is active - imports themes/<name>.css
|___ typography.css                      # (Adire) the type scale and heading defaults
|___ utilities.css                       # @utility definitions and motion tokens; only once the app has some

src/testing/                             # only if unit tests = yes; what the tests share (testing)
|___ next-headers.fake.ts                # an in-memory cookie and header store for next/headers
|___ render-with-providers.tsx           # renders through the providers the app uses
|___ user.fixture.ts                     # buildUser - one builder per sample record
|___ <service>.fake.ts                   # a working in-memory stand-in for a dependency
```
