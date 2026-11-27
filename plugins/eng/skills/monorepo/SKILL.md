---
name: monorepo
description: Use when setting up or working in a pnpm + Turborepo monorepo — the workspace layout, pnpm 11 settings, one version per dependency through the pnpm catalog with recorded exceptions, build-script allowlists, serverless workers that pin resolved versions, peer dependencies for shared packages, the house turbo.json shape, dev through pnpm, and CI with --affected. Turborepo's own mechanics come from the official `turborepo` skill; code layout inside packages is `code-structure`'s.
---

# Monorepo

The house monorepo is **pnpm workspaces + Turborepo 2**. This skill holds the house rules for the workspace — layout, versions, the shape of `turbo.json`, how dev and CI run. How Turborepo itself works — task syntax, the graph, caching, filters, `prune`, `boundaries` — is the official `turborepo` skill, which reads the docs that ship with the installed `turbo`.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Workspace layout

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*" # deployable apps
  - "packages/*" # shared libraries and config
  - "functions/*" # serverless workers, only when present
```

- Shared packages are scoped (`@org/<name>`) and consumed with the **`workspace:*`** protocol.
- The usual set: `typescript-config`, `eslint-config`, `tailwind-config`, `ui`, `hooks`, `utils`, a shared schemas package, and a `testing` package of shared fakes. What goes inside each, and when code moves into one, is `code-structure`'s.

## pnpm

- **`packageManager` names an exact version** (`"pnpm@11.x.y"`) in the root `package.json`, so every machine and CI run the same pnpm; `pnpm/action-setup` reads it in CI. Node 25 and later no longer ship corepack, so nothing depends on it. `engines.node` states the minimum Node (`">=24"`), and `.nvmrc` holds the version CI and every machine run.
- **One version per third-party dependency, through the catalog.** Every app and package writes `"<dep>": "catalog:"`, and the version lives once in `pnpm-workspace.yaml`. The catalog records what was resolved when the dependency was added — nothing gets re-picked per package.
- **An exception is recorded, never silent.** A place that can't use `catalog:` gets an exact version and a labelled syncpack `versionGroup` saying why, so `syncpack lint` (the `deps:check` script) passes and the reason sits beside the rule. The usual cases:
  - **A host that refuses `catalog:`** — some deploy adapters read a framework's exact version from each app's own `package.json`. Pin it there, and bump it in the same change as the catalog.
  - **Serverless workers** whose build runs a plain `npm install` (see below).
  - **A tool aliased to an older major**, such as a linter whose TypeScript parser lags a release (`typescript`).
- **Dependency build scripts are blocked by default.** Allow the few that must build with `allowBuilds` in `pnpm-workspace.yaml`, a name → boolean map (`sharp: true`, `esbuild: true`). `onlyBuiltDependencies` was the pnpm 10 form and is removed in 11, where an unreviewed build fails the install. Never switch scripts on for everything.
- **pnpm 11 holds back versions newer than its minimum release age**, a supply-chain guard. A version needed sooner goes in `minimumReleaseAgeExclude`, named exactly (`zod@4.5.1`), and comes out once it ages past the window.
- **Leave pnpm 11's other supply-chain defaults on** — `strictDepBuilds` (an unallowed build script fails the install) and `blockExoticSubdeps` (transitive dependencies only from trusted sources) — and set `trustPolicy: no-downgrade`, which refuses a version whose publishing trust dropped.
- **Never force a version inside a third-party dependency's tree** (`overrides`) to silence an advisory; the fix is that dependency releasing it. How advisories are reported and which fail CI is `devops`'.

## Serverless workers

A worker in `functions/*` is bundled — esbuild into a `deploy/` folder with its own generated `package.json` — because the cloud build that installs it runs a plain `npm install`, which reads neither `catalog:` nor `workspace:`. So the generated manifest pins the **resolved** versions of its runtime dependencies, and the workers' production dependencies sit in an ignored syncpack group. Workspace packages are bundled in, never installed.

## Shared packages

- **A package that uses a singleton declares it as a peer dependency** (`react`, `react-dom`, `next`, `firebase`, a form library), so every app supplies one copy. Two copies of React or Firebase break hooks and auth state in ways no type check catches.
- **Dependencies point one way:** apps depend on packages, packages on lower packages, and nothing depends on an app or reaches into another package's files. `turbo boundaries` (experimental) checks undeclared imports and, with tags, the direction.
- Whether a package ships source or builds to `dist/`, and the module settings each needs, are `code-structure`'s and `typescript`'s.

## turbo.json — the house shape

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "globalEnv": ["NODE_ENV"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "env": ["APP_ENV", "NEXT_PUBLIC_*"],
      "outputs": ["dist/**", "deploy/**", ".next/**", "!.next/cache/**", "storybook-static/**"]
    },
    "transit": { "dependsOn": ["^transit"] },
    "lint": { "dependsOn": ["^build", "transit"] },
    "check-types": { "dependsOn": ["^build", "transit"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

- **Every env var a build reads is listed in that task's `env`.** Strict mode withholds an unlisted variable from the task and leaves it out of the cache key, so a build bakes in `undefined`, or a changed secret restores a stale cached build. Turn on `turbo/no-undeclared-env-vars` in the shared ESLint config so a missing entry fails lint.
- **`globalEnv` stays minimal** — a variable there re-hashes every task.
- **Declare `outputs` on every task that should cache**, and exclude `.next/cache/**`.
- **`transit` matches no script**: it ties `lint` and `check-types` to the packages they depend on, so a change in a source-only package expires their cache, without making them wait for each other the way `^lint` and `^check-types` would.

## Running things

- **Dev runs through pnpm, not turbo**: `pnpm -r --parallel --filter <app> --filter <app> dev`, plus a `dev:<app>` script per app. pnpm decides which apps start; turbo's `dev` task is only there to be persistent.
- **Tests run two suites at a time** (`turbo run test --concurrency=2`), so parallel suites don't starve each other of memory and time out.
- **CI runs only what changed**: `turbo run <task> --affected`, with `TURBO_SCM_BASE=origin/<base branch>` so a pull request compares against its real base rather than the previous commit. Remote caching is optional; a repo without it says so.

## Do / Don't

- **Do** pin every third-party version through the catalog; record every exception as a labelled syncpack group; allow builds one dependency at a time; declare every env var a task reads; run dev through pnpm; use `--affected` in CI with `TURBO_SCM_BASE`.
- **Don't** write a version range in an app's `package.json` when the catalog has it; force a version inside someone else's dependency tree; give a `persistent` task dependents; chain `lint` or `check-types` with `^`; let a package import an app; put a variable in `globalEnv` that only one task reads.

## Related skills

**This skill sets the rules and never writes an audit report.** An audit of this area is `/dependency-audit`, written from its own template. Run it rather than writing a report from here.

- Turborepo's mechanics — task syntax, the graph, caching, filters, `prune`, `boundaries`, troubleshooting → the official `turborepo` skill. It reads the docs bundled with the installed `turbo`; on a `turbo` too old to bundle them, upgrade first.
- Where code goes inside apps and packages, and source vs `dist/` packages → `code-structure`.
- tsconfig presets and NodeNext → `typescript`.
- CI jobs, hooks and the advisory policy → `devops`.
- Reviewing the workspace's dependencies → `dependency-audit`.
