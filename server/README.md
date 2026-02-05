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
- Auth: email/password sessions with cookies.
- Share page: `GET /d/:id` serves a public HTML page for shared days.

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
- `mailjet.api_key`
- `mailjet.secret_key`

## Tests

```sh
cd server
bundle exec rspec
```
