# Agents Guide

Use this document as the single source of truth for onboarded coding agents. It captures how the Shred Day project is structured, how to work on it locally, and the expectations for future contributions.

## Project Snapshot
- **Goal:** A personal ski-day log where users capture per-day details (date, resort, skis, people, notes, photos) and review them through lists, calendars, maps, and stats.
- **Stack:** React + TypeScript frontend (Vite, Tailwind, shadcn/ui, TanStack Query) and Ruby on Rails 8 API backend (PostgreSQL 17, Active Storage, Kamal deployments).
- **Authentication:** Email/password sessions today, Google OAuth flow in progress (backend mostly wired up; frontend button pending).
- **Bulk Workflows:** Photo imports (EXIF parsing) exist; text/CSV import is actively under development (parsing, resort lookups, frontend wiring still needed).

## Repository Map
- `/client` – Vite React SPA with routing, Auth context, service layer, and shadcn/ui components.
- `/server` – Rails API-only app with namespaced `/api/v1` routes, serializers, service objects, and RSpec suite.
- Root configs – Kamal deploy config, Docker/Kamal helpers, README, etc.

## Local Development
1. **Install dependencies**
   - `npm install` inside `client`
   - `bundle install` inside `server`
2. **Run apps**
   - Client dev server: `npm run dev` (defaults to http://localhost:8080)
   - Rails API: `bin/rails server` (http://localhost:3000)
3. **Database**
   - Bootstrap with `bin/rails db:setup`
   - Use `bin/rails db:migrate` for schema changes
4. **Useful scripts**
   - `npm run build`, `npm run lint`, `npm test`, `npm run test:watch`
   - Rails console: `bin/rails console`
   - Deploy: `bin/kamal deploy` (plus `bin/kamal logs`, `console`, `shell`, `dbc`)

## Testing Expectations
- **Backend:** `bundle exec rspec` (targets under `spec/models`, `spec/requests`, `spec/services`, etc.).
- **Frontend:** Vitest for unit/component (`npm test`), Cypress for E2E (`npx cypress open` or `npx cypress run`; requires client + server running).
- Add or update tests whenever behavior changes, especially around active initiatives (text import parsing, Google sign-in).

## Contribution Guidelines
- Stay scoped: touch only files relevant to the assigned task unless plumbing makes a change unavoidable.
- Prefer clear naming over comments; only add timeless comments when code cannot be made self-explanatory.
- Follow existing patterns:
  - Rails:
    - service objects for business logic, see server/app/services/
      - Service objects should expose clearly named methods (e.g., `create_default_tags`) instead of a generic `.call` to keep intent obvious at call sites.
      - Service objects must return a simple `Result` Ruby-object, not just a struct, (see `Result`-class example in `ExifExtractService`), put the Result-class at the bottom of the service-class, not the top. The `Result`-object should expose an `extracted?`- or `created?`-style predicate (avoid a generic `success?`) incl. any relevant data (e.g., `result.day`, `result.tags`) so callers can reason about outcomes consistently.
    - Models:
      - Avoid model callbacks whenever possible, especially if the callback relates to business logic. Models should just deal with writing and reading data from the database. Instead of callbacks use service objects for business logic.
    - serializers for consistent JSON
    - Primary keys as prefixed IDs (`day_`, `usr_`, etc.), see custom function `gen_id()` in server/db/structure.sql. E.g. gen_id('tag') => e.g. `tag_GHEsao153d9A`
  - React:
    - service layer for API calls
    - hooks for shared logic
    - TanStack Query for server state
    - protected routes in `App.tsx`.
- Use GitHub CLI for PR interactions if needed (`gh pr create/view/merge`); never force-push.

## Assistant Workflow
1. Read this file
2. Confirm current feature focus with open issues/brief before implementing.
3. Run targeted tests for the area you touch; call out anything you couldn’t run.
4. Communicate clearly in summaries: describe the change, mention affected files, note test status, and suggest next actions when relevant.
5. Use asdf Ruby (currently 3.3.0) when running Ruby commands.
6. If you add migrations, run them and commit the updated `server/db/structure.sql`.

## Git
1. Use the Github CLI `gh` to interact with Github, the origin
2. Keep `main` clean: never commit directly to `main`; always branch off, open a PR, and pull from origin to sync.
