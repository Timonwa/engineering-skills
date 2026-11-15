---
name: scaffold-app
description: >-
  Adapts a starter the framework's own scaffolder created into the house structure — one Next.js app, a pnpm + Turborepo workspace, an existing app moved into a workspace, or another app added to one — by editing and moving files, never regenerating them. Interviews first, gates on one CREATE / EDIT / MOVE / DELETE manifest, and never installs or commits unasked. Use when asked to scaffold, bootstrap or restructure an app or a monorepo, or to wire a new integration into a house-shaped app.
argument-hint: "[app path] [--add] [--scope @app] [--apps site,dashboard,admin,api]"
allowed-tools: Read, Grep, Glob, Write, Edit, AskUserQuestion, Bash(ls:*), Bash(mkdir:*), Bash(mv:*), Bash(rm:*), Bash(cat:*), Bash(git status:*), Bash(git rev-parse:*), Bash(git ls-files:*), Bash(git mv:*), Bash(npm view:*), Bash(pnpm:*), Bash(npx:*), Bash(corepack enable)
---

# Scaffold app

Takes what an official scaffolder produced — `create-next-app` for an app, `create-turbo` for a workspace — and shapes it into the house standard. **An adapter, not a generator:** the scaffolder owns the versions and the framework config; this skill supplies the structure by editing what exists, then hands off.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[app path]` — the app to shape; omitted → the current directory, or the only `apps/*` entry.
- `--add` — an add-run: the app is already house-shaped; ask only which integrations to add.
- `--scope`, `--apps` — the workspace's package scope and the apps to end up with; asked when omitted, never invented.

## Guardrails

- **Never generate from an empty directory.** No starter → print the scaffolder command and stop: `pnpm create next-app@latest --ts --tailwind --eslint --app --src-dir --import-alias "@/*"` for an app, `pnpm dlx create-turbo@latest` for a workspace. Check the flags against `--help` first; they change between majors.
- **Edit, never overwrite.** A file the scaffolder made is changed with `Edit`; `Write` is only for new paths. A wholesale replacement is a DELETE plus a CREATE, approved by name.
- **Never pin the scaffolder's versions.** It resolved a coherent set; the catalog records them. Resolve a version (`npm view <pkg> version`) only for a dependency this skill adds.
- **Your structure, the scaffolder's versions.** Keep the versions and framework config the scaffolder chose; take the folder layout from the skills (`code-structure`, `naming`, `design-system`). Where the two differ, restructure and say so in the manifest — never keep the starter's layout, and never copy a sibling app's.
- **One manifest, one approval**, covering exactly that manifest. Deletions are the starter's demo files only, each its own approved line.
- **Every package is the owner's choice.** Each dependency this skill would add — a house package, an integration's SDK, a test runner — is a line in the manifest the owner can drop; nothing beyond the approved list is installed. Where a house package is approved, its helpers and hooks are used, never written again.
- **Integrations are installed and initialised, never built.** A chosen integration gets its packages, its configured client, any provider component its library ships, its keys in `.env.example` by name, and a link to the provider's official skill or docs. The feature itself — checkout, webhooks, upload flows, mail templates — is the project's work, not the scaffold's.
- **No installs, `git mv` or git commands without approval; never commits.** Propose the exact commands and wait. Committing is `ship-changes`'.
- **Skeleton only.** Placeholder copy and `// TODO:` markers; never a real domain, project id, secret or business rule — those are project facts.
- **No folder the answers didn't earn.** Every conditional line in the trees names what turns it on.

## Step 0 — Detect the situation

Read, don't assume: `ls -a`, `git rev-parse --is-inside-work-tree`, `git status --short`, every `package.json`, the lockfile, `next.config.*`, `turbo.json`, `pnpm-workspace.yaml`.

| What's there                                                         | Situation                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Nothing, or only `.git` and a README                                 | **Stop** with the scaffolder command                         |
| A `create-next-app` starter, standalone                              | **One app**                                                  |
| One app at the root, and the owner wants a workspace                 | **A** — move it into `apps/<name>`, then shape it as one app |
| A `create-turbo` starter (`apps/*`, `packages/*`, a `@repo/*` scope) | **B** — adapt the starter, then shape each app               |
| A house workspace, and the owner wants another app                   | **C** — add the app, then shape it as one app                |
| A house-shaped app (env guard, `src/ui/` tiers, the styles entry)    | **Add-run** — integrations only                              |

Also record: the package manager and its major, the Next.js version, whether `app/` is in `src/` (a `pages/` router is out of scope — stop), existing app and package names, dev scripts and ports, and every place the repo already departs from the standard. Inside a workspace the root owns CI, hooks and the shared packages; an app never gets its own copies.

## Step 1 — Interview

The questions, batches and defaults are in [references/interview.md](references/interview.md): one set for each app, one for the workspace, one for an add-run. Each answer switches specific tree lines on or off. Two answers shape everything after them: the **UI foundation** (Tailwind only, a design system on Adire, or another library the owner names) and the **house packages** (`@timonwa/app-utilities` and `@timonwa/react-hooks` for every project, `@timonwa/firebase-hooks` for Firebase apps — preselected, each confirmed).

## Step 2 — The manifest

One table, then wait. Every row is **CREATE** (a new path), **EDIT** (a scaffolder's file, with the exact change), **MOVE** (`git mv` source → destination, with the imports that follow) or **DELETE** (demo files, with why). Also list the commands that would run, each conflict between the starter and the standard with the skill it contradicts, and — inside a workspace — the root files this run deliberately leaves alone.

The specifications the manifest is planned from:

- [references/app-tree.md](references/app-tree.md) — one app, annotated line by line with what turns each conditional line on.
- [references/workspace-tree.md](references/workspace-tree.md) — the workspace, its shared packages, an app inside it and the API app.
- [references/moving-into-a-workspace.md](references/moving-into-a-workspace.md) — the order and traps for situations A, B and C.

## Step 3 — Restructure first

Moves happen before edits, so each edit lands once. Everything an app owns lives under `src/`; move the starter's `app/` and CSS entry in and fix every import that pointed at the old paths (grep for the old specifier, never guess the count). Situations A–C follow [references/moving-into-a-workspace.md](references/moving-into-a-workspace.md).

## Step 4 — Edit the scaffolder's files

From [Editing the scaffolder's files](references/app-templates.md#editing-the-scaffolders-files) (and, in a workspace, [references/workspace-templates.md](references/workspace-templates.md)), in order: `package.json` scripts → `tsconfig.json` → `next.config.*` → `.gitignore` → the CSS entry → `layout.tsx` and `page.tsx`.

- **Add scripts, never replace them**; `dev`, `build` and `start` are the scaffolder's.
- **Add tsconfig settings, keep the scaffolder's**; extend the shared preset inside a workspace (`typescript`).
- **The CSS entry is split, not rewritten** — keep its `@import "tailwindcss"` and the font mappings `next/font` created; the layers and dark mode follow `tailwind`.
- **Keep the linter the scaffolder chose**; the house formatter is Prettier (`devops`).

## Step 5 — Create the structure

From the tree for this situation and the templates for [the `lib/` kinds](references/app-templates.md#the-lib-kinds) and [the `lib/server` boundary](references/app-templates.md#the-libserver-boundary): the `lib/` kinds, each with a one-line-per-file barrel and never an empty kind; the server folders for the app's shape; `src/testing/`; the route groups with thin entries and their shells; `components/` by product area; and, inside a workspace, the agreed shared packages with a `README.md` and `AGENTS.md` each. Then **one vertical stub** — schema → service or API read → action → page — with `// TODO:` bodies, so the layering is shown rather than described. A standalone app also gets its CI, hooks and commitlint ([Standalone extras](references/app-templates.md#standalone-extras-ci-hooks-and-commitlint)); inside a workspace the root owns them. The rules behind every folder are `code-structure`'s; names are `naming`'s.

## Step 6 — Prove the design system

One real component per `src/ui/` tier the app needs, built on the chosen UI foundation — plain Tailwind, Adire (set up per Adire's own skill), or the named library per its docs — and from the shared package when there is one, and the shells its route groups render — a layout imports a shell, so the shell can't be a stub. Each ships a story; a test only where it has behaviour. Storybook is set up per `storybook`. Templates: [The design-system proof](references/app-templates.md#the-design-system-proof).

## Step 7 — Delete, install, verify

Delete only the approved demo files ([Demo files to delete](references/app-templates.md#demo-files-to-delete)), after confirming each exists. Propose the install commands and wait; then run the project's own `check-types`, `lint` and `build` and report the real output. A scaffold that doesn't type-check and build isn't finished.

## Step 8 — Hand off

- **`AGENTS.md`** and the `CLAUDE.md` import → `agents-md`, given the interview answers as project facts. It replaces any pair the scaffolder generated.
- **Cache Components**, if the starter didn't turn it on → the official `next-cache-components-adoption` skill.
- **The first feature** → `scaffold-feature`. **Committing** → `ship-changes`.

No documentation tree beyond a README and `AGENTS.md` per app and package.

## Output

In chat: the situation and what decided it, the interview answers, the approved manifest with each row's outcome, the moves made, the commands run with their real output, each conflict the standard won, drift the answers didn't cover, manual follow-ups (a deploy target's root directory, cache secrets), and the hand-offs. Nothing staged, nothing committed.

## Owning skills

Layout `code-structure` · names `naming` · tsconfig and typed routes `typescript` · schemas and the contracts package `schemas-and-contracts` · env `env` · workspace and catalog `monorepo` · CI and hooks `devops` · tests `testing` · styles `tailwind` · UI tiers `design-system` · components `reusables` · stories `storybook` · an Adire design system Adire's own skill · framework config `nextjs` · API layering `api-architecture` · Firebase `firebase` · integrations their own skills, named in [references/interview.md](references/interview.md).
