# Plan: Move background jobs to dedicated Solid Queue worker

Goal: run all Active Job work (custom jobs plus Active Storage variants) on the new `shred-day-jobs-ubuntu` host using Rails 8 + Solid Queue defaults, keeping the web server focused on request handling.

## Current state
- Rails production already uses `config.active_job.queue_adapter = :solid_queue` and connects to a queue DB (`shred_day_production_queue`).
- Solid Queue currently runs inside Puma on the web host via `SOLID_QUEUE_IN_PUMA=true`.
- Postgres accessory binds to `127.0.0.1:5432` on the web host, so it is not reachable from the new jobs host yet.

## Implementation steps
1) Database reachability
- Rebind the Postgres accessory to a private-network address (or 0.0.0.0 with firewall) so the jobs host can reach it; ensure only the private Hetzner network allows access.
- Verify the queue database (`shred_day_production_queue`) exists and run `bin/rails db:migrate` (primary) and `bin/rails db:migrate:with_data QUEUE=queue` or equivalent to ensure queue migrations are applied in production.

2) Kamal role for jobs
- Add a `job` role in `config/deploy.yml` pointing to `shred-day-jobs-ubuntu` (use the private IP) with `cmd: bin/jobs` and shared env/secrets for DB access and Rails master key.
- Remove `SOLID_QUEUE_IN_PUMA` from the web role so the web container stops running a Solid Queue supervisor.
- Optionally set `JOB_CONCURRENCY` for the job role (start conservatively, e.g., 2–3) and leave `WEB_CONCURRENCY` for web unchanged.

3) Deployment and rollout
- Deploy updated config (`bin/kamal deploy`, then `bin/kamal deploy -r job` or `bin/kamal app boot -r job`) and confirm the job container registers a Solid Queue process.
- Tail logs (`bin/kamal logs -r job`) to confirm jobs dequeue and Active Storage variants process on the worker host.
- Once verified, monitor web host memory to ensure variant processing no longer impacts Puma, and keep Solid Queue dashboard/metrics handy for visibility.

## Development/local notes
- Keep using Solid Queue locally: `bin/rails solid_queue:start` in a separate terminal (queue DB already configured).
- No code changes needed in job definitions; they continue to use Active Job and Solid Queue queues.

## Status of implementation in repo
- Kamal config now defines a `job` role targeting `10.0.0.2` (private network) and runs `bin/jobs`; web role remains at `91.99.62.190`.
- Solid Queue is no longer started inside Puma (`SOLID_QUEUE_IN_PUMA` removed); jobs will run only on the dedicated role.
- Postgres accessory now binds to `10.0.0.3:5432`, and `DB_HOST` points there so the job host can reach the queue DB over the private network.
- Next deploy steps: `bin/kamal deploy` (web), `bin/kamal deploy -r job` (worker), then verify queue processes and Active Storage variant jobs on the job host.
