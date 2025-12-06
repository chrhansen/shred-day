# Shred.Day new server cutover plan (46.224.108.19)

## Goals
- Serve traffic from the new Hetzner server (CX33, 46.224.108.19) with healthy Rails/PG/Active Storage.
- Preserve all PostgreSQL data and bucket objects; avoid data loss during cutover.
- Retire the old server (91.99.62.190) only after verification.

## Task list
1) Baseline + access
   - Confirm SSH/root access to both servers and docker context.
   - Record current Postgres image tag/version on old host and new host; note locale/ICU versions.
   - Capture current Kamal env/secrets (`kamal env`) and bucket credentials in use.
2) Optional write-freeze (skipped for small user base)
   - Proceed without maintenance window; if needed in future, pause writes before taking backups.
3) Database backup and migration (fix collation mismatch)
   - Create fresh `pg_dump` from old server (app + queue DBs) and store in dated path on the new server.
   - Drop local PG data on new host (or point a fresh data volume) to avoid reusing the copied data directory.
   - Restore dump into new Postgres container; run `ALTER DATABASE ... REFRESH COLLATION VERSION` if needed after restore.
   - Run `ANALYZE`/`VACUUM (VERBOSE)` as needed and verify counts (Users, Days) match old host.
4) Active Storage / bucket
   - Verify bucket credentials and endpoint match (`nbg1.your-objectstorage.com`).
   - From new Rails console, fetch a known blob, and create a test upload/delete to confirm read/write.
5) App health on new server
   - Ensure Kamal proxy certs/ports healthy; check `docker ps` and container logs for boot without PG warnings.
   - Run `kamal exec` health checks: Rails `User.count`, background job queue connectivity, and a request to `/health` (or `/`).
   - Verify HTTPS via curl against new IP and via domain once DNS propagates.
6) Cutover confirmation
   - Re-enable web on new host; keep old host stopped or behind a maintenance page to avoid split-brain.
   - Monitor logs/metrics for errors; confirm external client login and photo access.
7) Decommission old server (post-verification)
   - Take final dated `pg_dump` + bucket listing snapshot for archive.
   - Power off old server and detach/delete old volume after retention period.
   - Remove old DNS entries or firewall rules if any remain.

## Persisting Postgres on Hetzner block volume (new server)
To survive accidental server deletion, move Postgres data from the local Docker volume to a Hetzner block volume and bind-mount it:
- Create a new Hetzner Volume in the same zone as the new server; attach it to `shred-day-8gb-nbg1-1`.
- On the host, format and mount:
  - Identify device (e.g., `/dev/disk/by-id/scsi-0HC_Volume_*`), then `mkfs.ext4 <device>`.
  - `mkdir -p /mnt/postgres_data && mount <device> /mnt/postgres_data`.
  - Add an `/etc/fstab` entry so it auto-mounts on reboot.
- Stop app + db containers (kamal app stop; kamal accessory stop db).
- Copy current data into the mounted volume:
  - `docker run --rm -v postgres_data:/from -v /mnt/postgres_data:/to alpine sh -c "cd /from && cp -a . /to"`
  - Ensure ownership stays `999:999` (Postgres image user), adjust with `chown -R 999:999 /mnt/postgres_data` if needed.
- Update `config/deploy.yml` accessory volume mapping to bind-mount the host path:
  - Replace `postgres_data:/var/lib/postgresql/data` with `/mnt/postgres_data:/var/lib/postgresql/data`.
- Restart db and app via Kamal (boot accessory db, then app) and verify counts + connectivity.
- Optionally remove the old Docker volume (`docker volume rm postgres_data`) after verification.
- Consider taking Hetzner volume snapshots periodically for extra safety.
