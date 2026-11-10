---
name: agents-md
description: >-
  Writes or updates a project's AGENTS.md and the short AGENTS.md notes in each app and package — what an agent can't work out from the code: commands, structure, conventions that differ from the defaults, workflow, recorded deviations from the house standards and hard constraints, under 200 lines. Use when starting a project, setting up AGENTS.md or CLAUDE.md, or bringing a project's agent instructions up to date.
argument-hint: "[path to project root]"
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(git symbolic-ref:*), Bash(git branch:*), Bash(gh repo view:*)
---

# AGENTS.md

`AGENTS.md` is the open, cross-tool file that tells coding agents how to work in a repo, beside a `README.md` written for people. It loads into every session, so every line costs context: it holds only what an agent can't work out from the code, written as rules it can check. Detect what you can, ask only for the gaps, and leave no `<placeholder>` behind.

The blueprint is [references/AGENTS.template.md](references/AGENTS.template.md).

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## What goes in

- **Commands** — install, dev, build, type check, lint, format, test and project scripts, by their exact names, in a code block; and the command to run before committing.
- **Structure** — the top-level tree and the few placement rules an agent would get wrong.
- **Conventions that differ from the defaults** — a project choice an agent wouldn't guess (a spelling policy, a component it must use instead of the framework's, a barrel that is server-only, a caching tier that needs sign-off).
- **Workflow** — branches, commit format, what a PR needs.
- **Deviations from the house standards** — one line each: what differs, why, and a link to the detail. Every skill's opening step reads this section, so a deviation not recorded here gets questioned.
- **Never** — hard constraints, each concrete.

## What stays out

- **General standards** the model already knows or a skill or linter enforces — "no `any`", "derive, don't sync". State a project's choice where it matters; a skill may follow as "(full standard: `skill`)", never instead of the rule.
- **Anything readable from the code** — a list of dependencies, every folder, what each file exports.
- **Long how-tos** — they go in the guide for that layer, linked from the line that needs them.
- **Rules for one app or package** — they go in that folder's `AGENTS.md`.
- **Anything that changes weekly**, counts that go stale, notes about what isn't built yet, and secrets of any kind.

## How it reads

- **Under 200 lines** for the root file. Longer files cost context and get followed less; move what applies to one folder into that folder's file.
- **Concrete and checkable.** "Run `pnpm test` before committing", not "test your changes"; "API handlers live in `src/server/`", not "keep files organised".
- **Grouped under headings, one rule per bullet**, no two rules that contradict. A section with nothing project-specific to say is left out, not filled with "None."
- **Never hard-wrapped.**

## Step 1 — Detect

- **Package manager** from the lockfile; **commands** from `scripts` in the root and workspace `package.json` files.
- **Shape:** a monorepo only if `pnpm-workspace.yaml` lists `packages:`, `package.json` has `workspaces`, or there's an `apps/` + `packages/` layout.
- **Structure, framework and tooling** from the folders, dependencies and config files.
- **Branches:** the default (`gh repo view --json defaultBranchRef`, else `git symbolic-ref --short refs/remotes/origin/HEAD`) and any tier branches.
- **Existing docs** — an `AGENTS.md`, the per-layer guides, `README.md`s, `CONTRIBUTING.md`. Reuse them; never contradict them.
- **Recorded exceptions** — labelled syncpack groups, comments in workspace config — which become Deviations lines when they depart from a house skill.

## Step 2 — Ask only for the gaps

Batch short questions for what the repo doesn't show and an agent would get wrong — typically the spelling policy, where the auth gate sits, which caching choices need sign-off, and what a PR must include.

## Step 3 — Write

1. **Fill the template's sections that apply**, and delete the rest.
2. **Updating an existing file:** keep its project facts; cut lines that restate general standards or what the code shows; bring a drifted rule back to the house standard **unless the project records the difference as a deviation** — if it doesn't, ask which it is. Show a summary of what changed, with the line count before and after.
3. **Keep the block `next dev` writes.** From Next.js 16.3, `next dev` adds a block between `<!-- BEGIN:nextjs-agent-rules -->` and `<!-- END:nextjs-agent-rules -->` to each app's `AGENTS.md`. Never edit or remove it; it comes back on the next run, so commit it.
4. **Wire up Claude Code:** a root `CLAUDE.md` containing `@AGENTS.md`, so Claude Code reads the same file. An `AGENTS.md` on its own is read only when no `CLAUDE.md` exists.

## Per-app and per-package files

A short `AGENTS.md` in each app and package — a heading and a handful of bullets — holds **the traps the code doesn't show** in that folder: a server-only barrel, a component that must come from a package, a config the bundler needs written a certain way. Each bullet links its guide. The closest file wins.

## Keeping it current

A stale `AGENTS.md` is worse than none, because the agent trusts it. Update it in the same change as the code it describes, and add a line when an agent repeats a mistake or a review keeps catching the same thing.

## Step 4 — Report

Summarise what was detected and what the user supplied, list each deviation recorded and anything assumed, and give the line count. If the repo has no structure yet, point to `scaffold-app` first. Don't commit; that's `ship-changes`'.
