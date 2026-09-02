---
read_when: Deploying Shred.Day, changing worker sizing, rotating secrets, or recovering production data.
---

# Deployment

Shred.Day runs in the Fly organization `shred-day`, with PostgreSQL 17 on Neon
and a private Tigris bucket. The React build and Rails API share one image.

| Resource | Configuration |
| --- | --- |
| `shred-day` | Frankfurt, 1 shared CPU, 1 GB RAM; HTTP auto-start/stop, minimum 0 |
| `shred-day-worker` | Frankfurt, 2 shared CPUs, 4 GB RAM; private Flycast ingress |
| `queue-recovery` Machine | Same worker app; 512 MB, hourly wake request, exits afterward |
| Neon `shred-day` | Frankfurt, PostgreSQL 17, 0.25 CU; idle compute suspends |
| Tigris `shred-day-photos` | Private S3-compatible bucket; original Active Storage keys preserved |

The four Rails database roles use separate databases within the same Neon
project: primary, queue, cache, and cable. The queue remains durable while both
Fly Machines are stopped. No Fly volumes or dedicated IPv4 addresses are needed.

## Deploy

GitHub Actions runs Rails, frontend, and Cypress tests, then deploys pushes to
`main`. The `FLY_API_TOKEN` repository secret is scoped to the `shred-day` Fly
organization. Renew the deployment token before its September 2027 expiry.

To deploy locally with an authenticated Fly CLI, Docker, and Python 3:

```sh
bash script/deploy-fly
```

The script builds once using local Docker (the GitHub runner in CI), prepares
the databases, deploys web and worker, and
updates the hourly recovery Machine. It disables Fly's default spare Machine.
Local builds avoid leaving a persistent remote builder and its volume behind.
Use the same image for both apps. The recovery Machine is unmanaged by
`fly deploy`; `configure-worker-recovery.py` maintains it by its unique name.

The web proxy listens on port 8080 because the container runs as an unprivileged
user. Puma listens on 3000 behind it. The worker uses Puma directly on 8080.

## Secrets

Both apps require these Fly secrets; keep their values outside the repository:

- `RAILS_MASTER_KEY`: retain the original Rails key, including for session continuity.
- `DATABASE_URL`, `QUEUE_DATABASE_URL`, `CACHE_DATABASE_URL`, `CABLE_DATABASE_URL`:
  Neon connections to their respective databases, with TLS required.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`,
  `BUCKET_NAME`: credentials for the private Tigris bucket.
- `WORKER_WAKE_TOKEN`: the same random token on web and worker.

Import secrets through stdin with `fly secrets import --app APP`. Do not put
connection URLs, token values, database dumps, or storage credentials in Git.
The Docker build context excludes local secrets and dependency caches.

## Background jobs

The web app subscribes to Active Job enqueue notifications, including framework
jobs, delayed jobs, and bulk enqueue. Once work is persisted, it sends an
authenticated request to `http://shred-day-worker.flycast/wake`. Fly starts a
stopped worker on demand. A cold start can make the first upload slower.

Solid Queue runs one job at a time to limit image-processing memory. The worker
checks ready, claimed, blocked, and imminent scheduled executions in one database
snapshot. After 60 seconds without work, it rejects new wake requests with 503
and exits cleanly. The caller retries through shutdown and cold start. HTTP
auto-stop is disabled on the worker because HTTP inactivity does not mean its
background jobs have finished.

The worker stays awake for retries due within five minutes. The hourly recovery
Machine wakes it for later retries and jobs left behind by a failed wake request.
Fly's hourly schedule is approximate; this is a hobby setup, not a precise task
scheduler. Failed jobs remain visible in Solid Queue; they do not keep compute
running forever. A deployment allows up to four minutes for active jobs to finish.

## Checks and recovery

```sh
fly status --app shred-day
fly machine list --app shred-day-worker
fly logs --app shred-day --no-tail
fly logs --app shred-day-worker --no-tail
fly ssh console --app shred-day --command 'ruby bin/wake-worker'
```

`/up` checks boot health. Also verify an authenticated page and a photo import
after deployment. Confirm the worker completes processing after the browser
closes and then reaches `stopped` with exit code 0.

The private worker has no public IP. Its `/wake` endpoint requires the shared
token; `/up` does not extend its idle timer. Do not enable a public worker IP or
point an uptime monitor at the web app if it should remain stopped off-season.

Before changing infrastructure, save `pg_dump --format=custom --no-owner
--no-acl` exports of the databases and verify them with `pg_restore --list`.
Keep photos and database backups together: database rows alone do not contain
uploaded files. Neon restore history is limited by the selected plan.

The old Kamal configuration remains available for rollback during migration.
Retiring the Hetzner server also requires checking its separate database volume,
IPv4, backups, and object-storage bucket. Powering a Hetzner VM off does not stop
its billing. Leave innput.app resources alone.

## Cost envelope

This configuration targets less than $5/month at personal, intermittent usage;
it is not a hard billing cap. Compute is charged while Machines run; stopped
root filesystems still incur a small storage charge. Hourly recovery adds short
worker runs. Neon and Tigris must remain within their free allowances.

At the researched Frankfurt rates, 20 web hours and 10 worker hours are roughly
$0.53 of compute before recovery runs, root-filesystem storage, builds, traffic,
and tax. Continuous web use alone would exceed the target. Check Fly billing
and Neon usage after the first week; limit photo-worker concurrency before
increasing its memory.

Provider references: [Fly pricing](https://fly.io/docs/about/pricing/),
[Flycast](https://fly.io/docs/networking/flycast/),
[scheduled Machines](https://fly.io/docs/blueprints/task-scheduling/),
[Neon plans](https://neon.com/pricing), and [Tigris pricing](https://www.tigrisdata.com/pricing/).
