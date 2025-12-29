# Share Day Feature Plan

## Goals
- Allow a day to be shared publicly via a short URL and Open Graph preview.
- Provide a share modal in the app for copying links and toggling sharing.
- Add username + profile photo to users and surface them on the public share page.
- Handle unshared/missing days with a branded “melted away” empty state.

## Proposed Work Breakdown

### 1) Data model + API
- Add `shared_at: datetime` to `days` table.
- Add `username` + profile photo fields to users (likely `username` column + Active Storage attachment).
- Expose `shared_at`, `username`, and user avatar URL in the day/user serializers.
- Add RESTful API endpoints to.:
  - Toggle sharing on/off for a day (set/clear `shared_at`). E.g. /shared_days resource, create: POST /shared_days (day-id in body), destroy: DELETE /shared_days/:day_id:
  - Fetch a shared day by id for public access (no auth), only if `shared_at` present.

### 2) Public share route + Open Graph
- Add a server route for `GET /d/:id`, mapped to a controller that renders OG tags in `<head>`.
- Accept both `day_`-prefixed and bare ids; generate links using bare ids.
- Controller should look up the day (respecting `shared_at`) and return OG tags based on day + user data; if not found/unshared, return OG tags for the “melted away” state.
- Ensure catch-all route still serves the SPA for regular frontend routes.

### 3) Frontend share flow
- Add share icon to `client/src/components/SkiDayItem.tsx`.
- Create share modal component:
  - Show share URL, copy-to-clipboard.
  - Toggle sharing on/off (updates `shared_at`).
- Update service layer + React Query mutations to support sharing state updates.

### 4) Public share page (SPA)
- Add `SharedDayPage.tsx` with mobile-first layout using existing components.
- Route `client` to `/d/:id` (public, no auth).
- If day not found/unshared: show “This day has melted away” empty state (per `docs/not-found-shared-day.png`).
- Render user username + avatar/profile photo.

### 5) Account/profile updates
- Add UI on account page to set username + profile photo.
- Wire to API endpoint for updating user profile data.

### 6) Tests
- Backend: request specs for shared day fetch, toggle share, OG route.
- Frontend: component tests for share modal + shared day page (as needed).

## Open Questions / Clarifications
Resolved:
- Public route path is `/d/:id` (no `/s/:id`).
- User profile photo is a new Active Storage attachment (separate from day photos).
- Username must be unique (DB constraint + model validation), 15–20 chars, allow underscore and typical username characters.
- Public share exposes full day data (photos, notes, people, skis, etc.).
- Unshared or missing day returns 404 (do not distinguish).

## Inputs Used
- Lovable diff reference: https://github.com/chrhansen/shred-day-lovable/compare/afa44bfd2a32fb929ee47b7b01b8719ac1615fc3..e193f4d86ac7503dffa441618ac7f769f71bc1e6. Use this diff as a starting point and hook up/edit to match this code base.
- UI references in `docs/` screenshots.
