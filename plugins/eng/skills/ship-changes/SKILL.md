---
name: ship-changes
description: >-
  Commits work as small Conventional Commits, one approved group at a time, and opens the pull request only when asked — staying on the current work branch, grouping changes by layer, feature or area with at most three changes per commit, and messages whose length follows their content. Use when asked to commit, commit in stages, push, or open a PR.
argument-hint: "[commit | pr | both] [grouping hint]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git restore --staged:*), Bash(git commit:*), Bash(git branch:*), Bash(git switch:*), Bash(git rev-parse:*), Bash(git push:*), Bash(gh pr:*), Bash(gh issue:*), Bash(awk:*)
---

# Ship changes

The history should read as a short list of meaningful changes a reviewer can follow and revert one at a time. The agent proposes, the owner approves, one commit at a time; nothing leaves the machine unless asked.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Rules that never bend

- **One approval, one commit.** A yes approves the one commit just shown — its files and its message — and nothing else. It is not standing approval for the rest of the turn or the next group, and a yes given earlier in the conversation never counts again: every commit is shown and waits for its own fresh yes. "Commit everything in stages" approves the process, never an unattended commit.
- **Stage at commit time, by path, and name the paths in the commit.** `git add <paths>` only when presenting that group, and `git commit -- <paths>` so nothing else already staged can slip in. Never `git add -A` or `git add .`.
- **Never** `--no-verify`, `--amend` on an approved commit, a rebase of pushed commits, or a force-push. A failing hook is a fix to make, then the commit is presented again.
- **Never stage** `.env*` (except `.env.example`), credentials, logs, build output or scratch files, or a file changed before this work unless the owner asks.
- **Never commit on a protected branch** — the default and tier branches `AGENTS.md` names, typically `main`, `dev`, `staging` — unless the owner explicitly asks, for that commit.
- **Never push or open a PR unless asked.** Committing is not permission to push.

## Step 1 — The branch

- **Check it first:** `git branch --show-current`, before anything else, and name it in the plan ("committing on `feat/billing`") so the owner sees it before approving. No branch (a detached HEAD, mid-rebase) → stop and ask. Protected → stop; see below.
- **On a work branch, keep working on it.** If the current branch isn't protected (the default and tier branches `AGENTS.md` names — typically `main`, `dev`, `staging`), every commit goes on it: after earlier commits, after a break, and when extending the same feature. Having already committed is never a reason for a new branch.
- **A new branch only when** the current one is protected, the owner asks, or the work is clearly unrelated to the branch — and in that last case, **ask**; never decide alone. A new branch is `type/short-description`, cut from an up-to-date default branch.
- **If the branch's PR is already merged** (`gh pr view --json state`), new work on it would be lost or tangled: say so and ask whether to start a fresh branch. Never switch silently.

## Step 2 — Plan the groups

First read what is there — `git status` and `git diff`, staged and unstaged — and list it in three parts: **already staged**, **changed but unstaged**, **untracked**, marking which files this work changed.

- **Files this work didn't touch** get their own list in the plan with the question "include these?", and stay out unless the owner says yes.
- **A file already staged that this work didn't stage** is unstaged (`git restore --staged <path>`) before any commit, never carried along.

Then present the plan — each group's files and its subject — before staging anything, so wrong grouping is caught while it's cheap. Group so each commit is **one reviewable, revertable unit**: changes that would be reviewed or reverted together go together; if undoing one wouldn't make you undo the other, they're two commits.

- **One feature** — by layer, in build order: contracts and schemas → services and data → routes → actions → components → pages. A test or doc goes with the code it covers; two thin layers may share a commit.
- **Several features** — by layer across them, or by feature; pick whichever gives commits that each build and read as one idea, and say which in the plan.
- **A pile of separate changes** (review fixes, cleanup) — **never one file per commit.** Group by where they live (the same app, package or layer) or by what they are (copy fixes, type fixes, renames). A tiny change rides along in a neighbouring commit as a body line; it never gets a commit of its own.
- **No count of edits per commit.** A commit can hold many small edits that belong together — every typo fix, every rename. What limits it is whether its message can describe it (Step 3).
- **Order** so every commit builds on its own: shared packages before the apps that use them, a token before the component that reads it, a schema before its service.
- **Partial files:** when one file holds two concerns, stage the hunks that belong to this commit rather than lumping the file into the wrong one.

## Step 3 — Write each message

The number of lines comes out of these steps, never from a target:

1. **Write the subject** — what the commit does as a whole (`fix typos and stale names across the billing pages`).
2. **Ask whether the subject alone tells a reader what they need.** Yes → stop; no body. Most commits of one kind of edit end here.
3. **Otherwise add body lines, each saying something the subject doesn't** — a distinct part of the change, or the reason when it isn't obvious. Same-kind items share a line ("renames `getUser` to `fetchUser` and `data` to `profile`"). Never a line that repeats the subject or lists files.
4. **Still more than three body lines needed?** The commit mixes concerns its subject can't hold — split it.

- **Maximum:** the subject plus three body lines. **Every line at most 100 characters — measured before proposing**, never estimated (`printf '%s\n' "$line" | awk '{ print length }'`).
- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`; `!` after the type or scope for a breaking change, with what breaks in the body.
- **Scope:** the one app or package changed, from the scopes `AGENTS.md` lists; two or more → no scope.
- **Subject:** starts lowercase, imperative ("add", "fix", not "added"), no full stop, says what changed for the reader — never "update files".
- **Body:** the changes or the why, never a file list (the diff has it), in the project's spelling.

## Step 4 — Commit, one at a time

**Never run a check a hook is about to run.** Read the hooks first — `.husky/`, lefthook's or pre-commit's config, the lint-staged config — and:

- **Whatever the pre-commit hook runs is not run beforehand**; its result is reported after the commit.
- **A check the hook doesn't run** is run before committing only when the project's docs ask for it (a "Before committing:" line in `AGENTS.md`); otherwise the pre-push hook or CI covers it.
- **No hooks at all** → a quick format, lint and type check on what changed, so nothing obviously broken is committed.

Then, for each group: stage its paths, show `git diff --cached --stat` and the message, wait for approval, and commit with the paths named and the message from a heredoc. Report the hash and the hook's result, then present the next group. After the last one, `git status` is clean or the leftovers are named.

## Step 5 — The pull request (only when asked)

1. The checks pass, without repeating any that a pre-push hook or CI runs: only those the project's docs ask for before pushing, or a quick lint and type check when there are no hooks or CI.
2. Check the branch again (`git branch --show-current`) — it may have changed during the session — then push it (`git push -u origin <branch>`), never a protected branch.
3. `gh pr create` against the branch `AGENTS.md` names as the target, with:
   - **a title** in the same Conventional Commits format, for the whole branch;
   - **a body** from the repo's PR template, filled in honestly — what changed as short bullets (one per idea, not per file), how it was tested, screenshots for UI changes, deferred work and known gaps listed rather than hidden;
   - **linked issues** — `Closes #n` for each issue the PR completes, `Part of #n` for one it only advances; ask when unclear;
   - **the author assigned** (`--assignee @me`).
4. Report the PR URL, the issues linked and the assignee. How the PR merges (a merge commit for promotions) is `devops`'.

## Output

In chat: the branch used and why, the approved plan, each commit's hash and hook result, what's left uncommitted, and the PR URL when one was opened. Reviewing a PR is `review-pr`'s.
