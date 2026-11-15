# Moving into a workspace

The three workspace situations, each after the manifest is approved. The workspace shell itself — `pnpm-workspace.yaml`, `turbo.json`, root `package.json`, CI, hooks — is in [workspace-templates.md](workspace-templates.md); its rules are `monorepo`'s and `devops`'.

## Contents

- A — an app at the root moves into `apps/<name>`
- B — a `create-turbo` starter is adapted
- C — a house workspace gets another app

## A — Move an app into `apps/<name>`

The move is the risky part. Do it in this order.

1. **Move tracked files with `git mv`** (approved by name) so history follows: `mkdir -p apps/<name>`, then `git mv` each tracked entry that belongs to the app (`src`, `public`, `package.json`, `next.config.*`, `postcss.config.mjs`, `tsconfig.json`, `next-env.d.ts`, `components.json`…). Never `.git`, `node_modules` or build output.
2. **Don't move generated or ignored artifacts.** Delete `node_modules/`, `.next/`, `.turbo/` and `*.tsbuildinfo` at the old location; a moved `node_modules` leaves broken symlinks. An untracked real file (`.env`) moves with plain `mv` and stays ignored.
3. **Split the root.** Repo-wide tooling stays at the root: `.gitignore` (app-specific entries go into the app's), `.editorconfig`, `.nvmrc`, `.prettierrc.json`, `commitlint.config.ts`, `.husky/`, `.github/`, `LICENSE`, `README.md`. App config stays in the app: `next.config.*`, `postcss.config.mjs`, the CSS entry, `.env*`.
4. **One lockfile, at the root.** Delete the app's lockfile after the move and install once from the root (approved). Two lockfiles let apps drift onto different versions.
5. **`packageManager` and `engines` belong to the root `package.json`** — move them out of the app's.
6. **Rewrite the app's `package.json`:** name it `@<scope>/<app>`, `"private": true`, keep the starter's versions but move each into the catalog and write `"catalog:"`, and add `"@<scope>/<pkg>": "workspace:*"` for each shared package it uses. A dependency a host can't read as `catalog:` keeps its exact version with a recorded syncpack exception (`monorepo`).
7. **Fix `tsconfig.json`:** extend `@<scope>/typescript-config/nextjs.json` and keep `paths` relative to the app (`{"@/*": ["./src/*"]}`) — a path still relative to the old root breaks every `@/` import.
8. **Fix the CSS entry:** an app rendering the shared UI package adds `@source` for that package's `src`, or the build emits no utilities for its components (`tailwind`).
9. **Check the framework's workspace settings** against the version's own docs: whether the app needs `transpilePackages` for source-shipping packages, and `outputFileTracingRoot` for standalone builds. Verify; don't assume either way.
10. **Scripts and CI change shape:** root scripts become `turbo run <task>`, dev runs through pnpm filters, CI uses `--affected` (`monorepo`, `devops`).
11. **The deploy target's root directory now points at `apps/<name>`** — a manual follow-up for the owner, named in the output.

## B — Adapt a `create-turbo` starter

The starter is a demo, not the standard. Read its real shape first (`ls apps packages`, every `package.json`) — it has shipped two Next.js apps and `ui`, `eslint-config` and `typescript-config` packages under a `@repo/*` scope.

- **Apps** — rename the ones you keep to the agreed names (`git mv apps/docs apps/admin`), delete the rest, set each dev port. A rename also updates its `package.json` name, every `workspace:*` consumer and every `--filter` naming it.
- **Scope** — rewrite `@repo/*` to the agreed scope in every `package.json`, `extends` and import, then grep for leftovers; one stray reference fails the install.
- **Packages** — `typescript-config` and `eslint-config` keep their names and get the house presets; `packages/ui` keeps its folder and is reshaped into the design-system package (`design-system`); drop its `turbo gen` scaffolding unless asked. Add `contracts`, `hooks`, `utils`, `tailwind-config` and `testing` as agreed.
- **`turbo.json`** — edit to the house shape (`monorepo`), with every env var a build reads listed in its task.
- **`pnpm-workspace.yaml`** — add the catalog and `allowBuilds`, then point each app at `"catalog:"`.
- **Keep the starter's versions**; the catalog records them, it doesn't re-pick them.

## C — Add an app to a house workspace

Skip the shell. Confirm it still matches the standard and report drift, then: give the app a free dev port and a `dev:<app>` script, add it to the root `dev` filter list, wire its `workspace:*` and `catalog:` dependencies, extend the shared tsconfig preset, add it to CODEOWNERS when there is one — then shape its insides as a single app. Drift between existing apps is reported by `conventions-audit`, not fixed here.
