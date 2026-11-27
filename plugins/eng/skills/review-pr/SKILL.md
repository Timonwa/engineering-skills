---
name: review-pr
description: >-
  A command. Reviews a pull request or a branch against what it set out to do and the project's own rules, plus real bugs — runs or reads the checks, hunts by angle, proves every finding, and reports a severity table. Read-only unless asked to comment on the PR or fix findings. A project with its own review skill uses that instead.
argument-hint: "[pr-number | pr-url | branch] [--comment] [--fix] [extra focus]"
allowed-tools: Read, Grep, Glob, Task, Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git status:*), Bash(git merge-base:*), Bash(gh pr view:*), Bash(gh pr diff:*), Bash(gh pr checks:*), Bash(gh pr review:*), Bash(gh issue view:*), Bash(gh repo view:*), Bash(pnpm:*)
---

# Review a pull request

**The user usually runs this by name, and an agent can run it too when the work needs this check. It reports in chat first, and changes no code and posts nothing to the pull request unless asked to (`--fix`, `--comment`).**

A review exists to catch what would hurt after merge — a bug, a security hole, a broken rule the next feature would copy — and to say so in a way the author can act on in one pass. Every finding is proved before it's reported; a short true list beats a long padded one.

**This is the generic review.** A project that keeps its own review skill — with where its specs live, its extra rules and angles — uses that one instead; this is the base such a skill is built from.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Rules that never bend

- **Read-only by default.** No edits, commits, pushes, PR comments, approvals or merges unless asked for that specific thing. Commenting (`--comment`) and fixing (`--fix`) are separate requests.
- **Prove it or drop it.** A finding names the file and line, quotes the code, and states the situation that goes wrong. "Might be an issue" is not a finding.
- **Judge the change, not the codebase.** Only lines the PR adds, removes or depends on. A problem already on the base branch is mentioned once at the end, never as a blocker.
- **The project's rules win where it states them;** where it says nothing, the house skills are the standard.

## Step 1 — Gather

1. **The PR:** `gh pr view <n> --json title,body,author,baseRefName,headRefName,files,commits` and `gh pr diff <n>`. A branch with no PR: the diff and log against its base (`git merge-base`).
2. **The intent:** the PR body and every issue it links (`gh issue view`), with their acceptance criteria, and any spec or doc it references. Review against what the change was meant to do, not only against style.
3. **The rules:** `AGENTS.md` (root and closest), the guides it links for the areas the diff touches, and the project's own skills.
4. **Skip** lockfiles, build output and binaries beyond noting they changed. A large mechanical change (a rename, a reinstall) is spot-checked, and the report says so.
5. **The checks:** if CI ran, read its result (`gh pr checks`) and don't repeat what it covered. Otherwise run the project's type check, lint and the tests the diff reaches. A failing check is the first finding.

## Step 2 — Hunt, angle by angle

Read every changed line, then look at it from each angle. On a diff over a few hundred lines, run the angles as separate parallel tasks if your agent can, so they don't share blind spots; otherwise take them one at a time. Each angle's findings carry file, line, quote and failure scenario.

1. **Correctness** — wrong conditions, off-by-one, null and undefined, a missing `await`, `0` or `""` treated as missing, swallowed errors, a state that can't be reached or left, a loading or error state never shown.
2. **Removed behaviour** — for every deleted or replaced line, what it guaranteed and where the new code still guarantees it. A dropped guard, error path or validation is a finding.
3. **Callers** — every changed export: who imports it, and does each caller still hold (a new required prop, a changed return shape, a renamed field).
4. **Compatibility and data** — what's already out there when this deploys:
   - documents stored under the old schema, which the new read must still parse or a migration must reshape (`schemas-and-contracts`);
   - clients still on the old version — an open tab, a mobile build, an integrator — calling a changed route or reading a changed response;
   - security rules and indexes that must deploy before the code that needs them, and a worker or another app that reads the same data;
   - a new env value or secret that every tier needs before the deploy (`env`).
