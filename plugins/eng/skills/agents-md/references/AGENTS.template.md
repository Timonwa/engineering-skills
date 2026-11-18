<!--
AGENTS.md TEMPLATE. Keep the root file under 200 lines. Include a section only when the project has something an agent can't work out from the code; delete the rest. Every rule is concrete enough to check ("Run `pnpm test` before committing", not "test your changes"). Detail lives in the per-layer guides, linked. Rules for one app or package go in that folder's AGENTS.md. Never hard-wrap prose; never include secrets or anything that changes weekly. Delete these comments when done.
-->

# AGENTS.md — <Project name>

<One sentence: what the product is and who it's for.>

Before touching a layer, read its guide in [`<guides folder>/`](<guides folder>/<index file>). Every app and package has its own `AGENTS.md`, which adds to this one; where it departs from a rule here, it says so. <Framework docs line, e.g. "Read the version-matched docs in `node_modules/next/dist/docs/` before assuming Next.js behaviour.">

## Commands

```bash
<install, dev, per-app dev, build, check-types, lint, format, test, and project scripts, each with a one-line comment>
```

Before committing: `<the exact check command>`.

## Structure

```txt
<the top-level tree: one line per app, package and folder, what it holds, its dev port>
```

- <Only the structure rules an agent would get wrong, e.g. where server code sits, which barrel is server-only, what decides app vs package.>

## Conventions

<Only what differs from the defaults or from what the code shows. One bullet per rule, grouped under the layer it governs; drop any group with nothing to say. A skill may follow a rule as "(full standard: `skill`)".>

### <Layer, e.g. Data and caching>

- <rule>

## Language

- <The spelling the project uses for routes, identifiers and copy, and the product's core nouns — one word per thing.>

## Workflow

- <Branches, how code moves up, how promotion PRs merge.>
- <Commit message format, types and scopes.>
- <What a PR needs.>

## Deviations from the house standards

- <One line per place this project departs from a house skill on purpose: what differs and why, linking the detail. A skill's rule gives way to a deviation recorded here.>

## Never

- <The hard constraints, each one concrete.>

## Troubleshooting

- <Each recurring error → its fix, one line.>
