---
name: migrate
description: >-
  Guided framework, major-version and library-to-library migrations — read the target version's own docs, go one major at a time, check runtime minimums and peer dependencies, plan in checkpoints, run the official codemods, then apply and verify one step at a time, stopping at the first breakage. Use when asked to migrate or upgrade Next.js, React, Tailwind, Storybook, pnpm or any major dependency, or to move from one library to another. Plans first and never migrates in one shot.
argument-hint: "[package] [target] | [migration description]"
allowed-tools: Read, Grep, Glob, Edit, Write, WebSearch, WebFetch, Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git switch:*), Bash(ls:*), Bash(pnpm:*), Bash(npx:*)
---

# Migrate

Runs a framework, major-version or library-to-library migration as a gated workflow: work out what's installed, read what changed, present a checkpointed plan, and only after approval apply it one verified step at a time.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Arguments

- `[package] [target]` — `next 17`, `tailwind 5`, `pnpm 11`, or `latest` as the target.
- `[migration description]` — a library-to-library move, e.g. `"styled-components to tailwind"`.
- None → show the forms with one example each and ask.

## Guardrails

- **Never in one shot.** Plan → explicit approval → small increments, each verified before the next. Presenting the plan is not approval; "upgrade X" approves analysis and planning only. A plan that changes midway is presented again.
- **Stop at the first breakage.** A step that fails verification stops the run: report the error and a suggested fix, then wait.
- **Never start, stop or restart a dev server, or kill a process.** Ask the owner to run it and report back.
- **No install without approval**, and never commits — that's `ship-changes`'.

## Step 0 — Orient

**The branch, first** (`git branch --show-current`), named in the plan the owner approves:

- **A protected branch** (the default and tier branches `AGENTS.md` names) → propose a branch for the move, cut from the up-to-date default branch and named for it (`chore/upgrade-next-17`), and create it once approved.
- **A work branch for something else** → a migration is unrelated work, so ask whether to migrate there or on a new branch; recommend a new one, since a migration touches files everywhere and should be reviewable and revertable on its own. Never decide alone.
- **A branch already made for this migration** → keep working on it.

From `AGENTS.md` and the repo: single app or workspace, the package manager and its major (the lockfile and `packageManager`), the current versions of everything involved (the catalog in a workspace, every `package.json` otherwise), and the project's own verify commands. Check `git status` — a migration starts from a clean tree so every step can be undone.

- **The runtime the target needs:** its minimum Node and TypeScript, against `.nvmrc`, `engines`, the CI image and the host's runtime. Any of them below the minimum is the first step of the plan.
- **The host's support:** a deploy adapter that hasn't released support for the target blocks the deploy, whatever passes locally. Check before planning.
- **Peer dependencies:** every package that declares the framework as a peer (a UI library, an auth SDK, a test renderer) and whether it supports the target yet. `pnpm why <package>` shows who pulls in what.

## Step 1 — Read what changed

- **One major at a time.** First move to the latest minor of the current major and clear every deprecation warning it prints — those are the next major's removals, announced. Then one major per checkpoint, never two jumps in one step, each built and verified before the next.

- **The target version's own docs come first.** Next.js ships version-matched docs in `node_modules/next/dist/docs/` once the target is installed in a scratch branch or read from the release's docs; other projects publish an upgrade guide per major. Read the guide between the current and target versions before the web, and never work from memory for version-specific behaviour.
- **Official codemods and skills.** Note every codemod the maintainers ship — `npx @next/codemod`, the Storybook and Tailwind upgrade tools, pnpm's `pnpm-v10-to-v11` — and any official skill for the move (turning on Cache Components → `next-cache-components-adoption`). Read what each covers: Next's `upgrade` codemod doesn't run every migration (synchronous `params`, `cookies()` and `headers()` from the 15 period need `next-async-request-api` on its own), and its upgrade guide has a prompt written for agents doing the move.
- **Usage** — grep for the APIs the target deprecates or removes, and count the affected files.

## Step 2 — Plan in checkpoints

Every step says **what** changes (files and patterns), **why** (the breaking change behind it), its **risk**, and whether a **codemod** does it or it's manual. Steps group into **checkpoints**; after each, the project type-checks, lints and builds. The plan covers:

1. Pre-checks — a clean tree, the current verify commands green.
2. Dependency bumps — which packages, which versions, which workspaces.
3. Codemods first, then the config changes, then the manual code changes with file counts.
4. The workspace traps that apply (below).
5. The final verification, tailored to this migration.

Present it and wait for approval. Offer to narrow the scope — one app at a time in a workspace.

## Workspace traps

- **Bump the catalog and every recorded exact pin together.** A dependency a host can't read as `catalog:` is pinned in each app; it moves in the same change, or the apps drift (`monorepo`).
- **Workers pin resolved versions** in their own manifests; bump those too.
- **Rebuild every package that builds to `dist/`** after a change that touches it, and ask the owner to restart whatever runs from it — a stale server reports the new shape as an error.
- **Registry-installed files** (a component library installed as source): a reinstall with `--overwrite` replaces local edits. List the project's edits before reinstalling and re-apply them after.
- **One copy of the framework.** After the bump, `pnpm why react` (and the framework itself) must show one version; two copies break hooks and context with no type error. `pnpm dedupe` fixes a duplicate the lockfile allows.
- **Lint toolchains lag majors.** A linter whose parser doesn't support the new major yet gets an aliased older version, recorded with its reason, until it catches up (`typescript`).

## Library to library

A move from one library to another (one styling system or state library to another) doesn't happen in one change. Install the new one beside the old, move one area at a time with both working, and remove the old one only when a search finds no use of it. Each area is its own checkpoint, so the app ships at any point in between.

## Step 3 — Apply, one step at a time

For each step: make the change, then run the project's type check and lint, and the test suites the step reaches (two at a time). Report the result, then move to the next. On failure: stop, report, suggest, wait.

## Step 4 — Final verification

- The type check, lint and build across every affected app and package.
- The test suites, and the Storybook tests if UI changed.
- A grep for leftovers: removed APIs, old version strings, codemod artifacts, the old package name.
- **The way back:** the previous release stays deployable until the new one has run in production, and the plan names how to roll back — the host's previous rollout, and the lockfile on the base branch. A data or config change the new version made is rolled back too, or written down as one-way.
- The owner checks it running: ask them to start the dev servers for the affected apps and confirm each boots and its main pages render. Never start them yourself.

## Output

In chat: the migration and its scope, each step with what changed and its verification result, the breaking changes handled and how, anything left unresolved, and the manual follow-ups (servers to restart, docs to update). No report file; the diff is the artifact. Committing is `ship-changes`'; CI or workflow changes the migration needs are `devops`'.

## Related skills

**This skill sets the rules and never writes an audit report.** An audit of this area is `/codebase-audit`, written from its own template. Run it rather than writing a report from here.
