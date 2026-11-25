# engineering-skills

Agent skills that help developers build, review and ship web apps on Next.js, React and Firebase, in any IDE or AI agent that supports [Agent Skills](https://agentskills.io).

[![License: MIT](https://img.shields.io/github/license/Timonwa/engineering-skills)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-compatible-6E56CF)](https://agentskills.io)
[![GitHub stars](https://img.shields.io/github/stars/Timonwa/engineering-skills?style=flat)](https://github.com/Timonwa/engineering-skills/stargazers)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-support-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/timonwa)

> [!IMPORTANT]
> **These skills are opinionated.** They're the house rules for one stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, a pnpm and Turborepo monorepo, and Firebase, Upstash Redis and Cloudinary behind the API. Some are tied to it more than others, and the Stack column in the skills and commands tables says how much:
>
> - **Any stack** — follows a general standard, such as WCAG, OWASP or a language's own rules, and works on any web project.
> - **Adaptable** — the ideas apply anywhere, but the steps, examples or file layout assume this stack, so another one needs translating.
> - **This stack** — built for one tool in the stack, and won't carry over to another.

## Contents

- [The skill sets](#the-skill-sets)
- [How the skills work](#how-the-skills-work)
- [Install](#install)
- [Set up a project](#set-up-a-project)
- [Skills](#skills)
- [Official skills](#official-skills)
- [Commands](#commands)
- [Contributing](#contributing)
- [Support](#support)

## The skill sets

| Set   | For            | Install it if you build                                                         |
| ----- | -------------- | ------------------------------------------------------------------------------- |
| `eng` | The whole repo | Any Next.js and TypeScript project. It comes with `fe` and `be`                 |
| `fe`  | The frontend   | Pages, components and a design system with Next.js, React and Tailwind CSS      |
| `be`  | The API        | An API in Next.js route handlers, on Firebase with Upstash Redis and Cloudinary |

## How the skills work

- Your agent picks one of the 45 skills when your request matches it, so you don't have to name it. The 17 commands run only when you call them.
- A skill reads your project's `AGENTS.md`, and the docs it links, before anything else. Colours, collection names, limits and the brand voice come from there. A value that isn't written down is asked for, never guessed.
- Each rule follows the current standard: the platform's own docs, WCAG 2.2 and OWASP. Where your project does something differently and records why, your way wins. Where it gives no reason, the skill asks before following either.
- Nothing is installed, committed or pushed unless you ask. Scaffolding lists every file it will create, edit, move or delete, and waits for your approval.
- A failing test means the code gets fixed, and a flaky test is fixed straight away. No test is deleted, skipped or loosened to make it pass.

## Install

### Any IDE or AI agent

```shell
npx skills add Timonwa/engineering-skills
```

[`npx skills`](https://github.com/vercel-labs/skills) asks which skills to install and which agents to install them for, and installs them in the current project. Add `-g` to install them for every project. To get the latest changes, run `npx skills update`.

Without Node, copy the folders inside `plugins/eng/skills/`, `plugins/fe/skills/` and `plugins/be/skills/` into `.agents/skills/` in your project, or `~/.agents/skills/` for every project. Many agents read that folder. For the rest, use the skills folder your agent's docs name. To update, copy them again from the latest version of this repo.

The [official skills](#official-skills) these build on aren't included. Install the ones you need from their makers' repositories, such as `npx skills add vercel/turborepo --skill turborepo`.

### Claude app (web or desktop)

1. Open **Customize > Plugins**.
2. Select **Add > Add marketplace > Add from a repository**, and enter `Timonwa/engineering-skills`.
3. Add **eng**, **fe**, **be**, or only the ones your project needs. **fe** and **be** each bring in **eng** and the official skills they use.
4. Turn on **Settings > Capabilities > Create and edit files**. Skills don't run without it. On Team and Enterprise plans, an admin turns it on.

Plugins are saved to your account, so they work in chat on mobile too. To get the latest changes, select **Check for updates** in **Customize > Plugins**, or turn on **Sync automatically** for the marketplace.

## Set up a project

- In a new project, run `agents-md` first. It writes the `AGENTS.md` every other skill reads for your project's facts: palette, fonts, collection names, project IDs, rate limits and brand voice.
- Where your project breaks a rule on purpose, write the reason in `AGENTS.md`. Skills then follow your version, and audits stop reporting it.
- In a chat app, attach `AGENTS.md` and the docs it links to the chat or project, so the skills can read them.

## Skills

### eng

| Skill                   | Use it to                                                                                                       | Stack      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| `agents-md`             | Write or update your project's `AGENTS.md`, the file every other skill reads for your project's facts           | Any stack  |
| `code-structure`        | Decide where a page, component or helper goes, and keep route files thin                                        | Adaptable  |
| `naming`                | Name functions, files, fields, events and design tokens so people can find them again                           | Any stack  |
| `typescript`            | Write strict TypeScript and set up `tsconfig`, with no `any` or unsafe casts                                    | Any stack  |
| `schemas-and-contracts` | Check every request, form and stored record with a Zod schema, and share those schemas between apps             | Adaptable  |
| `monorepo`              | Set up a pnpm and Turborepo monorepo with one version of each dependency                                        | This stack |
| `env`                   | Keep secrets in env and public settings in code, check both when the app starts, and rotate a leaked secret     | Adaptable  |
| `testing`               | Write Vitest tests that pass or fail the same way every run, mocking only what a test can't run, like a network | Adaptable  |
| `devops`                | Set up formatting, lint, git hooks, GitHub Actions, protected branches, releases, and deploys you can roll back | Adaptable  |
| `scaffold-app`          | Turn a fresh Next.js starter or monorepo into the house layout, after you approve a list of every change        | This stack |
| `scaffold-feature`      | Start a feature with its schema, data access, page, loading and error states, stories and tests as stubs        | Adaptable  |
| `migrate`               | Upgrade Next.js, React, Tailwind or any major dependency one version and one checked step at a time             | Any stack  |
| `ship-changes`          | Commit work as small Conventional Commits you approve one group at a time, and open a pull request when you ask | Any stack  |

### fe

| Skill               | Use it to                                                                                                 | Stack      |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| `nextjs`            | Write Next.js 16 App Router code: server and client components, caching, Server Actions and streaming     | This stack |
| `react`             | Write React 19 components and hooks without needless effects or hand-written memoisation                  | Adaptable  |
| `semantic-html`     | Build markup on the right element: headings, lists, tables, forms, links and buttons                      | Any stack  |
| `accessibility`     | Make UI meet WCAG 2.2 AA: contrast in both themes, keyboard use, focus, labels and errors people see      | Any stack  |
| `tailwind`          | Set up Tailwind CSS v4 with design tokens and dark mode                                                   | This stack |
| `design-system`     | Add a component, token or variant to a shared design system, and keep screens consistent                  | Adaptable  |
| `reusables`         | Build a shared component, hook or helper that each page sets up through its props                         | Adaptable  |
| `frontend-design`   | Make a page or component look designed with the tokens you have: hierarchy, type, colour, spacing, motion | Any stack  |
| `storybook`         | Set up Storybook 10 and write stories that also run as tests                                              | This stack |
| `seo-aeo-geo`       | Help people find your pages through Google and AI tools like ChatGPT, with metadata and structured data   | Any stack  |
| `copywriting`       | Write buttons, forms, errors, empty states and page copy in your product's own voice                      | Any stack  |
| `frontend-security` | Protect the browser side from XSS, with security headers, a Content Security Policy and safe scripts      | Any stack  |
| `cookie-consent`    | Add a cookie banner where accepting and rejecting are equally easy, and nothing optional loads before     | Any stack  |
| `logos-and-icons`   | Make the favicon set, app icons and logo files, with the right sizes and safe zones                       | Any stack  |

### be

| Skill                 | Use it to                                                                                                       | Stack      |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| `api-architecture`    | Build an API route in a fixed order: rate limit, check access, validate, call one service, log, respond         | Adaptable  |
| `openapi-registry`    | Generate an OpenAPI reference from your routes' schemas, with a test that no route is left out                  | Adaptable  |
| `auth`                | Build sign-in, sessions and sign-out with Firebase Auth and a session cookie only the API can set               | This stack |
| `access-control`      | Decide who can do what, with permissions checked in one place, plus API keys and share links                    | Adaptable  |
| `rate-limiting`       | Limit how often each person, IP address or API key can call a route, using Upstash                              | Adaptable  |
| `plan-entitlements`   | Limit features and usage by plan, apart from permissions, with plan changes from your payment provider          | Any stack  |
| `audit-log`           | Record who did what, when and from where, without ever failing the request                                      | Any stack  |
| `backend-security`    | Check server code against the OWASP Top 10: access, injection, SSRF, CSRF and abuse                             | Any stack  |
| `field-encryption`    | Encrypt a sensitive field, such as a token a user must read back, before it's stored                            | Any stack  |
| `firestore`           | Read and write Firestore through the server, with transactions, indexes, security rules and backups             | This stack |
| `redis`               | Add a cache, lock or other Redis key that expires and fails safely when Redis is down                           | This stack |
| `image-handling`      | Accept image uploads on Firebase Storage: checked, resized, stripped of location data, stored by who may see it | This stack |
| `cloudinary`          | Deliver and upload images through Cloudinary, on top of Cloudinary's own skills                                 | This stack |
| `feature-flags`       | Turn features on and off without a deploy, with a safe default for each                                         | Adaptable  |
| `maintenance-mode`    | Take the app offline with one switch, while the admin app that turns it off stays reachable                     | Adaptable  |
| `transactional-email` | Send email from the API that reaches the inbox, with signed domains, retries, bounce handling and unsubscribe   | Any stack  |
| `emails`              | Write the words of an email the product sends: sender, subject, preview text and one clear action               | Any stack  |
| `webhook-delivery`    | Send signed webhooks to your customers' systems, retried for days, with a delivery log                          | Any stack  |

## Official skills

Where a maker's own skill agrees with the rules above, these skills build on it, so you get the maker's updates directly. Install it from the maker's repository with `npx skills add <owner>/<repo> --skill <name>`. In the Claude app, the plugins bring it in for you.

| Skill                             | Use it to                                                                    | From                                                    | Comes with |
| --------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- | ---------- |
| `turborepo`                       | Set up and fix Turborepo tasks, caching and filters                          | [Vercel](https://github.com/vercel/turborepo)           | `eng`      |
| `next-dev-loop`                   | Check how a Next.js app behaves after an edit, in the dev server and browser | [Vercel](https://github.com/vercel/next.js)             | `fe`       |
| `next-cache-components-adoption`  | Turn on Cache Components in a Next.js app and fix the routes it blocks       | [Vercel](https://github.com/vercel/next.js)             | `fe`       |
| `next-cache-components-optimizer` | Show more of a route straight away on navigation, checked by a test          | [Vercel](https://github.com/vercel/next.js)             | `fe`       |
| `firebase-app-hosting-basics`     | Deploy and manage a Next.js app on Firebase App Hosting                      | [Firebase](https://github.com/firebase/agent-skills)    | `be`       |
| `firebase-security-rules-auditor` | Audit Firestore and Cloud Storage security rules for gaps                    | [Firebase](https://github.com/firebase/agent-skills)    | `be`       |
| `extension-to-functions-codebase` | Turn an installed Firebase Extension into your own Cloud Functions code      | [Firebase](https://github.com/firebase/agent-skills)    | `be`       |
| `upstash-ratelimit-js`            | Add rate limiting with the `@upstash/ratelimit` SDK                          | [Upstash](https://github.com/upstash/skills)            | `be`       |
| `cloudinary-transformations`      | Build and debug Cloudinary image and video URLs                              | [Cloudinary](https://github.com/cloudinary-devs/skills) | `be`       |
| `cloudinary-docs`                 | Look up answers in Cloudinary's latest docs                                  | [Cloudinary](https://github.com/cloudinary-devs/skills) | `be`       |

The rest of each maker's set is left out. Some of those skills work against these rules, such as reading the database from the browser, unsigned uploads or keys in client code. The others cover tools outside this stack.

## Commands

| Command                 | Use it to                                                                                    | Stack      |
| ----------------------- | -------------------------------------------------------------------------------------------- | ---------- |
| `/audit-all`            | Run every installed audit that applies, and get one combined health report                   | Adaptable  |
| `/codebase-audit`       | Find tech debt, dead code, loose TypeScript, weak tests, and CI, branch and deploy problems  | Adaptable  |
| `/conventions-audit`    | Find names and files that don't follow `naming` and `code-structure`                         | Adaptable  |
| `/dependency-audit`     | Find unused, duplicate, misplaced or vulnerable packages, and versions that have drifted     | This stack |
| `/env-audit`            | Find secrets, env values and public variables in the wrong place                             | Adaptable  |
| `/security-audit`       | Find how an attacker could get in, across frontend and backend, against the OWASP Top 10     | Any stack  |
| `/accessibility-audit`  | Check the app against every WCAG 2.2 A and AA criterion                                      | Any stack  |
| `/frontend-audit`       | Check App Router code: the client boundary, caching, Server Actions, Tailwind setup, icons   | This stack |
| `/performance-audit`    | Find what slows a page down: images, bundle size, fonts, streaming and caching               | This stack |
| `/seo-aeo-geo-audit`    | Check that search engines and AI tools can find, read and cite your public pages             | Any stack  |
| `/storybook-audit`      | Find shared components with no story, and stories that don't test what they show             | This stack |
| `/content-audit`        | Check UI and email copy against your product's voice and word list                           | Any stack  |
| `/api-audit`            | Check every route is built the same safe way: order of checks, validation, limits and errors | Adaptable  |
| `/access-control-audit` | Find routes and actions where someone could reach data that isn't theirs                     | Adaptable  |
| `/firestore-audit`      | Check Firestore reads, writes, indexes, rules and backups for safety and cost                | This stack |
| `/redis-audit`          | Check each use of Redis fails the right way when Redis is down                               | This stack |
| `/review-pr`            | Review a pull request or branch against its goal, your project's rules and real bugs         | Any stack  |

- An audit takes an optional phase, `development` or `production`, and a path. Without a phase, it uses the audit phase in your `AGENTS.md`, or else `production`. The phase sorts the fixes: fix now, before launch and after launch in `development`; fix now, next release and backlog in `production`.
- Each audit writes `_reports/<name>.md`, and `/audit-all` adds `_reports/audit-all.md`. Every finding has a severity, a location, the evidence that proves it and a fix. The report ends with a score and how it moved since the last run.
- A finding the code can't prove, such as a console setting or a DNS record, is marked "needs confirmation" instead of being inflated.
- Findings are `NEW`, `UNRESOLVED`, `FIXED` or `WON'T FIX`. A new run replaces the report, keeping open and won't-fix findings under their old IDs and dropping fixed ones. After you fix a finding, the report is updated in place, not re-run.
- Add `--comment` or `--fix` after the command's name, such as `/review-pr --comment`.
- Audits never edit code, and fixing a finding is a separate request. `/review-pr` reports in chat, and comments on the pull request or fixes findings only with `--comment` or `--fix`. A project with its own review skill uses that one instead.

## Contributing

Issues and pull requests are welcome, especially for a rule that misfires in your project or has fallen behind the standard it cites. In a pull request:

- Change one skill where you can.
- Update its `evals/evals.json`.
- Keep `SKILL.md` under 200 lines and its description under 550 characters, and give a new skill a name no other set uses. Longer material goes in the skill's `references/` folder, which the agent reads only when it needs it.
- Change the opening every skill shares in `shared/project-specifics.md`, then run `pnpm sync:opening`. Skills install one at a time, so each keeps its own copy.
- Run the checks:

| Script               | Use it to                                                                                                                                     | Needs                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `pnpm format`        | Format everything with Prettier                                                                                                               | `pnpm install` first        |
| `pnpm format:check`  | Check formatting without writing                                                                                                              | `pnpm install` first        |
| `pnpm check:skills`  | Check every skill against the Agent Skills rules and the house limits: 200 lines, a 550-character description, and a name no other skill uses | Node                        |
| `pnpm validate`      | Validate the Claude Code marketplace and plugin manifests                                                                                     | the Claude Code CLI on PATH |
| `pnpm check:opening` | Fail on a skill whose shared opening has drifted                                                                                              | Node                        |
| `pnpm sync:opening`  | Copy the shared opening into every skill                                                                                                      | Node                        |

The skills are Markdown, so there's no build step, and Prettier is the only dependency. Without installing it, run `pnpm dlx prettier --write .` instead.

## Support

If these skills save you time, [buy me a coffee](https://buymeacoffee.com/timonwa).

For writing docs, see [technical-writing-skills](https://github.com/Timonwa/technical-writing-skills). For blog posts, newsletters and social posts, see [content-writing-skills](https://github.com/Timonwa/content-writing-skills).

## License

[MIT](LICENSE)
