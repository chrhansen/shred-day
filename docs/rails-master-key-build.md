# Rails master key and Docker build

We previously injected `RAILS_MASTER_KEY` into the Docker build to get `rails assets:precompile` to succeed. That is no longer necessary because Mission Control basic auth now defers to env vars and safely skips credentials when the master key is missing, letting assets compile without secrets.

## What changed
- Mission Control Jobs initializer reads `MISSION_CONTROL_BASIC_AUTH_USER` and `MISSION_CONTROL_BASIC_AUTH_PASSWORD` first and only falls back to credentials if available. Missing master key no longer crashes boot; we log a warning instead.
- Docker build no longer passes `RAILS_MASTER_KEY`.
- Kamal builder args no longer include `RAILS_MASTER_KEY`; runtime still expects it from secrets via the `env.secret` block in `config/deploy.yml`.

## How to verify locally
1. Ensure `RAILS_MASTER_KEY` is unset in your shell (`unset RAILS_MASTER_KEY` if needed).
2. From `server/`, run:
   ```
   SECRET_KEY_BASE_DUMMY=1 RAILS_MASTER_KEY= bundle exec rails assets:precompile
   ```
3. Build should finish without decrypting credentials; remove `server/public/assets` if you want a clean tree afterwards.

## Notes
- Runtime containers still need `RAILS_MASTER_KEY`; Kamal keeps it in `env.secret`.
- If you prefer to set Mission Control creds without touching credentials, define `MISSION_CONTROL_BASIC_AUTH_USER` and `MISSION_CONTROL_BASIC_AUTH_PASSWORD`.
