---
name: testing
description: >-
  House testing standard for Vitest across Next.js apps, an API, shared packages and workers — test levels and what each catches, async Server Components, mock only the I/O boundaries, in-memory fakes over call recorders, typed manual mocks, shared fixtures, route specs with a real Request, emulator and browser runs, deterministic and independent tests, flaky tests, coverage, and never weakening a failing test. Use when writing, fixing or reviewing tests, or setting up Vitest in a workspace.
---

# Testing

Tests mock only what they can't run — the network, the cloud SDKs, the framework's request APIs, timers — and run the real workspace code everywhere else, so a passing suite means the pieces actually fit. A test describes behaviour; a red test means the code under test is wrong until shown otherwise.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

## Levels

| Level       | Runs                                                                                      | Catches                                                    |
| ----------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Unit        | a function, hook or component alone, I/O mocked                                           | logic and edge cases, in milliseconds                      |
| Integration | a route, action or service through the real layers, against fakes or the store's emulator | the pieces fitting: validation, guards, writes, audit      |
| End-to-end  | the built app in a browser (Playwright)                                                   | journeys, async Server Components, what only a page proves |

Most tests are unit and integration; end-to-end covers the few journeys the product can't break (sign-in, checkout) and what nothing else can reach.

- **Async Server Components can't be rendered in a unit test** — Vitest doesn't support them, and Next.js points to end-to-end tests. Keep the decisions out of them: the component awaits a data function and renders, and the data function and the components it renders are tested at the levels above.

## What gets mocked

- **Mock only the boundaries a test can't own or run:** a cloud SDK (Firebase Auth, Firestore, Storage), `next/navigation`, `next/headers`, `next/cache`, `server-only`, `fetch`, timers, a hosted Redis client. These are the I/O edges.
- **Never mock workspace code or pure dependencies** — your own schemas, utilities and hooks, Zod, a form library. A spec that stubs the schemas package keeps passing when a schema change breaks the code, because it tests the stub.
- **Mock a project function only when it does I/O itself.** Anything pure runs for real.

## Fakes, mocks and fixtures

- **Prefer an in-memory fake to a call recorder.** A Firestore or Storage fake that behaves like the store lets a spec assert on what was written, not on how it was called, so a refactor that writes the same data a different way still passes.
- **A manual mock lives in `<workspace>/__mocks__/<package>/…`, each export a `vi.fn()` typed with the SDK's own signature**, so `vi.mocked(...)` is checked against the real API and a drifted mock fails the type check instead of passing silently:

  ```ts
  // firebase-auth.mock.ts
  import type * as FirebaseAuth from "firebase/auth";
  import { vi, type Mock } from "vitest";

  export const onIdTokenChanged: Mock<typeof FirebaseAuth.onIdTokenChanged> = vi.fn();
  ```

- **Fixtures and fakes live in `src/testing/`**, named for their export (`user.fixture.ts` with `buildUser`, `firebase-auth.fake.ts`). The suffixes are `naming`'s.
- **A fake or mock two workspaces use moves into a shared testing package** on its second consumer, and each workspace's `__mocks__` file re-exports it — Vitest reads a manual mock only from the workspace's own folder. Two copies drift, and a fix lands in only one.

## Writing specs

- **Colocate the spec beside the file it tests** (`event.action.test.ts`, `route.test.ts`), so a missing test is visible in the tree.
- **Cover the behaviour in full:** the success path, each refusal and each edge. A test written only to go green proves nothing.
- **A route spec calls the exported handler with a real `Request`**, against the in-memory fakes swapped in for the project's client module, and asserts on the response, the stored data and any audit entry:

  ```ts
  vi.mock("@/server/clients/firebase/client", async () => {
    const { fakeFirestore } = await import("@org/testing/firestore");
    return { firestore: fakeFirestore };
  });

  it("suspends the user and audits the reason", async () => {
    const response = await POST(buildBearerRequest(`/api/v1/admin/users/user-1/suspend`, "token", { method: "POST", body: { reason: "Spam" } }), {
      params: Promise.resolve({ uid: "user-1" }),
    });
    expect(response.status).toBe(200);
    expect(readUser("user-1")).toMatchObject({ isSuspended: true });
  });
  ```

- **A hook or component spec renders through the same providers the app uses** (a session wrapper, the router store), with the SDK mocked and programmed in `beforeEach`. A form submits through the real form library, so the real schema runs.
- **Names in tests follow `naming`** — a helper called `data` is as unclear in a spec as anywhere else.

