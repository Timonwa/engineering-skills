# Monorepo config templates

Copy-paste-able house templates behind `SKILL.md`. All app-agnostic — replace `@org` with the repo's scope, and check every version against the registry. The root `turbo.json` is in `SKILL.md`; the CI workflow and its setup action are `devops`'s, with the full templates in `scaffold-app`.

## Root `package.json` (essentials)

```json
{
  "name": "@org/root",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.28.12",
  "engines": { "node": ">=24" },
  "scripts": {
    "build": "turbo run build",
    "lint": "turbo run lint",
    "check-types": "turbo run check-types",
    "test": "turbo run test --concurrency=2",
    "dev": "pnpm -r --parallel --filter web --filter app dev",
    "dev:web": "pnpm --filter web dev",
    "deps:check": "syncpack lint"
  },
  "devDependencies": { "turbo": "catalog:", "syncpack": "catalog:" }
}
```

`packageManager` is exact so every machine and CI run the same pnpm; `pnpm/action-setup` reads it. `.nvmrc` beside it holds the Node version.

## `pnpm-workspace.yaml` (with catalog)

```yaml
packages:
  - "apps/*"
  - "packages/*"
  # - "functions/*"   # only if the repo has serverless/workers

catalog:
  next: 16.4.3 # example values — check the registry
  react: 19.2.8
  react-dom: 19.2.8
  turbo: 2.11.11

# pnpm blocks dependency lifecycle scripts by default — allowlist only what must build.
# pnpm 11 form; `onlyBuiltDependencies` (a list) was the 10 form and is removed in 11.
allowBuilds:
  esbuild: true
  sharp: true
```

Consume in an app: `"next": "catalog:"`, `"react": "catalog:"`.

Every spec written as `"catalog:"` anywhere in the workspace must have a matching entry here — a missing one fails install immediately with `ERR_PNPM_CATALOG_ENTRY_NOT_FOUND_FOR_SPEC` (typical stragglers: `@types/*`, `eslint`, `typescript`, `storybook` + `@storybook/react` + `@storybook/react-vite`).

## Per-package `turbo.json` — a `ui` package with a split build

```json
{
  "extends": ["//"],
  "tasks": {
    "build": { "dependsOn": ["build:styles", "build:components"] },
    "build:styles": { "outputs": ["dist/**"] },
    "build:components": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "with": ["dev:styles", "dev:components"] },
    "dev:styles": { "cache": false, "persistent": true },
    "dev:components": { "cache": false, "persistent": true }
  }
}
```

## Shared config package — `packages/typescript-config`

```json
// package.json
{ "name": "@org/typescript-config", "version": "0.0.0", "private": true,
  "files": ["base.json", "nextjs.json", "node-library.json", "react-library.json"] }
```

```jsonc
// an app's tsconfig.json
{ "extends": "@org/typescript-config/nextjs.json", "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }
```

Same shape for `@org/eslint-config` (or `@org/biome-config`): the config lives in the package, apps extend it. Add both to the consuming app's `devDependencies` as `"@org/typescript-config": "workspace:*"`.
