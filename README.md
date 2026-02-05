# Shred.Day

Personal ski-day log for capturing each day (date, resort, skis, tags, notes, photos) and reviewing seasons over time.

## Repo Layout
- `client` React SPA (Vite, TypeScript, Tailwind, shadcn/ui, TanStack Query).
- `server` Rails API-only app (PostgreSQL, Active Storage).
- `config` Deployment config (Kamal).

## Key Features
- Log ski days with date, resort, skis, tags, notes, and photos.
- Browse days by season, grouped into recent time ranges.
- Stats dashboard (days, unique resorts, most-used ski).
- Shareable day pages.
- Photo import with EXIF parsing.
- Text/CSV import that creates draft days before commit.
- CSV export.
- Google Sheets sync integration.
- Email/password accounts and session auth.

## Quickstart

### Client

```sh
cd client
npm install
npm run dev
```

Dev server: `http://localhost:8080`

### Server

```sh
cd server
bundle install
bin/rails db:setup
bin/rails server
```

API server: `http://localhost:3000`

## Data Model (Summary)
Full details: `server/README.md` and `server/db/structure.sql`.

Core tables:
- `users`
- `days`
- `resorts`
- `skis`
- `tags`
- `tag_days`
- `days_skis`
- `photos`
- `photo_imports`
- `text_imports`
- `draft_days`
- `google_sheet_integrations`

## Testing

### Client

```sh
cd client
npm test
```

### Server

```sh
cd server
bundle exec rspec
```

## More Docs
- Client details: `client/README.md`
- Server details: `server/README.md`
