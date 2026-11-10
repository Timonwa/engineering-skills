---
name: testing
description: >-
  How code is tested with Vitest across Next.js apps, an API, shared packages and serverless workers — mock only the I/O boundaries a test can't run and let all workspace code run for real, in-memory fakes over call recorders, manual mocks typed with the SDK's own signatures, fixtures and fakes in src/testing/ promoted to a shared testing package on the second consumer, route specs that call the exported handler with a real Request, node and jsdom projects, resetting mocks between tests, inlining a dependency so a mock reaches it, what gets a test and what doesn't, running suites two at a time and splitting long ones in CI, and never weakening a failing test. Use when writing, fixing or reviewing tests, or setting up a test runner in a workspace.
---

# Testing

Tests mock only what they can't run — the network, the cloud SDKs, the framework's request APIs, timers — and run the real workspace code everywhere else, so a passing suite means the pieces actually fit. A test describes behaviour; a red test means the code under test is wrong until shown otherwise.

## Project specifics first

Before applying this skill, read the project's root `AGENTS.md`, the `AGENTS.md` closest to the files in question, and any doc they link for this skill's topic. Names, values and choices — budgets, tiers, tokens, voice, paths — come from those files, never from this skill.

- A rule here that the project records a deviation from, with its reason, gives way to the project's version there.
- A rule here that the project contradicts without a recorded reason: ask before following either. An audit reports it as a finding instead.

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
- **When a dependency imports a module you mock, inline it** (`test.server.deps.inline`). Loaded untouched from `node_modules`, it gets the real module underneath your mock.

## Environments and projects

- **node for logic, jsdom for anything that renders.** An app with both splits its Vitest config into two projects, so `lib/` and route handlers run in node and hooks and components in jsdom.
- **A long suite splits into projects by domain**, so CI can run each as its own job. A check that every test file belongs to exactly one project stops a file from silently running in none.

## Running tests

- **At most two suites at a time** (`turbo run test --concurrency=2`). Each suite starts its own worker pool, and more at once oversubscribes a laptop or a CI runner, so tests time out for lack of a core rather than a bug. A suite that's still slow under load raises its own timeout.
- **CI runs one job per app and package**, and one per project for a split suite, each on its own runner.
- **Commits run no tests**, so run every suite a change reaches before committing.

## What gets a test

- **Tested:** shared functions and hooks, API services, data modules, guards and routes, worker handlers, Server Actions, and any component that decides something — a guard, a mapping from route to state, a form with behaviour.
- **Not tested:** presentational content that only composes design-system components; it has no decision to assert.
- **UI components in a shared package are tested by their stories** — each story renders in a real browser, runs its `play` function and fails on an accessibility violation. How is `storybook`'s.
- **End-to-end tests** are an opt-in gate for projects that need them (`devops`).
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
