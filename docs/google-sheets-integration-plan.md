# Google Sheets integration plan

This outlines a minimal but solid way to add a Google Sheets integration that mirrors the mockups in `docs/sidebar-integrations-menu.png` and `docs/integrations-page.png`, keeps a per-user spreadsheet in sync with day changes, and stays within the current one-user simplicity.

## Goals and assumptions
- Single current user, no team-level concerns; one Google Sheet per user.
- App should only see/manage the sheet it creates: use the narrow `drive.file` + `spreadsheets` scopes.
- Initial connect creates the sheet and backfills all seasons (one tab per season); subsequent day writes stay synced.

## Backend work (Rails)
- Data model: add `google_sheet_integrations` table (id via `gen_id('gsi')`), `user_id`, `spreadsheet_id`, `spreadsheet_url`, `access_token`, `refresh_token`, `access_token_expires_at`, `status` (connected/errored), `last_synced_at`, `last_error`. Add `has_one :google_sheet_integration` on `User`.
- OAuth endpoints: new `Api::V1::GoogleSheetIntegrationsController` with `show` (status + sheet_url), `create` (returns auth_url and stores state in session), `update` (accepts `code` + `state`, exchanges for tokens, creates sheet, seeds data), and `destroy` (revokes/clears tokens and metadata). Follow existing Google auth pattern but use Drive/Sheets scopes and a distinct session state key.
- Google client services: introduce `GoogleSheets::AuthUrlService`, `GoogleSheets::TokenExchangeService`, and `GoogleSheets::ClientFactory` that returns an authorized Sheets client with auto refresh. Keep Result objects with `connected?`/`synced?` predicates per AGENTS guidance.
- Note: googleauth it's only used to allow a user to sign in with Google, so there is already a Google `client_id` and `client_secret` accessible to the server/Rails App.
- Spreadsheet creation: add `GoogleSheets::SetupSpreadsheetService` to create the file (title like “Shred Day Ski Log”), ensure one tab per season offset (tab-label should be absolute date-strings e.g. "Sep. 2023-Aug. 2024" and "Sep. 2024-Aug. 2025"), and write a header row (e.g., Date, Resort, Day #, Skis, Tags, Notes, People, Day ID, Photos?). Persist `spreadsheet_id` + URL on success.
- Sync pipeline: add `GoogleSheets::SyncSeasonService` that clears and rewrites a given season tab using current data (reuse `OffsetDateRangeConverterService` and existing CSV column helpers for consistent columns). Use `GoogleSheetsSyncJob` (Solid Queue) to run async.
- Triggers: in `DaysController#create/update/destroy` (and any day import service), enqueue `GoogleSheetsSyncJob` for the affected season offset if the user has an integration. After initial connect, enqueue jobs for all seasons to backfill.
- Disconnect/recovery: `destroy` action clears tokens/ids and optionally tries to set status `disconnected`. Basic error handling stores `last_error` and surfaces a “needs reconnect” state to the client.
- Config: add `google_sheets` credential entries (`client_id`, `client_secret`) if different from sign-in; allow redirect host reuse (`/integrations/google/callback` on the Vite dev host 8080).

## Frontend work (React)
- Navigation: add an “Integrations” item to the sidebar (`client/src/components/ui/sidebar.tsx`) pointing to `/integrations`, matching the mock section placement.
- Page: create `IntegrationsPage` with a Google Sheets card matching `docs/integrations-page.png`. Show two states: not connected (CTA “Connect Google Sheets”) and connected (sheet link + “Disconnect”). Use lovable's diff, https://github.com/chrhansen/shred-day-lovable/compare/3db24264a899fbc49331e6d0e6682ecef1331620...f187bd3bcae419c2625db4ed671aadd7cad58550, as a starting point and adjust to fit with this project.
- API client: add a Google Sheets integration service with `getStatus`, `startConnect` (fetch auth_url), `completeConnect` (POST code/state), and `disconnect`. Use TanStack Query for status and mutation hooks.
- OAuth flow: clicking connect opens a modal with a “Continue to Google” button that redirects to the auth_url; add a small `/integrations/google/callback` page to read `code/state`, call `completeConnect`, and then route back to `/integrations` with a toast.
- UX polish: show loading/disable states while connecting/disconnecting, surface backend `last_error` if present, and make the “View sheet” action open the stored URL in a new tab.

## Testing
- RSpec: controller request specs for `show/create/update/destroy` happy/error paths; service specs for token exchange and season sync (stubbing Google clients); a job spec to ensure the right seasons are enqueued on day mutations.
- Frontend: basic render test for `IntegrationsPage` states and a service test/mocked flow that handles connect/disconnect toggles.
- Manual: connect flow against Google test credentials, add/update/delete a day and verify the season tab updates; disconnect and confirm no jobs enqueue.