## Keeping tests independent

- **The setup file calls `vi.resetAllMocks()` after each test, and each spec re-applies its implementations in `beforeEach`.** One test's `mockResolvedValue` must never become the next test's default.
- **The setup file seeds a placeholder for every key the env guard requires**, so loading a module that reads env doesn't throw "Invalid environment". It also mocks `server-only`.
- **Deterministic by construction.** Time comes from fake timers and `vi.setSystemTime`, never the real clock; the timezone is fixed (`TZ=UTC` in the test env) and so is the locale, so a date or number formats the same on every machine; random fixture data comes from a seeded generator whose seed is printed on failure.
- **Order-independent.** Tests run shuffled (`sequence.shuffle`) at least in CI, so one that leans on another's leftovers fails where it can be seen.
- **When a dependency imports a module you mock, inline it** (`test.server.deps.inline`). Loaded untouched from `node_modules`, it gets the real module underneath your mock.

## Environments and projects

- **node for logic, jsdom for anything that renders.** An app with both splits its Vitest config into two projects, so `lib/` and route handlers run in node and hooks and components in jsdom.
- **jsdom only simulates a browser.** A component test that depends on layout, focus, real events or a browser API runs in Vitest's Browser Mode (Playwright as the provider) — the engine Storybook's tests already use.
- **The store's emulator, where fakes can't prove it.** A small suite against the Firebase emulator covers transactions under contention, query behaviour and the security rules (`@firebase/rules-unit-testing`). The emulator runs any valid query without its composite index, so indexes are checked separately (`firestore`).
- **A long suite splits into projects by domain**, so CI can run each as its own job. A check that every test file belongs to exactly one project stops a file from silently running in none.

## Running tests

- **At most two suites at a time** (`turbo run test --concurrency=2`). Each suite starts its own worker pool, and more at once oversubscribes a laptop or a CI runner, so tests time out for lack of a core rather than a bug. A suite that's still slow under load raises its own timeout.
- **CI runs one job per app and package**, and one per project for a split suite, each on its own runner.
- **Commits run no tests**, so run every suite a change reaches before committing.
- **A flaky test is a bug, fixed at once and never skipped.** Unit and integration tests never retry. Reproduce it with shuffled order and repeated runs (`vitest --sequence.shuffle --repeats 20`), then fix the leaked state, the real clock or the race behind it. End-to-end tests may retry in CI, with every retry reported.
- **Coverage shows what's untested; it isn't the goal.** A floor applies to shared packages and critical paths (auth, money, permissions), and only ever rises; the rest is read, not enforced. A spec written to raise the number without asserting behaviour is worse than none.

## What gets a test

- **Tested:** shared functions and hooks, API services, data modules, guards and routes, worker handlers, Server Actions, and any component that decides something — a guard, a mapping from route to state, a form with behaviour.
- **Not tested:** presentational content that only composes design-system components; it has no decision to assert.
- **UI components in a shared package are tested by their stories** — each story renders in a real browser, runs its `play` function and fails on an accessibility violation. How is `storybook`'s.
- **End-to-end tests** run against a preview or a local production build; whether CI gates on them is `devops`'.
- **Type tests** (`expectTypeOf` in a `*.test-d.ts`, with Vitest's typecheck on) for shared generic helpers and the contracts' inferred types, where a wrong type is the bug.
- **A registry-coverage test** that fails when a route has no API-docs entry belongs with the route tests (`openapi-registry`).

## A failing test

**Never delete, skip or weaken a failing assertion to make a suite pass.** A red test means the code under test is wrong until shown otherwise: fix the code. If the test itself is wrong — it asserts behaviour the spec no longer wants — change it on purpose and say why in the commit.

## Troubleshooting

- **Tests time out or fail at random only in a full run** — the machine is oversubscribed. Run the suite alone to confirm, and keep the two-suite cap.
- **A mock seems ignored** — a dependency imports the real module from `node_modules`. Inline that dependency.
- **"Invalid environment" when a spec loads** — the env guard ran before a key had a value. Add a placeholder in the workspace's setup file.

## Related skills

- Test-file and fixture names → `naming`; where `src/testing/` and the testing package sit → `code-structure`.
- Stories as UI tests → `storybook`.
- CI jobs and the opt-in end-to-end gate → `devops`.
- Reviewing a codebase's test coverage → `codebase-audit`.
