# Cron

Scheduled work runs as a route driven by a managed scheduler (Cloud Scheduler, or the host's equivalent) hitting the API, so the task code stays in services instead of being copied into platform scheduled functions.

## One dispatcher, a declarative task list

- **One scheduler entry per environment**, at the finest cadence any task needs (every five minutes), calls **one dispatcher route** (`POST /api/v1/cron/tick`).
- **The tasks are a list in one service**, each `{ name, isDue(now), run }`, with small helpers for the cadence (`everyTick`, `dailyAt(hour, minute)`, `weeklyAt(day, hour)`). A daily minute must be one the tick actually lands on. Adding a task is one entry, shipped with the app — never a scheduler change.
- **`run` calls the domain's own service function.** The cron service only dispatches; the work lives where the rest of that domain's logic does.
- **Each task is wrapped**: the dispatcher returns `{ results, errors }`, and one failing task never stops the rest.
- **`?task=<name>` runs one task whatever the clock says**, rejecting an unknown name with the list of valid ones — so a developer can rerun a recount now instead of writing a second one that drifts.
- **A heartbeat:** the dispatcher records each scheduled tick (never a by-name run), and a `GET` on the same route answers 503 once two ticks are missed, so an uptime monitor can watch the scheduler itself.

## Auth

- **Default-deny OIDC.** The guard verifies the scheduler's token against the platform's keys; its audience must equal the route's URL exactly (no trailing-slash drift), and its email must be the environment's scheduler service account, with `email_verified` true. The audience derives from the forwarded host and protocol — confirm any fronting proxy keeps those headers.
- **A local bypass needs two things:** an explicit flag _and_ the local tier. The flag alone on a deployed tier does nothing.
- **No user rate limit** on the tick — the token is the gate. The heartbeat `GET` is public and takes one.

## Retries

If the scheduler retries, its maximum backoff stays below the schedule period, or a retry lands after the next tick has already run; its minimum backoff exceeds a cold start. Zero retries is fine when tasks are idempotent and the next tick is minutes away.

| Schedule     | Max backoff |
| ------------ | ----------- |
| every 5 min  | 2 min       |
| every 15 min | 5 min       |
| hourly       | 20 min      |
| daily        | 2 h         |

## Safety

- **Every task is idempotent.** A task that changes state claims its work in a transaction (a status moving from `scheduled` to `sending`), so two overlapping ticks can't do it twice.
- **When a task starts moving money or deleting**, consider a second layer: run cron on its own service that only the scheduler's account may invoke, and keep the token check too.

## Checking it works

Run one task by name, read the route's `{ results, errors }`, then seed a record the task should change and confirm it changed.