5. **The intent** — does the change do what its issue or spec asked, all of it, and nothing it shouldn't?
6. **The project's rules** — structure, naming, data and caching, API and auth, styling and the design system, as `AGENTS.md`, its guides and the house skills (`code-structure`, `naming`, `api-architecture`, `nextjs`, `design-system`) state them. Changed UI is checked for `accessibility` too: labels, keyboard use, focus, contrast.
7. **Reuse** — new helpers, hooks, schemas and constants checked against the project's packages (including the house packages it uses) and its own `lib/`. Name what it duplicates.
8. **Security** — secrets reaching the client, input that skips validation, a missing guard or ownership check, unsafe HTML, an open redirect (`frontend-security`, `backend-security`, `access-control`).
9. **Performance and operations** — a query or call inside a loop, an unbounded list, a client bundle that grew, work on the request path that belongs in a queue; and whether a failure here would show in the logs and alerts.
10. **Tests** — new shared code, services, routes, actions and hooks have specs beside them, mocking only the I/O boundaries; nothing weakened or deleted to go green (`testing`).
11. **Docs** — an `AGENTS.md`, README or guide the change now contradicts, or a new command, route, env value or convention not written down, with the line to update.
12. **Dependencies and design** — each new dependency earns its place: no house package or existing one already does it, it's maintained, its licence fits, and its size is worth it (`dependency-audit`). A new abstraction has a second caller or a reason; one used once is complexity, not design.
13. **The PR itself** — the branch, small Conventional commits, the template filled in honestly, issues linked (`ship-changes`). A PR too large to review well — past a few hundred changed lines of logic, or mixing a refactor with a feature — is a finding that names how to split it. A promotion PR (a tier branch into the next) is checked only for green checks, no stray commits and the merge method (`devops`), never re-reviewed line by line.

Then a simplification pass: state that could be derived, copy-pasted variants, dead code, effects syncing what could be computed, hand-written memoisation the compiler makes redundant.

## Step 3 — Verify every finding

Merge findings that point at the same mechanism. For each, try to break it — read the surrounding code, the caller, the test, the docs. Keep it only if it is:

- **Confirmed** — the exact input or state that triggers it and the wrong result, with the line quoted; or
- **Likely** — a real mechanism with an uncertain trigger, labelled as likely, with what would confirm it.

Drop anything guarded elsewhere, already handled, or a matter of taste no rule decides.

## Step 4 — Report

In chat:

```markdown
## Review of #<n> — <title>

**Read:** what the PR does and whether it meets its intent, in two or three sentences.
**Checks:** format ✓ · types ✓ · lint ✓ · tests ✗ (1 failing) · build ✓

| #   | Severity   | Area | Where        | Finding        | Fix            |
| --- | ---------- | ---- | ------------ | -------------- | -------------- |
| 1   | Must fix   | API  | `file.ts:41` | One sentence.  | One sentence.  |
| 2   | Should fix | Reuse | `file.ts:3` | One sentence.  | One sentence.  |
| 3   | Nit        | Naming | `file.tsx:12` | One sentence. | One sentence. |

**Details** — each finding's failure scenario in full, the quoted line, and the fix.

**Already on the base branch** (not this PR's to fix): …
```

- **Must fix** — a bug, a security issue, a failing check, a broken contract, or a rule the project states as never or always. Blocks merge.
- **Should fix** — a convention the next feature would copy, missing tests or stories, duplication, stale docs. A test weakened, skipped or deleted to go green is always **Must fix**: it hides the bug it was written to catch.
- **Nit** — naming, wording, small simplifications. Never blocks.

Likely findings say so in the Finding cell. Nothing found → say so plainly, with what was checked. Praise only what is worth repeating, in one line.

## Step 5 — Only when asked

- **`--comment`** — confirm, then post the table and details as one review (`gh pr review <n> --comment`, or `--request-changes` when there's a Must fix and the owner agrees). Never approve or merge unless told to.
- **`--fix`, or "fix #1 and #3"** — on the PR's branch, change only those findings, re-run the checks they touch, report what changed, and stop. Committing is `ship-changes`'.
