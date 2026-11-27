---
name: env
description: >-
  Environment configuration for Next.js apps, an API and workers — secrets in env and public per-tier facts in committed constants, `APP_ENV` as the tier, a Zod env guard at boot, `NEXT_PUBLIC_` rules, a names-only `.env.example`, App Hosting secret grants, rotating and responding to a leaked secret, and safe ops scripts. Use when adding a config value, a secret, a grant, a tier, or anything that reads env.
---

# Env

Configuration splits three ways: **secrets** in env, **public per-tier facts** in committed code, and **the tier itself** in one variable. Each app validates its env at boot, so a missing or malformed value stops the app before it serves a request.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Secret or constant

**One question decides: would leaking this hurt?**

- **Yes → env**, and a secret manager on deployed tiers: API secrets, tokens, service-account keys, encryption keys, signing secrets.
- **No → a committed constant**, however much it differs per tier: base URLs, cookie domains, CORS origins, project and bucket ids, a Firebase web config, a public API key, an analytics id. Keyed off the tier in a `site.ts` (or a shared constants file when several apps read it), so every tier's values are reviewable in one diff and a new deployment needs no new variables.

A public value that isn't a secret has no reason to be an env var, so `NEXT_PUBLIC_` variables are rare.

**A Client Component gets a per-tier fact as a prop**, or from a provider the layout fills: the layout, a Server Component, reads the constant and passes the value down (the client SDK's config, the API's origin). The tier comes from server-only env, so a client module never imports the constants file that reads it.

## The tier is `APP_ENV`

- **`APP_ENV` names the tier** (`local`, `development`, `staging`, `production`) and is the only switch. Code branches on it, and per-tier constants are keyed by it.
- **Never set or branch on `NODE_ENV`.** The framework owns it and it describes the build mode, not where the build runs — a staging build is a production build.

## The env guard

- **Each app has one `env.ts`**: a leaf module that parses `process.env` with Zod and exports `env`. It imports only `zod`, plus `server-only` in a frontend, so a failed parse is the only thing that can break it.
- **It fails loudly at boot**, with a readable message (`z.prettifyError`), never by returning `undefined` later.
- **A value optional locally but required on a deployed tier** is `.optional()` plus a `superRefine` that requires it when `APP_ENV` isn't `local`. The deployed boot then fails instead of quietly switching a feature off.

  ```ts
  import "server-only";
  import { z } from "zod";

  const EnvSchema = z
    .object({
      APP_ENV: z.enum(["local", "development", "staging", "production"]),
      MAINTENANCE_BYPASS_TOKEN: z.string().min(32).optional(),
    })
    .superRefine((value, ctx) => {
      if (value.APP_ENV !== "local" && !value.MAINTENANCE_BYPASS_TOKEN) {
        ctx.addIssue({ code: "custom", path: ["MAINTENANCE_BYPASS_TOKEN"], message: "Required on every deployed tier" });
      }
    });

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
  export const env = parsed.data;
  ```

- **App code imports `env`, never `process.env`.** The only direct reads are:
  - the `env.ts` guard itself;
  - `next.config.*`, which runs before the app and can't import the guard;
  - test setup files, which seed the values the guard validates;
  - standalone scripts;
  - a client module reading a `NEXT_PUBLIC_` value, because the guard is server-only and Next inlines a `NEXT_PUBLIC_` read only when it's written out literally.

  A new direct read outside that list is a finding. A project names its own carve-outs in its docs.

## `NEXT_PUBLIC_`

- **Only for a value safe in the browser bundle** — Next inlines it at build time, so anyone can read it.
- **A `NEXT_PUBLIC_` secret grant needs both build and runtime availability** on a host that separates them, because the value is inlined during the build and the server may also read it.
- **A secret never takes the prefix.**

## `.env` and `.env.example`

- **`.env` per app**, gitignored: the local secrets and `APP_ENV=local`. Its values come from the secret manager through a script (`env-setup` writing the file for the tier named), never passed around by hand — not in chat, an issue, a PR, a commit or an AI tool's prompt.
- **`.env.example` beside it lists every key the app and its scripts read, with no values and no comments**, and is committed. A key no longer read is deleted from both.
- **A parity check** (a small script, run in CI) fails when an app's `.env.example` and the keys its `env.ts` schema reads differ, so a new secret can't ship undocumented. CI has no `.env`, so the schema is the other side; locally, the same script can also compare `.env`.

## Deployed tiers on Firebase App Hosting

- **A base `apphosting.yaml` plus one overlay per tier** (`apphosting.<tier>.yaml`). The overlay sets `APP_ENV` and any grant only that tier has; the base declares the grants every tier shares, and each project's Secret Manager holds its own value.
- **An API app takes no `availability:` blocks.** Its env guard parses at module load, which `next build` runs, so a variable limited to `RUNTIME` is missing during the build and the guard throws.
- **Create the secret and grant the backend access before the next rollout.** A missing grant is the most common failed build, because the env guard throws during `next build`. The mechanics of `apphosting.yaml` and the secrets commands are the official `firebase-app-hosting-basics` skill's.
- **Rotating a secret needs a new rollout**; a running backend keeps the value it started with.

## Rotating and leaks

- **Rotate on a schedule** for long-lived keys, and **at once** when someone with access leaves or a secret may have been seen.
- **A signing or encryption secret rotates with an overlap:** the new one signs, the old one still verifies until everything it signed has expired, then it goes (`field-encryption` for keys that encrypt stored data).
- **A leaked secret is revoked first, at its issuer**, then replaced and rolled out — deleting the commit doesn't help, because clones, forks, caches and scanners already have it. Then read the provider's logs for use while it was exposed, purge it from history if the repo is public, and record what happened.

## Workers and extensions

- **A Cloud Functions worker has no `.env`.** Its project and default bucket come from the runtime, public facts from the same committed constants the apps read, and each secret is a `defineSecret(...)` mounted from Secret Manager, set once per project.
- **A Firebase Extension keeps its parameters in a committed file**, with secrets as Secret Manager references, never values.

## Ops scripts

- **A script that touches a deployed tier takes `--env=<tier>` and has no default to production.** Running it without the flag uses `local` or refuses.
- It loads only that tier's secrets from a gitignored file, and reads public per-tier facts from the same constants the app uses.

## Build caches

Every env var a build reads is listed in the build task's `env` in `turbo.json`, or strict mode withholds it and the cache ignores it — see `monorepo`.

## Do / Don't

- **Do** ask "would leaking this hurt?" for every value; revoke a leaked secret at its issuer before anything else; pass per-tier facts to client code as props; keep public per-tier facts in committed constants keyed by `APP_ENV`; validate at boot; require deployed-only values with `superRefine`; keep `.env.example` to names; grant secrets before the rollout that reads them.
- **Don't** read `process.env` outside the carve-outs; set or branch on `NODE_ENV`; put a secret behind `NEXT_PUBLIC_`; add comments or values to `.env.example`; give an ops script a production default; commit a `.env` file; paste a secret into chat, a ticket or a prompt.

## Related skills

**This skill sets the rules and never writes an audit report.** An audit of this area is `/env-audit`, written from its own template. Run it rather than writing a report from here.

- Secrets in CI and the deploy flow → `devops`.
- turbo's strict env mode → `monorepo`.
- Which secrets a backend holds and how they're used → `backend-security`; encryption keys → `field-encryption`.
- Reviewing a codebase's env → `env-audit`.
