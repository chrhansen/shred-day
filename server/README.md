# Shred.Day API

Rails API for Shred.Day, backed by PostgreSQL and Active Storage.

## Requirements
- Ruby 3.3.0 (see `server/.ruby-version`).
- PostgreSQL (dev uses `shred_day_development` plus `shred_day_development_queue`).
- Bundler.

## Setup

```sh
cd server
bundle install
bin/rails db:setup
```

## Run

```sh
cd server
bin/rails server
```

Server: `http://localhost:3000`

## API
- Base path: `/api/v1`.
- Auth: confirmed email/password sessions with cookies, or verified Google/Apple identities.
- Share page: `GET /d/:id` serves a public HTML page for shared days.

Mobile login uses revocable bearer sessions. Rails verifies Google/Apple identity proofs; an established provider subject selects its account. For a new subject, a verified provider email matches an existing account case-insensitively without a separate connection step. Unverified email and ambiguous duplicate addresses cannot select an account. Apple relay addresses remain distinct from real addresses. Explicitly connecting a different email still requires recent authentication with the current account. Apple nonce, authorization-code verification and proof-replay protections apply to both paths.

### Password email confirmation

Password signup accepts `{ "user": { "email": "..." } }`. Both `POST /api/v1/users` and `POST /api/v1/mobile/users` return `201` with `confirmation_required: true` and send a confirmation link; neither creates a session. Older clients may supply a provisional password, which cannot be used to sign in. After opening the email link, the user confirms their address and chooses their password, then signs in normally.

| Endpoint | Request | Result |
| --- | --- | --- |
| `POST /api/v1/email_confirmation_requests` | `{ "email": "..." }` | Generic `202` response; sends a new link for an eligible account. |
| `POST /api/v1/email_confirmations` | `{ "token": "...", "password": "...", "password_confirmation": "..." }` | `200` confirms ownership and sets the password, without signing in. Invalid/expired links or invalid passwords return `422`. |
| `POST /api/v1/sessions` or `/api/v1/mobile/sessions` | Email and password | Correct unconfirmed passwords return `403` with `code: "email_confirmation_required"`; incorrect passwords return `401`. |

Links expire after 24 hours, work once, and carry their token in the URL fragment. Only an explicit POST consumes the token; email scanners following GET links cannot confirm an account. Resending invalidates earlier links, with a 60-second account cooldown and hourly IP limits. Public signup is also limited to 10 attempts per IP per hour on each platform.

Verified Google/Apple sign-in requires no additional email. Provider ownership can recover an unconfirmed account, but it never authorizes a password chosen before that ownership proof: the provisional password and its sessions are invalidated. Independently confirmed passwords stay valid. Setting up password sign-in still requires the mailbox link. Changing a password requires another confirmation and invalidates password sessions; normal profile changes do not. Primary email changes are rejected until a dedicated new-email confirmation flow is available; unchanged addresses remain accepted by existing profile clients.

### Confirmation rollout and mail delivery

Run the three primary database migrations before serving the new authentication code. Existing accounts are intentionally left unconfirmed for password sign-in; do not backfill confirmation timestamps merely because an account or provider identity exists. Existing password cookies and bearers without the current credential-version binding cannot bypass confirmation or revive after ownership changes. Coordinate the backend rollout with the updated web and iPhone signup/error screens.

Provider identity trust is also left unset for legacy records. Existing provider cookies and bearers without a trusted identity binding require a fresh sign-in and cannot revive after mailbox confirmation. A fresh verified Google/Apple proof for the same primary email restores provider access immediately, without a confirmation email. A legacy provider with a different or unavailable email stays quarantined until explicitly reconnected from that same confirmed account using fresh authentication. Existing identity rows and encrypted Apple refresh credentials are retained; ownership recovery makes no external revocation calls. Once a subject is trusted, it continues to identify its account even if a later provider proof changes or omits email.

Confirmation uses the existing Resend delivery configuration and Solid Queue worker. No additional mail credentials are needed. Queue jobs contain an encrypted delivery envelope; the account stores only a token digest and expiry. Confirmation jobs wait until the transaction commits, skip obsolete links, and retry sanitized delivery failures up to five times. Keep the worker running and verify a synthetic mailbox flow during rollout. Do not log or copy confirmation links, passwords, mail bodies, or queue envelopes. Production links target `https://shred.day/confirm-email`; development links target `http://localhost:8080/confirm-email`.

A rollback that removes these checks would permit unconfirmed password access again; prefer a forward fix. Confirmation/password/session changes made after rollout persist in the database. No data or accounts need to be deleted for rollback.

## Data Model
Primary keys are prefixed IDs from `gen_id()` (see `server/db/structure.sql`).

| Table | Purpose | Key relations |
| --- | --- | --- |
| `users` | Accounts and season settings. | Owns days, skis, tags, imports, photos, Google Sheet integration. |
| `days` | Logged ski days. | `user_id` -> `users.id`, `resort_id` -> `resorts.id`. |
| `resorts` | Resort directory and suggestions. | `suggested_by` -> `users.id`, referenced by days and draft_days. |
| `skis` | User skis. | `user_id` -> `users.id`, joined via `days_skis`. |
| `tags` | User tags. | `user_id` -> `users.id`, joined via `tag_days`. |
| `tag_days` | Day-tag join records. | `day_id` -> `days.id`, `tag_id` -> `tags.id` (cascade delete on day). |
| `days_skis` | Day-ski join records. | Join table with `day_id` and `ski_id` columns. |
| `photos` | Photo records and EXIF metadata. | `user_id` -> `users.id`, optional `day_id`, `draft_day_id`, `resort_id`, `photo_import_id`. |
| `photo_imports` | Photo import runs. | `user_id` -> `users.id`, owns `photos` and `draft_days`. |
| `text_imports` | Text/CSV import runs. | `user_id` -> `users.id`, owns `draft_days`. |
| `draft_days` | Import candidates before commit. | `resort_id` -> `resorts.id`, optional `day_id`, exactly one of `photo_import_id` or `text_import_id`. |
| `google_sheet_integrations` | Google Sheets sync state. | `user_id` -> `users.id` (1:1). |
| `active_storage_*` | Rails file storage metadata. | Used by Active Storage attachments and blobs. |

## Imports
- Photo imports parse EXIF data and create draft days.
- Text/CSV imports parse input into draft days before commit.

## Credentials
Stored in Rails credentials:
- `google.client_id`
- `google.client_secret`
- `resend.api_key`

## Tests

```sh
cd server
bundle exec rspec
```
