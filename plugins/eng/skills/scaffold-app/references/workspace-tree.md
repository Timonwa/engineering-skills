# The workspace trees

Three trees, because a workspace holds three different shapes. Read the one you need.

## Contents

- [The workspace tree](#the-workspace-tree) — the root: `apps/`, `packages/`, `functions/`, `extensions/`, and the config that governs them
- [The frontend app tree](#the-frontend-app-tree) — every app under `apps/` that renders pages, as a frontend over `apps/api`
- [The backend app tree](#the-backend-app-tree) — `apps/api`: route handlers over a service layer, Firebase-flavoured

Folders first then files, each alphabetical. Every line is annotated, and anything conditional says what turns it on.

The trees are drawn for the default UI foundation, Tailwind only. Lines marked **(Adire)** exist only when the interview chose a design system on Adire, which turns on the registry and its `components.json`, the shared `packages/ui` tiers built on it (foundations, assets, icons, base, components, blocks, layouts, pages), the `tailwind-config` theme files and contrast check, the router-agnostic `Link` with `LinkProvider` mounted in each app's `providers.tsx`, and `ThemeScript` with its provider for dark mode on `[data-mode]`; how each is set up is Adire's own skill. Without Adire, `packages/ui` (if any) holds the shared components in the same base / blocks / layouts tiers as an app. Another library the owner names is wired as the base library per its own docs or skill.

**Read an unmarked line as required, not as an example.** A file named here without an "only if" is part of the standard: something else in the tree assumes it exists. `REQUIRED if <feature>` marks the ones whose trigger is a feature rather than the framework — a client hook that is the only half of a server feature the browser can run, for instance. The `<domain>`- and `<name>`-style placeholders are the only genuinely illustrative lines, and they say so by being placeholders.

**A monorepo mirrors the single app as closely as possible — same kinds, same `<domain>.<kind>.ts` grammar, same one-explicit-export barrels.** What changes is only _where_ a kind lives, never its shape. The rules behind the shape live in `code-structure`.

Four consequences worth stating, because they are where a monorepo actually differs:

- **Every kind exists in both places, and consumer count decides which — that one rule replaces every "does this folder still exist" question.** `packages/hooks` and an app's `lib/hooks/` are the same kind under the same grammar: **two or more consumers → the package; one → that app.** So `src/ui/`, `lib/hooks/`, `lib/utils/`, `lib/constants/` and the rest **do not disappear from a workspace app** — they keep exactly what only that app uses. A one-app-only date formatter belongs in `apps/site/src/lib/utils/`, and hoisting it to `packages/utils` to look tidy makes every other app rebuild for a change none of them care about. Moving one either way is a file move and an import swap, never a rewrite — so start local and promote when the second consumer appears.
- **What the tree below shows is the thin end of that rule, not a ceiling.** Each app-local folder is drawn with the little that is genuinely app-scoped, because that is the case people get wrong: they scaffold every kind full of code the packages already own. Read a sparse folder as "this holds what is yours alone", never as "this may not grow". An app can legitimately carry a large `lib/utils/` and a full `src/ui/` — an app with its own backend inside a workspace often does.
- **`apps/` is for deployables, and the list below is a menu.** `site` (the main website) is the default; the interview decides the rest — `dashboard` (the signed-in product), `admin` (the back office), `api`. `admin` earns its own app when ops needs a separate domain and auth surface; otherwise it stays an `/admin` area inside one app. **A route never repeats its app's name:** the admin app's users page is `/users`, the dashboard's settings page `/settings`; only `api` keeps its prefix (`/api/v1/...`). `storybook` **is deployable**: on a team with designers or reviewers who need to open a URL and click the real components, it gets a host and an auth gate like any other app. Solo, it stays a local `dev` surface.
- **Every app and every package carries its own `README.md` and `AGENTS.md`.** No exceptions, including config-only packages. The root files cover the workspace; the local ones add what only that folder knows, never repeating the root.

## The workspace tree

```txt
.
|___ _docs/                              # workspace docs - guides, specs, runbooks
|    |___ README.md                      # the folder map, and which doc a newcomer reads first
|___ _reports/                           # audit output, committed - the diff shows what got fixed
|    |___ README.md                      # each report, how to refresh it, how to read severity
|___ .claude/                            # Claude Code config for the whole workspace
|    |___ agents/                        # workspace-only subagents, if any
|    |___ skills/                        # workspace-only skills, if any
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
|    |    |                              # PRs run `--affected` with TURBO_SCM_BASE; never deploys
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
|___ .vscode/                            # editor defaults shared with contributors
|    |___ extensions.json                # recommends the Prettier and ESLint extensions
|    |___ settings.json                  # format-on-save with Prettier
|___ apps/                               # deployable surfaces, one folder each
|    |___ admin/                         # a frontend app - only when ops needs its own
|    |                                   # domain and auth; otherwise an /admin area in one app.
|    |                                   # Its routes never start /admin
|    |___ api/                           # the backend - see The backend app tree below
|    |___ help-center/                   # a frontend app - only when support content is public
|    |___ storybook/                     # documents packages/ui. A real app, not a dev
|    |    |                              # script: on a team, designers and reviewers open a
|    |    |                              # URL and click the actual components instead of
|    |    |                              # asking for a build. The hosting files below are
|    |    |                              # the optional part - drop them and it stays a
|    |    |                              # local `dev` surface; the rest of the tree is
|    |    |                              # the same either way
|    |    |___ .storybook/               # the only Storybook config in the workspace
|    |    |    |___ main.ts              # the stories glob, addons, framework, the Tailwind Vite plugin
|    |    |    |___ preview.tsx          # the stylesheet, the theme decorator, a11y config
|    |    |    |___ vitest.setup.ts      # the browser-mode setup the test addon needs
|    |    |___ public/                   # icons, and any fixture image a story renders
|    |    |___ src/
|    |    |    |___ _Template.stories.tsx  # copy this to start a new story file. The ONLY
|    |    |    |                         # story file in this app: every real one lives beside
|    |    |    |                         # its component in packages/ui, and main.ts reaches
|    |    |    |                         # them with a glob. A mirrored stories/base,
|    |    |    |                         # stories/blocks tree here would be a second copy of
|    |    |    |                         # the tier structure to keep in sync, and it silently
|    |    |    |                         # rots the moment a component is renamed or retiered.
|    |    |    |                         # The tier comes from the story `title`, which is
|    |    |    |                         # what groups the sidebar
|    |    |    |___ styles/
|    |    |         |___ globals.css     # one compilation for the stories and the components they
|    |    |                              # render: imports @<scope>/tailwind-config, @source packages/ui/src
|    |    |___ .gitignore                # storybook-static/ and the build cache
|    |    |___ AGENTS.md                 # the tier titles, and where stories live
|    |    |___ apphosting.yaml           # only if hosted: serves the static build, and puts
|    |    |                              # it behind auth. A public Storybook publishes every
|    |    |                              # unreleased component and its props
|    |    |___ eslint.config.mjs         # extends @<scope>/eslint-config, and adds
|    |    |                              # ignores: ["storybook-static/**"] - the shared
|    |    |                              # config only ignores dist/, so lint otherwise
|    |    |                              # scans this app's own build output
|    |    |___ package.json              # depends on every package it documents, and never
|    |    |                              # the reverse - the harness knows the components,
|    |    |                              # not the other way round
|    |    |___ README.md                 # how to run it, and how to add a story
|    |    |___ tsconfig.json             # extends @<scope>/typescript-config/react-library -
|    |    |                              # a Vite app, so a bundler resolves its imports
|    |    |___ vitest.config.ts          # runs every story as a browser test, with the a11y gate
|    |___ dashboard/                     # the signed-in product - The frontend app tree below;
|    |                                   # its routes never start /dashboard
|    |___ site/                          # the main website, the default - The frontend app tree below
|___ extensions/                         # only for a Firebase app that installs an extension -
|                                        # its settings committed; the extension itself is Firebase's
|    |___ <instance-id>.env              # one per installed instance, named for it: its settings;
|                                        # secrets are params, never values
|___ functions/                          # only for a Firebase app with workers: one codebase per folder
|                                        # each is its own package with its own deps, so a
|                                        # cold start loads one worker's tree and nothing else
|    |___ <worker>/                      # one folder per worker, named for what it does
|    |    |___ deploy/                   # what Firebase uploads: the esbuild bundle, with the
|    |    |                              # workspace packages inlined, and a generated package.json
|    |    |                              # pinning the resolved runtime versions; gitignored
|    |    |___ src/
|    |    |    |___ handlers/            # one file per trigger; the entry does no work itself
|    |    |    |___ lib/                 # the same kinds an app has, scoped to this worker
|    |    |    |___ index.ts             # exports each trigger; secrets are defineSecret(...), no .env
|    |    |___ package.json              # main deploy/index.js; build runs the bundle script; runtime
|    |    |                              # deps as resolved versions, because the cloud build's plain
|    |    |                              # npm install reads neither catalog: nor workspace:
|    |    |___ tsconfig.json             # extends @<scope>/typescript-config/node-library:
|    |                                   # a Cloud Function is loaded by Node, so it needs the
|    |                                   # same NodeNext resolution contracts does; type-check only
|    |___ .gitignore                     # deploy/ - the bundle is never committed
|    |___ package.json                   # names the folder only, and is not a workspace member -
|                                        # functions/* matches the worker folders beside it
|___ packages/                           # shared code, never deployed on its own
|                                        # a package holds the SHARED part of a kind; each
|                                        # app keeps the same kind for its own:
|                                        #   hooks -> packages/hooks   utils -> packages/utils
|                                        #   constants + schemas + types -> packages/contracts
|                                        #   fixtures and fakes (src/testing) -> packages/testing
|                                        # config and data have no package at all: env, routes,
|                                        # and site differ per deployment, and data is that
|                                        # app's own content
|    |___ contracts/                     # everything both sides of the wire must agree on
|    |    |                              # named for what it holds, not for one of its four
|    |    |                              # kinds - `schemas/` would undersell the constants,
|    |    |                              # types, and permission verbs sitting beside them
|    |    |___ src/
|    |    |    |___ constants/           # flat, one file per domain
|    |    |    |    |___ auth.constant.ts  # the const and its inferred type together
|    |    |    |    |___ index.ts        # the kind barrel
|    |    |    |    |___ <domain>.constant.ts  # one domain's frozen values
|    |    |    |___ permissions/         # the closed verb list, the role map, and can()
|    |    |    |    |___ can.ts          # the one predicate every guard calls; pure, so
|    |    |    |    |                    # the UI calls it too to hide what it cannot do
|    |    |    |    |___ index.ts        # the kind barrel
|    |    |    |    |___ permission.constant.ts  # every verb, grouped by intent
|    |    |    |    |___ role-hierarchy.ts  # who outranks whom, when roles nest
|    |    |    |    |___ role-permission.constant.ts  # the role -> verbs map
|    |    |    |___ schemas/             # Zod schemas; the parse boundary
|    |    |    |    |___ auth.schema.ts  # the schema and its inferred type together
|    |    |    |    |___ auth.schema.test.ts  # every refinement gets a spec, beside it
|    |    |    |    |___ index.ts        # the kind barrel
|    |    |    |    |___ shared.schema.ts  # timestamp, pagination, email - the primitives
|    |    |    |    |___ <domain>.schema.ts  # one domain's schemas
|    |    |    |___ types/               # only shapes no schema or const infers - UI state
|    |    |    |    |                    # that never crosses a wire
|    |    |    |    |___ index.ts        # the kind barrel
|    |    |    |    |___ <domain>.type.ts  # one domain's uninferred shapes
|    |    |    |___ index.ts             # re-exports every kind. Relative imports carry the
|    |    |                              # `.js` extension here - see node-library.json below
|    |    |___ AGENTS.md                 # the Zod-vs-plain-type rule, the .js extension, and
|    |    |                              # rebuild-then-restart after every change
|    |    |___ eslint.config.mjs         # extends @<scope>/eslint-config. Every package with
|    |    |                              # source of its own has one - a package that opts
|    |    |                              # out is a package CI does not lint
|    |    |___ package.json              # zod is a real dependency. `build` is plain
|    |    |                              # `tsc -p tsconfig.build.json` into dist/; nothing
|    |    |                              # post-processes the output. Consumers read dist/, so
|    |    |                              # after a change rebuild and restart what runs from it
|    |    |___ README.md                 # what belongs here and what does not
|    |    |___ tsconfig.build.json       # excludes the specs, so nothing test-only ships
|    |    |___ tsconfig.json             # extends @<scope>/typescript-config/node-library,
|    |                                   # because the API and the workers load it from Node
|    |___ eslint-config/                 # the shared lint config: one preset per kind of workspace
|    |    |___ AGENTS.md                 # which preset a target extends, and why
|    |    |___ base.js                   # the rules every workspace file obeys: eslint-config-prettier,
|    |    |                              # only-warn, turbo/no-undeclared-env-vars, the no-console
|    |    |                              # allowlist, and `_`-prefixed unused names
|    |    |___ next.js                   # base + the framework's own plugin rules
|    |    |___ package.json              # exports the presets; eslint is a peer dep
|    |    |___ react-internal.js         # base + the React rules, for the packages
|    |    |___ README.md                 # the rule set, and how to add one
|    |___ hooks/                         # cross-app React hooks, grouped by concern. General hooks
|    |    |                              # come from @timonwa/react-hooks and the Firebase auth flows
|    |    |                              # from @timonwa/firebase-hooks when ticked; this package
|    |    |                              # holds only what they lack
|    |    |___ __mocks__/                # the SDK mocks its specs use, re-exporting @<scope>/testing
|    |    |___ src/
|    |    |    |___ auth/                # only if auth = Firebase: wraps @timonwa/firebase-hooks/auth
|    |    |    |    |                    # with the hand-off to the API's session route, and never
|    |    |    |    |                    # re-implements sign-in
|    |    |    |    |___ index.ts        # the group barrel
|    |    |    |    |___ SessionProvider.tsx  # wraps the package's AuthProvider: onIdToken trades
|    |    |    |    |                    # the token for the API's session cookie, onBeforeSignOut
|    |    |    |    |                    # clears it; the server-fetched user comes in as a prop
|    |    |    |    |___ types.ts        # the Server Action shapes these hooks are handed
|    |    |    |    |___ use-<flow>.ts   # a package hook plus the API hand-off this product needs
|    |    |    |___ data/                # the client half of a server-resolved feature -
|    |    |    |    |                    # each one reads what the server already decided,
|    |    |    |    |                    # and none of them fetches a domain of its own
|    |    |    |    |___ FeatureFlagProvider.tsx  # REQUIRED if flags = yes: takes the
|    |    |    |    |                    # server-resolved flags, so no app re-fetches them
|    |    |    |    |___ index.ts        # the group barrel
|    |    |    |    |___ use-cursor-load-more.ts  # REQUIRED if the API paginates by cursor -
|    |    |    |    |                    # it is what makes an opaque cursor usable in the UI
|    |    |    |    |___ use-feature-flag.ts  # REQUIRED if flags = yes: reads the provider
|    |    |    |    |                    # above, single and plural. Nothing calls the flag
|    |    |    |    |                    # endpoint directly from a component
|    |    |    |    |___ use-list-params.ts  # keeps filters and page in the URL, so a list
|    |    |    |    |                    # view is linkable and survives a refresh
|    |    |    |    |___ use-maintenance-window.ts  # REQUIRED if a kill switch = yes: the
|    |    |    |                         # 503 boundary needs the window when the cached
|    |    |    |                         # layout value was stale, and this endpoint is the
|    |    |    |                         # one the proxy allow-lists during maintenance
|    |    |    |___ profile/             # who the caller is and what they may do. Its own
|    |    |    |    |                    # group, not part of auth/ - auth answers "are you
|    |    |    |    |                    # signed in", this answers "may you do this", and
|    |    |    |    |                    # they change for different reasons
|    |    |    |    |___ index.ts        # the group barrel
|    |    |    |    |___ use-permission.ts  # REQUIRED if RBAC = yes. Wraps the pure `can()`
|    |    |    |                         # from @<scope>/contracts, resolving the actor from the
|    |    |    |                         # auth context so a component asks `can(verb)` and
|    |    |    |                         # never re-derives a role. The UI gate only - the
|    |    |    |                         # route guard runs the same predicate server-side,
|    |    |    |                         # and that is the one that actually protects data
|    |    |    |___ testing/             # the fixtures and render helpers this package's tests share
|    |    |    |___ ui/                  # DOM hooks @timonwa/react-hooks lacks; only once there is one
|    |    |    |    |___ index.ts        # the group barrel
|    |    |    |    |___ use-<subject>.ts  # one hook, named for what it gives you
|    |    |    |___ index.ts             # re-exports every group
|    |    |___ AGENTS.md                 # when a hook is promoted here, and when it is not
|    |    |___ eslint.config.mjs         # extends @<scope>/eslint-config/react-internal
|    |    |___ package.json              # ships source, one export per group; peer-depends on
|    |    |                              # react, never bundles it; depends on the ticked house
|    |    |                              # hook packages
|    |    |___ README.md                 # the groups, and what each is for
|    |    |___ tsconfig.json             # extends @<scope>/typescript-config/react-library
|    |    |___ vitest.config.ts          # jsdom - every hook here renders
|    |___ tailwind-config/               # the CSS every app imports: the tokens, the fonts, and
|    |    |                              # PostCSS - what a single app keeps in src/styles/, moved
|    |    |                              # here whole. Each app's globals.css shrinks to importing
|    |    |                              # this, plus its own composed classes
|    |    |___ fonts/                    # the self-hosted faces every app loads. Here rather
|    |    |    |                         # than in each app's public/, so two apps cannot
|    |    |    |                         # ship different weights of the same family
|    |    |    |___ <family>-<weight>.woff2  # one file per weight actually used
|    |    |___ scripts/                  # (Adire)
|    |    |    |___ check-contrast.<ext> # (Adire) WCAG AA over every text/background token pair,
|    |    |                              # both modes
|    |    |___ src/styles/
|    |    |    |___ themes/              # (Adire)
|    |    |    |    |___ <name>.css      # (Adire) the theme: ramps in @theme, semantic roles on
|    |    |    |    |                    # :root and [data-mode="dark"] with a prefers-color-scheme
|    |    |    |    |                    # fallback, then @theme inline exposing the roles
|    |    |    |    |___ template.css    # (Adire) the registry's blank theme a new one starts from
|    |    |    |___ animations.css       # @keyframes and the classes using them; only once shared
|    |    |    |___ base.css             # (Adire) element defaults, in @layer base
|    |    |    |___ components.css       # authored classes, in @layer components; only once shared
|    |    |    |___ forms.css            # (Adire) form-control defaults
|    |    |    |___ globals.css          # the entry every app imports. Tailwind only: the ramps in
|    |    |    |                         # @theme, the roles on :root with their prefers-color-scheme
|    |    |    |                         # dark overrides, @theme inline (hex or OKLCH), @layer base;
|    |    |    |                         # the `dark` variant on [data-theme="dark"] only with a theme
|    |    |    |                         # toggle. (Adire) the one list of the layer order, and the
|    |    |    |                         # `dark` variant on [data-mode="dark"]
|    |    |    |___ overrides.css        # (Adire) single-value tweaks; after the theme, so they
|    |    |    |                         # survive a theme reinstall and win by source order
|    |    |    |___ prose.css            # long-form typography; only if an app ships prose
|    |    |    |___ themes.css           # (Adire) which theme is active - imports themes/<name>.css
|    |    |    |___ typography.css       # (Adire) the type scale and heading defaults
|    |    |    |___ utilities.css        # @utility definitions and motion tokens; only once shared
|    |    |___ AGENTS.md                 # the tokens, and (Adire) the layer order and what a theme
|    |    |                              # reinstall rewrites
|    |    |___ components.json           # (Adire) the registry CLI's config, so an install writes the
|    |    |                              # layers here
|    |    |___ package.json              # exports the entry, the fonts, and the PostCSS config; no JS
|    |    |___ postcss.config.js         # the Tailwind v4 plugin, shared by every consumer
|    |    |___ README.md                 # what each file owns
|    |___ testing/                       # the fakes and mocks two or more workspaces share;
|    |    |                              # dev-only, built to dist/ because plain Node loads it too
|    |    |___ src/
|    |    |    |___ <service>.fake.ts    # a working in-memory stand-in (firestore.fake.ts)
|    |    |    |___ <service>.mock.ts    # typed vi.fn() exports (firebase-auth.mock.ts)
|    |    |___ AGENTS.md                 # each workspace's __mocks__ re-exports from here
|    |    |___ eslint.config.mjs         # extends @<scope>/eslint-config
|    |    |___ package.json              # one subpath export per fake, from dist/; build is
|    |    |                              # `tsc -p tsconfig.build.json`; a devDependency of every consumer
|    |    |___ README.md                 # what each fake covers
|    |    |___ tsconfig.build.json       # the emitting config the build runs
|    |    |___ tsconfig.json             # extends @<scope>/typescript-config/node-library
|    |___ typescript-config/             # base configs every app and package extends. The
|    |    |                              # split below is by WHO RESOLVES THE IMPORTS, which
|    |    |                              # is the one thing moduleResolution encodes
|    |    |___ AGENTS.md                 # which config a target extends, and why
|    |    |___ base.json                 # the strict flags every target shares, and nothing
|    |    |                              # that assumes a consumer - no moduleResolution here
|    |    |___ nextjs.json               # base + ESNext/`Bundler` + jsx preserve + noEmit + the
|    |    |                              # next plugin; the framework resolves
|    |    |___ node-library.json         # base + `NodeNext`, for a package NODE loads: the
|    |    |                              # API importing @<scope>/contracts, a worker, the
|    |    |                              # testing fakes. TypeScript then REQUIRES the `.js`
|    |    |                              # extension on relative imports and errors without
|    |    |                              # it, so plain `tsc` emits something Node can load.
|    |    |                              # Writing `./thing.js` in a .ts file looks wrong and
|    |    |                              # is correct - it is the path the runtime resolves,
|    |    |                              # and it is what the ESM spec requires. Set
|    |    |                              # `Bundler` here instead and the build silently
|    |    |                              # emits extensionless imports that only fail at
|    |    |                              # runtime, as ERR_MODULE_NOT_FOUND naming a file
|    |    |                              # that plainly exists - patching that output with a
|    |    |                              # post-build script treats the symptom
|    |    |___ package.json              # lists the four; nothing to build
|    |    |___ react-library.json        # base + ESNext/`Bundler` + react-jsx, for a package
|    |    |                              # that ships source; every consumer is a bundler
|    |    |___ README.md                 # the four, and when each applies
|    |___ ui/                            # the shared components, once two apps use them. Ships
|    |                                   # source with plain Tailwind classes and no build; each app
|    |                                   # compiles it in its own Tailwind run. Tailwind only: the
|    |                                   # same base / blocks / layouts tiers as an app, one folder
|    |                                   # per component. (Adire) the base library installed from
|    |                                   # its registry as source, with this project's own tiers
|    |                                   # beside it; component and story files kebab-case and flat
|    |                                   # in each tier, because the registry writes those names and
|    |                                   # matching them keeps a reinstall from renaming files. The
|    |                                   # stories are the package's tests; the Storybook app only
|    |                                   # globs them
|    |    |___ src/
|    |    |    |___ assets/              # (Adire) the brand marks and illustrations, as components
|    |    |    |    |___ index.ts        # (Adire) the tier barrel
|    |    |    |    |___ logo.tsx        # (Adire) every variant as a prop, not four files
|    |    |    |___ base/                # atoms that render one thing
|    |    |    |    |___ Badge/          # Tailwind only: one folder per component, as in an app
|    |    |    |    |    |___ Badge.stories.tsx  # beside the component, never in the Storybook
|    |    |    |    |    |                # app. `title: "Base/Badge"` puts it in the sidebar tier
|    |    |    |    |    |___ index.tsx   # the component
|    |    |    |    |___ badge.stories.tsx  # (Adire) the same story, kebab-case and flat
|    |    |    |    |___ badge.tsx       # (Adire) one component per file, with its parts and types
|    |    |    |    |___ index.ts        # the tier barrel, one explicit export per component
|    |    |    |    |___ link.tsx        # (Adire) the router-agnostic Link; renders the framework's
|    |    |    |    |                    # link from LinkProvider, which each app's root mounts
|    |    |    |    |                    # with next/link
|    |    |    |    |___ theme-mode-provider.tsx  # (Adire) REQUIRED for dark mode: owns data-mode
|    |    |    |    |                    # at runtime; each app's providers.tsx mounts it
|    |    |    |    |___ theme-script.tsx  # (Adire) REQUIRED for dark mode: an inline <script> in
|    |    |    |                         # <head> that sets data-mode from the stored choice
|    |    |    |                         # or the OS before first paint. No story - an inline
|    |    |    |                         # script renders nothing to show
|    |    |    |___ blocks/              # composed pieces, plus the page regions (navbar, sidebar,
|    |    |    |    |                    # footer). Filed by subcategory in the story TITLE
|    |    |    |    |                    # ("Blocks/Forms/<Name>"), never in folder names -
|    |    |    |    |                    # retiering is a one-line edit
|    |    |    |    |___ index.ts        # the tier barrel
|    |    |    |___ components/          # (Adire) compositions of base that own their state
|    |    |    |    |                    # (card, dialog, field-group)
|    |    |    |    |___ index.ts        # (Adire) the tier barrel
|    |    |    |___ foundations/         # (Adire) stories only - the theme's colours, type,
|    |    |    |                         # spacing, elevation, and motion
|    |    |    |___ icons/               # (Adire) one component per icon, plus the named sets
|    |    |    |    |___ index.ts        # (Adire) the tier barrel
|    |    |    |    |___ <domain>-icons.ts  # (Adire) a named map, so callers never switch on strings
|    |    |    |    |___ <name>-icon.tsx  # (Adire) a single glyph, sized by prop
|    |    |    |___ layouts/             # the page shells apps render
|    |    |    |    |___ index.ts        # the tier barrel
|    |    |    |___ lib/
|    |    |    |    |___ utils/
|    |    |    |         |___ cn.ts      # plain twMerge over clsx; reached by subpath only
|    |    |    |___ pages/               # (Adire) whole pages more than one app renders as they are
|    |    |    |    |___ index.ts        # (Adire) the tier barrel
|    |    |    |___ globals.d.ts         # the CSS-module and asset declarations
|    |    |    |___ index.ts             # composes the tier barrels
|    |    |___ AGENTS.md                 # the tier ladder, and (Adire) what a registry reinstall
|    |    |                              # overwrites
|    |    |___ components.json           # (Adire) the registry CLI's config; its aliases point at
|    |    |                              # this package
|    |    |___ eslint.config.mjs         # extends @<scope>/eslint-config/react-internal
|    |    |___ package.json              # exports map: each tier barrel and its `/*` deep paths,
|    |    |                              # all pointing at src/. react, react-dom and next are
|    |    |                              # peers. Storybook is a devDependency, because the
|    |    |                              # colocated stories import Meta and StoryObj - without
|    |    |                              # it this package's own check-types fails
|    |    |___ README.md                 # the tiers, and where a new component goes
|    |    |___ tsconfig.json             # extends @<scope>/typescript-config/react-library
|    |___ utils/                         # the portable helpers every app reuses. General helpers
|    |    |                              # come from @timonwa/app-utilities when ticked; this package
|    |    |                              # holds only what it lacks
|    |    |___ src/
|    |    |    |___ server/              # utils that must never reach a browser
|    |    |    |    |___ api.utils.ts    # the typed fetch wrapper, session attached
|    |    |    |    |___ index.ts        # its own barrel, marked `server-only`. That marker
|    |    |    |                         # THROWS under plain Node (it is inert only under the
|    |    |    |                         # react-server condition) - a workspace script that
|    |    |    |                         # needs one of these helpers keeps its own copy in
|    |    |    |                         # its lib/, never this barrel
|    |    |    |___ index.ts             # one explicit export line per file
|    |    |    |___ <domain>.utils.test.ts  # colocated, as in an app
|    |    |    |___ <domain>.utils.ts    # the same `<domain>.utils.ts` grammar
|    |    |___ AGENTS.md                 # the purity rule, and the server/ boundary
|    |    |___ eslint.config.mjs         # extends @<scope>/eslint-config
|    |    |___ package.json              # ships source: `.` and `./server` point at src/; depends
|    |    |                              # on @timonwa/app-utilities when ticked
|    |    |___ README.md                 # what belongs here and what does not
|    |    |___ tsconfig.json             # extends @<scope>/typescript-config/react-library -
|    |    |                              # every consumer is a bundler
|    |    |___ vitest.config.ts          # the package runs its own tests
|___ scripts/                            # workspace maintenance, run by hand or by CI
|    |___ bundle-function.mjs            # bundles a worker into deploy/ with esbuild and writes
|    |                                   # its package.json; only if workers = yes
|    |___ check-env.mjs                  # fails when an app's .env and .env.example name
|    |                                   # different keys; run as `check:env`, and CI runs it
|    |___ env-setup.mjs                  # writes each app's .env from the tier you name
|    |___ run-affected.mjs               # the wrapper every affected-only script calls -
|    |                                   # resolves the real base SHA (first push, shallow
|    |                                   # clone, and forced-push all break `--affected`),
|    |                                   # then hands turbo one filter. Without it CI either
|    |                                   # rebuilds the world or silently tests nothing
|    |___ seed-labels.mjs                # reconciles the GitHub labels labeler.yml and the
|                                        # release-note categories reference; a label that
|                                        # exists only in YAML silently applies to nothing
|___ .editorconfig                       # whitespace rules every editor honours
|___ .firebaserc                         # project alias per tier; the deploy target map
|___ .gitattributes                      # * text=auto eol=lf - the same line endings on every OS
|___ .gitignore                          # includes .env*, build output, .turbo
|___ .npmrc                              # engine-strict and workspace linking
|___ .nvmrc                              # 24 - one Node version for devs, CI, and the host
|___ .prettierignore                     # build output, deploy/, and the lockfile
|___ .prettierrc.json                    # Prettier formats every file type; proseWrap preserve
|___ AGENTS.md                           # workspace-wide conventions for agents
|___ CODE_OF_CONDUCT.md                  # only if the repo takes outside contributions
|___ commitlint.config.ts                # Conventional Commits via commit-msg; only if team-maintained
|___ CONTRIBUTING.md                     # only if the repo takes outside contributions
|___ firebase.json                       # only when the backend is Firebase: which codebase
|                                        # each functions/ folder is, the rules and index files
|                                        # below, emulator ports, and the hosting targets
|___ firestore.indexes.json              # every composite index, committed - a query that
|                                        # needs one fails in production until it is deployed
|___ firestore.rules                     # deny by default; the client reads nothing the
|                                        # service layer should be reading for it
|___ LICENSE                             # required the moment the repo goes public
|___ lint-staged.config.mjs              # what pre-commit runs: prettier --write, staged files only
|___ package.json                        # root scripts and tooling only - never app dependencies.
|                                        # Exact pnpm 11 packageManager, engines.node >=24, and
|                                        # the labelled syncpack groups recording each catalog exception
|___ pnpm-lock.yaml                      # ONE lockfile for the whole workspace, at the root
|                                        # and nowhere else. A lockfile inside an app means
|                                        # that app resolved its own versions, which is the
|                                        # single-version guarantee gone
|___ pnpm-workspace.yaml                 # workspace globs, the catalog, the allowBuilds map
|___ README.md                           # the map: what each app and package is
|___ renovate.json                       # dependency updates; only if updates = Renovate
|___ SECURITY.md                         # public repos - how to report a hole privately
|___ storage.public.rules                # one rules file per bucket, named for the bucket -
|___ storage.uploads.rules               # public reads and authenticated writes have nothing
|                                        # in common, and one file for both means the looser
|                                        # rule governs the stricter bucket by accident
|___ turbo.json                          # the task graph; every env var a build reads is in its task
```

## The frontend app tree

Every app under `apps/` that renders pages — `site`, `dashboard`, `admin`, `help-center` — is this tree, rooted at `apps/<name>/`, drawn as a frontend over `apps/api`. It shows a public group and a signed-in group so both shapes appear; each real app keeps only its own, at root URLs, because a route never repeats its app's name — `site` the public pages, `dashboard` the signed-in ones.

> **The kinds are the same; what changes is how much of each stays here.** Only one row below is structural — everything else is the same folder holding less, because a package now covers the shared part. **A kind is never deleted from an app for being "a package's job".** Sparse in this tree means "this holds what only this app uses"; it does not mean the folder is forbidden or capped, and an app that genuinely owns a lot legitimately has a lot here.
>
> | In a standalone app                    | In a workspace app                                                                                                                                                                                                                                                                                       |
> | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | `src/app/`                             | the same `src/app/` — one rule everywhere: all source lives under `src/`, the app root holds only config. Same as standalone                                                                                                                                                                             |
> | `src/styles/` (the layers + entry)     | **structural:** the same file names, but only the ones this app authors — its `globals.css` entry and its own `components.css`. The shared layers move whole into `packages/tailwind-config`, keeping their names, order, and jobs; duplicating one per app is how two apps end up with different tokens |
> | `src/ui/` (the tiers)                  | the same tiers, holding **this app's own** reusables — the ones no sibling app wants yet. Anything a second app needs is promoted to `packages/ui`; until then it belongs right here                                                                                                                     |
> | `lib/hooks/`                           | this app's own hooks. The cross-app ones are `packages/hooks`, grouped by concern                                                                                                                                                                                                                        |
> | `lib/utils/`                           | this app's own helpers. A formatter only `site` calls stays in `site` — hoisting it makes every other app rebuild for a change none of them care about                                                                                                                                                   |
> | `lib/constants/`, `schemas/`, `types/` | whatever one app alone knows: its nav links, its own form shapes, its local view models. The cross-boundary contract is `packages/contracts`                                                                                                                                                             |
> | `lib/server/` — the app's shape        | the kinds the app's shape turns on (`code-structure`): a frontend over `apps/api` has `actions/`, `data/` and `utils/`; an app with its own backend adds `services/` and `clients/`. An app rendering only static prose, like `help-center`, may have none                                               |
> | `src/testing/`                         | this app's own fixtures and fakes; the ones a second workspace needs move to `packages/testing`                                                                                                                                                                                                          |
>
> Root config also thins out: no `commitlint.config.ts`, `.husky/`, `.github/`, `.nvmrc`, `renovate.json`, `lint-staged.config.mjs`, Prettier config, or lockfile in an app — those govern the whole workspace and live at its root, where `turbo` and the hooks can see them. What stays per-app is what genuinely differs per deployment: its env, its Next config, its hosting config, its lint config, and its own docs.

```txt
apps/<name>/
|___ __mocks__/                          # manual SDK mocks, re-exporting @<scope>/testing; only if
|                                        # this app's tests mock an SDK
|___ _docs/                              # only docs specific to THIS app; the shared ones
|    |                                   # are at the workspace root, and are not repeated
|    |___ README.md                      # the folder map, and what is at the root instead
|___ .claude/                            # app-scoped Claude config; the root's still apply
|    |___ settings.json                  # only what differs from the workspace settings
|___ public/                             # served at this app's domain root; the subfolders are ours
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
|___ scripts/                            # only this app's own one-offs; the workspace
|                                        # scripts live at the root and are not repeated
|___ src/                                # everything importable, behind the `@/*` alias
|    |___ app/                           # ROUTES ONLY - thin files, same as standalone
|    |    |___ (dashboard)/              # the signed-in pages - in the dashboard app, at root URLs:
|    |    |    |                         # no /dashboard prefix, the app already is the dashboard
|    |    |    |___ overview/            # route segment: /overview
|    |    |    |    |___ page.tsx        # thin entry, imports the composed page
|    |    |    |___ settings/            # route segment: /settings
|    |    |    |    |___ page.tsx        # thin entry, imports the composed page
|    |    |    |___ error.tsx            # thin client entry; covers the group, not one page
|    |    |    |___ layout.tsx           # renders the dashboard shell; redirects a signed-out
|    |    |    |                         # visitor behind <Suspense> with the shell's skeleton - a
|    |    |    |                         # convenience; apps/api's guard is the real check
|    |    |    |___ loading.tsx          # the group's Suspense fallback
|    |    |___ (public)/                 # the routes any visitor can reach, sharing a layout
|    |    |    |___ about/               # route segment
|    |    |    |    |___ page.tsx        # thin entry, imports the composed page
|    |    |    |___ pricing/             # route segment
|    |    |    |    |___ page.tsx        # thin entry, imports the composed page
|    |    |    |___ layout.tsx           # renders MarketingLayout + this app's nav constant
|    |    |    |___ page.tsx             # thin entry, imports the composed home page
|    |    |___ api/                      # only what THIS app must serve itself - the session
|    |    |                              # cookie handoff, a revalidation hook, an OG route.
|    |    |                              # Everything else is apps/api; a frontend app that
|    |    |                              # grows a real API surface is two apps in one folder
|    |    |___ maintenance-bypass/       # sets the cookie the proxy checks; only if a
|    |    |    |                         # kill switch = yes, and only on the app that has one
|    |    |    |___ route.ts             # 404s on a bad token, so the path stays unguessable
|    |    |___ unauthorized/             # where a failed guard sends a signed-out visitor
|    |    |    |___ page.tsx             # thin entry, imports the composed page
|    |    |___ apple-icon.png            # iOS home-screen icon; tag injected too
|    |    |___ error.tsx                 # thin client entry, fallback for groups with none
|    |    |___ favicon.ico               # legacy fallback; only works at the app root
|    |    |___ global-error.tsx          # catches the root layout; self-contained, no app styles
|    |    |___ icon.svg                  # .svg or .png; wins over the .ico where supported
|    |    |___ layout.tsx                # imports globals.css, renders providers.tsx; never reads
|    |    |                              # the session. (Adire) ThemeScript in <head>
|    |    |___ manifest.ts               # generated; a public/site.webmanifest would win instead
|    |    |___ not-found.tsx             # thin entry, imports the composed 404
|    |    |___ opengraph-image.tsx       # ImageResponse OG card
|    |    |___ providers.tsx             # every client provider in one place, so layout.tsx
|    |    |                              # stays a server component. This is where the required
|    |    |                              # ones get wired - SessionProvider from @<scope>/hooks (auth
|    |    |                              # = Firebase), FeatureFlagProvider (flags = yes),
|    |    |                              # ThemeProvider from @timonwa/react-hooks (only with a
|    |    |                              # theme toggle); (Adire) LinkProvider and ThemeModeProvider
|    |    |                              # - each handed values the SERVER already resolved, never
|    |    |                              # left to fetch for itself on the client
|    |    |___ robots.ts                 # generated; a public/robots.txt would silently win
|    |    |___ sitemap.ts                # generated from config/routes.ts, never a static file
|    |___ assets/                        # things this app's code imports. The brand marks
|    |    |                              # every app shares are packages/ui/assets; imagery
|    |    |                              # only this app renders belongs here
|    |    |___ images/                   # imported, so dimensions are inferred
|    |___ components/                    # .tsx only (+ colocated tests), by product area - the
|    |    |                              # same folders as a standalone app
|    |    |___ _shared/                  # widgets several of THIS app's features use;
|    |    |    |                         # grouped by concern, each group with a barrel of its
|    |    |    |                         # client-safe exports; no root _shared barrel
|    |    |___ errors/                   # what the error and not-found route files render
|    |    |    |___ error/               # pairs with every error.tsx - a client component
|    |    |    |    |___ index.tsx       # takes the error + reset, renders ui ErrorLayout
|    |    |    |___ global-error/        # pairs with app/global-error.tsx
|    |    |    |    |___ index.tsx       # inlines its styles - globals.css never loads here
|    |    |    |___ not-found/           # pairs with app/not-found.tsx
|    |    |    |    |___ index.tsx       # composes this page's content
|    |    |    |___ unauthorized/        # a real route, unlike the three above
|    |    |         |___ index.tsx       # pairs with app/unauthorized/
|    |    |___ guards/                   # the client-side gates a layout wraps children in
|    |    |    |___ RequireRole.tsx      # hides what can() denies; never the only check
|    |    |___ marketing/                # the (public) group is one area, so one folder
|    |    |    |___ home/                # pairs with app/(public)/
|    |    |    |    |___ HeroSection.tsx # one file per section
|    |    |    |    |___ index.tsx       # the only thing page.tsx imports
|    |    |    |___ pricing/             # pairs with app/(public)/pricing/
|    |    |         |___ index.tsx       # composes this page's sections
|    |    |         |___ PlansSection.tsx  # one file per section
|    |    |___ overview/                 # a dashboard feature: pairs with app/(dashboard)/overview/
|    |    |    |___ _shared/             # shared within this feature only
|    |    |    |___ index.tsx            # the only thing page.tsx imports
|    |    |    |___ StatsSection.tsx     # one file per section
|    |    |___ settings/                 # a dashboard feature: pairs with app/(dashboard)/settings/
|    |         |___ index.tsx            # composes this page's sections
|    |         |___ ProfileSection.tsx   # one file per section
|    |___ content/                       # the MDX itself; only if this app ships prose
|    |    |___ guides/                   # one folder per content type, one file per entry
|    |___ lib/                           # the SAME kinds a standalone app has, holding what
|    |    |                              # only this app uses. Kind-first, flat inside each
|    |    |                              # kind. A kind is thin here when a package covers
|    |    |                              # most of it, and absent only when this app genuinely
|    |    |                              # has none of that kind - never because "the package
|    |    |                              # owns it"
|    |    |___ config/                   # the kind that CANNOT be shared, so it is the one
|    |    |    |                         # that stays. Every value here is per-deployment
|    |    |    |___ endpoints.ts         # every apps/api path, grouped by the API's resources
|    |    |    |___ env.ts               # Zod-validated at boot; fails the deploy, not a request
|    |    |    |___ firebase.ts          # the client config per tier; public ids, never a secret;
|    |    |    |                         # only if auth = Firebase
|    |    |    |___ index.ts             # the kind barrel - server-only, because it re-exports
|    |    |    |                         # env; client code imports @/lib/config/routes by path
|    |    |    |___ routes.ts            # every page path in THIS app; its own RouteTable type,
|    |    |    |                         # `as const satisfies RouteTable`
|    |    |    |___ site.ts              # the per-tier public facts, keyed off APP_ENV
|    |    |___ constants/                # this app's own frozen values
|    |    |    |___ index.ts             # the kind barrel
|    |    |    |___ nav.constant.ts      # the links THIS app's navbar and footer render -
|    |    |                              # every app has different ones, so this rarely moves
|    |    |___ data/                     # static records only this app renders; the kind that
|    |    |    |                         # almost never becomes a package, because content is
|    |    |    |                         # the one thing apps do not share
|    |    |    |___ faq.data.ts          # what this app's own pages read
|    |    |    |___ index.ts             # the kind barrel
|    |    |___ hooks/                    # hooks only THIS app uses, and nothing the house hook
|    |    |    |                         # packages export. Grouped by concern once there are
|    |    |    |                         # enough to scan past; flat before that
|    |    |    |___ index.ts             # the kind barrel
|    |    |    |___ use-<subject>.ts     # promoted to packages/hooks when a second app asks
|    |    |___ schemas/                  # forms this app alone has. The cross-boundary
|    |    |    |                         # contract is @<scope>/contracts, and re-declaring one
|    |    |    |                         # of those here is a second source of truth for one
|    |    |    |                         # wire format - that is the only thing banned
|    |    |    |___ index.ts             # the kind barrel
|    |    |    |___ <domain>.schema.ts   # one app-local form's shape
|    |    |___ seo/                      # this app's metadata factory and structured-data builders
|    |    |    |___ index.ts             # the kind barrel
|    |    |    |___ metadata.ts          # buildMetadata, seeded from config/site.ts
|    |    |    |___ structured-data.ts   # the JSON-LD builders; packages/ui's JsonLd renders them
|    |    |___ server/                   # a frontend over apps/api: no business logic, and no
|    |    |    |                         # clients/ - one credential in two apps is two places
|    |    |    |                         # it leaks from
|    |    |    |___ actions/             # the mutations this app's own forms invoke
|    |    |    |    |___ index.ts        # the kind barrel
|    |    |    |    |___ <domain>.action.ts  # calls the API, updates the tag, returns the result
|    |    |    |___ data/                # the API reads, each with `use cache`, cacheLife and
|    |    |    |    |                    # cacheTag (nextjs)
|    |    |    |    |___ index.ts        # the kind barrel
|    |    |    |    |___ <domain>.data.ts  # one domain's reads
|    |    |    |___ utils/               # the typed fetchers over @<scope>/utils/server, the
|    |    |    |    |                    # session helpers, the action-result builder
|    |    |    |    |___ api.utils.ts    # this app's typed client, with its base URL and session
|    |    |    |    |___ index.ts        # the kind barrel
|    |    |    |___ index.ts             # the `server-only` barrel: actions and data, plus the
|    |    |                              # identity helpers a guard calls; the fetchers stay out
|    |    |___ types/                    # shapes only this app needs, with no schema or
|    |    |    |                         # const behind them
|    |    |    |___ index.ts             # the kind barrel
|    |    |    |___ <domain>.type.ts     # one app-local shape
|    |    |___ utils/                    # helpers only this app uses, and nothing
|    |         |                         # @timonwa/app-utilities exports. Thin when packages/utils
|    |         |                         # covers the portable ones, and that is the normal case -
|    |         |                         # not a rule that it must be
|    |         |___ index.ts             # the kind barrel
|    |         |___ <domain>.utils.ts    # promoted to packages/utils on the second consumer
|    |___ styles/                        # the same file NAMES as a standalone app, but only
|    |    |                              # the ones this app authors. The shared layers are
|    |    |                              # packages/tailwind-config; a layer duplicated here
|    |    |                              # is how two apps end up with different tokens
|    |    |___ components.css            # this app's own authored classes, in @layer
|    |    |                              # components - same name and same job as standalone,
|    |    |                              # holding only what no sibling app shares
|    |    |___ globals.css               # the only entry a layout imports: the shared entry,
|    |                                   # then the file above, then @source for packages/ui/src
|    |                                   # (not its stories) when there is one - one compilation
|    |                                   # for the app
|    |___ testing/                       # this app's fixtures and fakes (testing)
|    |    |___ next-headers.fake.ts      # an in-memory cookie and header store for next/headers
|    |    |___ user.fixture.ts           # buildUser - one builder per sample record
|    |___ ui/                            # this app's OWN reusables, in base / blocks / layouts,
|    |    |                              # one folder per component. It is here because a reusable
|    |    |                              # starts app-scoped: you do not know it is shared until a
|    |    |                              # second app asks for it. Promote it then - a file move
|    |    |                              # and an import swap - and not before
|    |    |___ base/                     # only the atoms packages/ui does not already have
|    |    |    |___ index.ts             # the tier barrel
|    |    |___ blocks/                   # this app's own composed pieces
|    |    |    |___ Hero/                # one folder per component
|    |    |    |    |___ index.tsx       # the component
|    |    |    |___ index.ts             # the tier barrel
|    |    |___ layouts/                  # this app's page shells
|    |    |    |___ DashboardLayout/     # takes this app's nav and regions as slots
|    |    |    |    |___ DashboardLayoutSkeleton.tsx  # what the group layout's Suspense shows
|    |    |    |    |___ index.tsx       # the component
|    |    |    |___ index.ts             # the tier barrel
|    |    |___ index.ts                  # re-exports this app's tiers
|    |___ proxy.ts                       # the kill-switch gate and header rewrites; beside app/
|___ .env                                # the tier's real values, written by env-setup.mjs
|                                        # from your local secrets; gitignored, never committed
|___ .env.example                        # every key this app reads, names only - no values, no comments
|___ .gitignore                          # app-local only - .next, next-env.d.ts, .env
|___ AGENTS.md                           # THIS app's facts: its routes, its env, its guards.
|                                        # Adds to the root file, which holds the workspace
|                                        # conventions
|___ apphosting.yaml                     # the base host config every tier inherits
|___ apphosting.dev.yaml                 # the dev overlay - only what differs from the base
|___ apphosting.prod.yaml                # the prod overlay; secret grants are per-tier, and
|                                        # a missing grant is the top cause of a failed build
|___ apphosting.staging.yaml             # the staging overlay
|___ eslint.config.mjs                   # extends @<scope>/eslint-config/next
|___ next-env.d.ts                       # generated on dev/build; gitignored, never committed
|___ next.config.ts                      # transpilePackages for the source-shipping packages,
|                                        # plus cacheComponents, typedRoutes, and the headers
|___ package.json                        # this app's deps as catalog: and workspace:*, the ticked
|                                        # house packages among them; an exact pin only where a
|                                        # host refuses catalog:, recorded in syncpack
|___ postcss.config.mjs                  # re-exports packages/tailwind-config/postcss.config
|___ README.md                           # what this app is and how to run it
|___ site.metadata.ts                    # the static facts the OG route and manifest read,
|                                        # outside src/ because next.config.ts imports it too
|___ tsconfig.json                       # extends @<scope>/typescript-config/nextjs, `@/*` -> src/*
|___ vitest.config.ts                    # only if this app has its own tests
|___ vitest.setup.ts                     # resets mocks after each test, seeds the env guard's
                                         # keys, mocks server-only
```

## The backend app tree

`apps/api/` — a Next.js app with **no pages**, only route handlers over a service layer. It is the same grammar a frontend app uses, so code moves between the two without restructuring; what differs is that the whole app is server code, so the boundary is `src/server/` rather than `lib/server/`, and the route tree is versioned rather than grouped.

This shape corrects four things a hand-grown API drifts into: server code scattered at `src/` root instead of behind one boundary, a `helpers/` folder that means nothing (`naming` rejects it — those are `utils/`), clients filed under whatever imported them first, and a domain folder whose files repeat the domain (`event/event-crud.service.ts` — the folder already said `event`).

```txt
apps/api/
|___ scripts/                            # the operational surface a backend needs and a
|                                        # frontend app does not: seeding, backfills, and
|                                        # provider setup. Committed, because a one-off you
|                                        # ran from your shell is a step nobody can repeat
|    |___ backfills/                     # one file per migration, named for what it fixes
|    |    |___ backfill-<field>.mjs      # idempotent, so a half-finished run can be re-run
|    |___ lib/                           # what the scripts share, so none re-implements it
|    |    |___ env.mjs                   # resolves the tier from --env=<tier>, so a script
|    |    |                              # cannot hit production by default
|    |    |___ firebase.mjs              # the Admin SDK, initialised once
|    |    |___ resolve-user.mjs          # takes an email or uid, returns the record
|    |___ seeds/                         # the fixtures a fresh environment needs to work
|    |    |___ seed-<domain>.mjs         # one file per collection it seeds
|    |    |___ seed-firestore-ttls.sh    # the TTL policies; they are per-project, and the
|    |                                   # console is the only other way to set them
|    |___ clear-db.mjs                   # refuses to run against production, by tier check
|    |___ README.md                      # what each script does, and the order to run them
|___ src/
|    |___ app/                           # route handlers only; no page.tsx, no components
|    |    |___ api/
|    |    |    |___ docs/                # the browsable reference and the spec it serves; only if an API reference = yes
|    |    |    |    |___ openapi/
|    |    |    |    |    |___ route.ts   # serves the JSON built from the registry
|    |    |    |    |___ route.ts        # serves the human-readable reference
|    |    |    |___ v1/                  # every route is versioned; a breaking change adds v2
|    |    |    |    |___ account/        # what the signed-in caller may change about itself;
|    |    |    |    |                    # separate from admin/users so an escalation bug in
|    |    |    |    |                    # one cannot reach the other
|    |    |    |    |    |___ profile/
|    |    |    |    |         |___ route.test.ts  # colocated: a real Request against the fakes
|    |    |    |    |         |___ route.ts  # GET and PATCH the caller's own record
|    |    |    |    |___ admin/          # operator-only, behind a role check on every route
|    |    |    |    |    |___ audit-logs/
|    |    |    |    |    |    |___ route.ts  # read-only; the trail is append-only
|    |    |    |    |    |___ users/     # the operator surface over other people's records
|    |    |    |    |         |___ [uid]/
|    |    |    |    |         |    |___ route.ts  # GET, PATCH, DELETE one user
|    |    |    |    |         |___ route.ts  # GET list, POST create
|    |    |    |    |___ auth/           # the session lifecycle: the one surface that mints
|    |    |    |    |    |                # cookies, so nothing else needs to know how
|    |    |    |    |    |___ login/
|    |    |    |    |    |    |___ route.ts  # verifies, then sets the session cookie
|    |    |    |    |    |___ logout/
|    |    |    |    |    |    |___ route.ts  # revokes, then clears the cookie
|    |    |    |    |    |___ refresh-session/
|    |    |    |    |    |    |___ route.ts  # re-mints before expiry, so a role change lands
|    |    |    |    |    |___ signup/
|    |    |    |    |         |___ route.ts  # creates, then hands off to the session route
|    |    |    |    |___ cron/           # one dispatcher the scheduler calls; tasks self-gate
|    |    |    |    |    |___ tick/      # a single entry, so the scheduler has one target
|    |    |    |    |         |___ route.ts  # verifies the scheduler, then runs what is due,
|    |    |    |    |                    # each task in its own try/catch so one failure
|    |    |    |    |                    # cannot skip the rest
|    |    |    |    |___ dev/            # only mounted when APP_ENV is local or development -
|    |    |    |    |    |                # email previews and fixture triggers. It must 404
|    |    |    |    |    |                # in production, not merely require a role
|    |    |    |    |    |___ emails/
|    |    |    |    |         |___ [type]/
|    |    |    |    |              |___ route.ts  # renders one template in the browser
|    |    |    |    |___ health/         # liveness; the only route with no auth
|    |    |    |    |    |___ route.ts   # echoes the resolved tier, so a wrong env name
|    |    |    |    |                    # shows up here instead of silently at runtime
|    |    |    |    |___ public/         # unauthenticated reads, rate-limited by IP
|    |    |    |    |    |___ maintenance-window/  # readable while everything else 503s
|    |    |    |    |    |    |___ route.ts  # never behind the kill switch it reports on
|    |    |    |    |    |___ <resource>/  # the read surface a marketing page renders from
|    |    |    |    |         |___ route.ts  # strips every field a list does not show
|    |    |    |    |___ webhooks/       # provider callbacks, one folder per provider; built with
|    |    |    |    |                # the feature that needs one, never by the scaffold
|    |    |    |         |___ <provider>/
|    |    |    |              |___ route.ts  # verifies the signature before anything else,
|    |    |    |                         # then dedups on the event id before doing work
|    |    |___ layout.tsx                # the minimum a Next app needs; renders nothing
|    |    |___ opengraph-image.tsx       # what a shared docs link previews as
|    |    |___ robots.ts                 # disallow everything; an API is never indexed
|    |    |___ route.ts                  # the root: redirects to the docs, so a bare
|    |                                   # domain visit is not a 404
|    |___ config/                        # bare names, as in any app
|    |    |___ env.ts                    # Zod at boot; the leaf module, imports only zod
|    |    |___ index.ts                  # the kind barrel
|    |    |___ site.ts                   # the per-tier public facts, keyed off APP_ENV
|    |___ constants/                     # only what no package shares
|    |    |___ email-recipient.constant.ts  # who internal mail goes to, per tier
|    |    |___ index.ts                  # the kind barrel
|    |    |___ rate-limit.constant.ts    # the named tiers every route picks from; the
|    |                                   # budgets themselves are a project fact, so they
|    |                                   # live in this app's AGENTS.md, not in a skill
|    |___ docs/                          # the OpenAPI source of truth; only if an API reference = yes
|    |    |___ openapi.ts                # the spec config: servers, security schemes, tags
|    |    |___ registry.ts               # every route registered here; the docs route reads
|    |                                   # this, so a route missing from it is undocumented
|    |___ schemas/                       # request and response shapes, app-local ones only
|    |    |___ index.ts                  # the kind barrel
|    |    |___ <domain>.schema.ts        # shared contracts live in @<scope>/contracts instead
|    |___ server/                        # everything below is server-only. In this app that
|    |                                   # is nearly everything, so it sits at src/ root
|    |                                   # rather than nested under a lib/ that holds nothing
|    |                                   # else - the boundary is the app
|    |    |___ clients/                  # one configured SDK per external service
|    |    |    |___ email/               # only if the API sends mail
|    |    |    |    |___ client.ts       # one agent per mail type, each with its own token
|    |    |    |    |___ index.ts        # the client barrel
|    |    |    |___ firebase/            # the Admin SDK boundary; nothing else touches it
|    |    |    |    |___ client.ts       # lazy Firestore, Auth, Storage singletons
|    |    |    |    |___ index.ts        # the client barrel
|    |    |    |    |___ rest.ts         # the auth flows the Admin SDK cannot do
|    |    |    |___ payments.client.ts   # only if payments = yes: the provider's SDK client,
|    |    |    |                         # initialised and nothing more
|    |    |    |___ redis/               # only if the API needs a shared store
|    |    |    |    |___ client.ts       # the one connection; never a second `new Redis()`
|    |    |    |    |___ index.ts        # the client barrel
|    |    |    |    |___ keys.ts         # every key built here, under a `<domain>:<action>`
|    |    |    |    |                    # prefix; an inline key string is banned. Cache, locks,
|    |    |    |    |                    # dedup and rate limits arrive with their first use
|    |    |    |    |                    # (`redis`, `rate-limiting`)
|    |    |    |___ storage/             # only if the API issues upload or delivery URLs
|    |    |    |    |___ client.ts       # the signing boundary; a signed URL is a credential
|    |    |    |    |___ index.ts        # the client barrel
|    |    |    |___ index.ts             # the kind barrel
|    |    |    |___ <service>.client.ts  # a one-file client needs no folder
|    |    |___ data/                     # store access only; no business rules, no authz
|    |    |    |___ batch.data.ts        # the chunked writer; Firestore caps a batch at 500
|    |    |    |___ collections.data.ts  # every collection path; no literal elsewhere
|    |    |    |___ index.ts             # the kind barrel
|    |    |    |___ <domain>.data.ts     # one domain's queries
|    |    |___ guards/                   # the authorization entry points, one per shape of
|    |    |    |                         # caller. Their own kind, not utils/ - a util is a
|    |    |    |                         # helper you may skip, and skipping one of these is
|    |    |    |                         # an open endpoint
|    |    |    |___ index.ts             # the kind barrel
|    |    |    |___ require-cron.guard.ts  # verifies the scheduler, not a user
|    |    |    |___ require-permission.guard.ts  # resolves the actor, then calls can()
|    |    |    |___ require-resource.guard.ts  # loads the record AND checks the verb against
|    |    |    |                         # it in one call, so no route can do one without
|    |    |    |                         # the other
|    |    |___ services/                 # the business logic; the only caller of data/
|    |    |    |___ event/               # a domain that outgrew one file
|    |    |    |    |___ crud.service.ts      # the folder carries the domain, so the file
|    |    |    |    |___ cron.service.ts      # carries only the concern - never
|    |    |    |    |___ index.ts             # event/event-crud.service.ts
|    |    |    |    |___ member.service.ts
|    |    |    |    |___ publishing.service.ts
|    |    |    |___ audit-log.service.ts # the append-only trail; the guard emits denials,
|    |    |    |                         # so no route has to remember to
|    |    |    |___ email.service.ts     # composes and sends; the client only transports
|    |    |    |___ index.ts             # the kind barrel
|    |    |    |___ user.service.ts      # one concern, so it stays a file
|    |    |___ utils/                    # server-only helpers - never named `helpers/`
|    |    |    |___ cursor.utils.ts      # opaque cursors; never expose an offset
|    |    |    |___ encryption.utils.ts  # AES-256-GCM field encryption; only if needed
|    |    |    |___ error.utils.ts       # the typed errors routes map to status codes
|    |    |    |___ index.ts             # the kind barrel
|    |    |    |___ logger.utils.ts      # structured, and it never logs a secret
|    |    |    |___ response.utils.ts    # the one envelope every route returns
|    |    |    |___ sanitize.utils.ts    # strips fields no caller should receive
|    |    |___ index.ts                  # the `server-only` barrel: services and guards only,
|    |                                   # so a route cannot reach data/ or a client directly
|    |___ testing/                       # the fixtures and request builders the route specs share
|    |___ types/                         # shapes no schema or const infers
|    |    |___ index.ts                  # the kind barrel
|    |___ proxy.ts                       # CORS allowlist, CSRF origin check, maintenance gate.
|                                        # The one file that runs before every route, so it
|                                        # uses nothing from server/; constant-time compares come
|                                        # from @timonwa/app-utilities, which runs on the edge
|___ .env                                # the tier's real values; gitignored
|___ .env.example                        # every key this app reads, names only - no values, no comments
|___ .gitignore                          # app-local only - .next, next-env.d.ts, .env
|___ AGENTS.md                           # this app's facts: tiers, rate-limit budgets,
|                                        # collection names, and which routes are public
|___ apphosting.yaml                     # the base host config every tier inherits
|___ apphosting.dev.yaml                 # the dev overlay - only what differs from the base
|___ apphosting.prod.yaml                # the prod overlay; every secret needs its own grant
|___ apphosting.staging.yaml             # the staging overlay
|___ eslint.config.mjs                   # extends @<scope>/eslint-config/next
|___ next.config.ts                      # transpiles the workspace packages it consumes
|___ package.json                        # its own deps, catalog versions
|___ README.md                           # what this API is, and how to run it locally
|___ site.metadata.ts                    # what the docs page and OG route read
|___ tsconfig.json                       # extends @<scope>/typescript-config/nextjs
|___ vitest.config.mts                   # .mts, so the config itself is ESM under tsx
|___ vitest.setup.ts                     # the one place process.env is touched in tests
```

Five rules the shape encodes, each from `api-architecture`:

- **A route handler is thin.** It runs the guard, parses with a schema, calls one service, and returns the shared envelope. Business logic in a route is the single most common way an API becomes untestable.
- **`services/` is the only caller of `data/`.** A route that queries the store directly skips authorization, and the `server-only` barrel exports `services` and `guards` precisely so it cannot.
- **The guard runs first, in the route.** Not in a layout, not in the service — a service called by a cron job has no request to authorize, so authorization belongs where the request is.
- **Every route is registered in `docs/registry.ts`.** The spec is generated from it, so a route that skips registration is a route no caller can discover and no reviewer can check.
- **Caches fail open; limits, locks, and dedup fail closed.** A cache miss should serve a slow page, and a rate limiter that cannot reach its store should refuse the request — the same outage must not open both doors.
