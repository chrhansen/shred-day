Plan for moving Solid Queue jobs to a dedicated container on the current Hetzner server.

1) Worker command  
- Use existing `server/bin/jobs` (SolidQueue::Cli) as the container command; it is already copied into the image.

2) Kamal roles and env  
- `config/deploy.yml`: add a `job` role on the same Hetzner host (116.203.51.34) with `cmd: bin/jobs`.  
- Set `SOLID_QUEUE_IN_PUMA: false` so Puma stops supervising workers; keep shared DB env/secrets.  
- Optional: set `JOB_CONCURRENCY`/logging envs if you want more than the default single process.

3) Deploy the new role  
- Push env/secrets if adjusted: `bin/kamal env push`.  
- Deploy web + job: `bin/kamal deploy --roles web job` (or `bin/kamal deploy` if both roles are default).  
- Verify: `bin/kamal app ps` and `bin/kamal logs -r job`.

4) Post-deploy checks  
- Ensure web logs no longer show Solid Queue activity; job logs should show workers booting.  
- Enqueue a trivial ActiveJob in console (`MyJob.perform_later`) and confirm completion.  
- Monitor `solid_queue_processes`/metrics; tune `JOB_CONCURRENCY` if throughput needs increase.
