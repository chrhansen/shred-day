# Labels Implementation Plan

Plan for replacing the single-value `activity` field with user-defined, multi-select labels that can be created and removed inline on the Ski Day form.

## 1. Database & Data Migration
- **Add tables.** Create `tags` (id via `gen_id('tag')`, `user_id`, `name`, timestamps) with unique index on `lower(name)` scoped to `user_id`. Create `tag_days` join table (`id` via `gen_id('tgdy')`, `day_id`, `tag_id`, timestamps) plus unique composite index to prevent duplicate associations.
- **Foreign keys & constraints.** Attach FK constraints to `users`, `days`, and `tags`; cascade deletes from `days` while restricting deletes from `tags` when tag_days exist.
- **Backfill existing data.** Write migration that:
  1. Reads distinct `activity` values per user.
  2. Creates matching tags (skipping blanks).
  3. Creates `tag_days` rows for every historical association.
  4. Leaves `tags` for users even if no days currently reference them.
- **Drop legacy column.** After backfill, remove `days.activity` and update `structure.sql`.
- **Default seed for existing users.** In the same migration (or a follow-up data migration), ensure every user has `With Friends`, `Training`, and `Bluebird` tags without duplicating already migrated names.

## 2. Models & Callbacks
- **New models.** Add `Tag` and `TagDay` (or `DayTag`) models with the associations:
  - `Tag` `belongs_to :user`, `has_many :tag_days, dependent: :restrict_with_error`, `has_many :days, through: :tag_days`.
  - `Day` gains `has_many :tag_days, dependent: :destroy` and `has_many :tags, through: :tag_days`.
  - `User` gains `has_many :tags`.
- **Validations.** Require tag name presence, enforce case-insensitive uniqueness per user, and add length guard (e.g., `<= 30` chars).
- **Default tags on signup.** Add service invoked from the account creation flow that seeds the three default tags for every new user inside a transaction. Use pattern for services in server/app/services/.

## 3. API & Services
- **Tag endpoints.** Add `Api::V1::TagsController` with `index`, `create`, and `destroy`. Responses should return `{ id, name }`. Destroy must return an error if dependent `tag_days` exist.
- **Day payload changes.** Update `Api::V1::DaysController` strong params to accept `tag_ids: []`. After create/update, invoke a new `Days::SyncTagsService` (patterned after `SyncPhotos`) that:
  - Loads tag IDs scoped to `current_user`.
  - Replaces the day’s associations with the supplied IDs (allowing zero tags).
  - Returns validation errors if any tag is missing or belongs to another user.
- **Serializers.** Extend day serializers (`DayEntrySerializer`, detailed serializer used by `SkiDayDetail`, etc.) to include a `labels` array (each item containing `id` and `name`) so the UI can display multiple entries.
- **Routes.** Add `resources :tags, only: [:index, :create, :destroy]` under the `/api/v1` namespace.

## 4. Frontend Updates
- **Types & services.** Introduce a `Label`/`Tag` TypeScript type plus a `tagService` mirroring the ski service (list/create/delete). Update day-related types so `activity` is replaced with `labels: Label[]` and `tag_ids` in mutation payloads.
- **useLogDay hook.** Fetch the user’s tags via TanStack Query, manage a `selectedLabelIds` state array, and expose helpers to toggle labels, create a label (call `tagService.create`, append to cache, auto-select), and delete a label (only if unused). Remove the `selectedActivity` requirement from form validation.
- **Form component.** Replace `ActivitySelection` with a new `LabelSelection` component:
  - Shows chips for every available label with multi-select behavior (like skis).
  - Provides inline add UI identical to skis for creating labels.
  - Offers a delete affordance (e.g., small `X` on each label) that calls the backend delete endpoint and displays validation errors if the label is still attached to any day.
  - Allows zero selections.
- **Day views.** Update `SkiDayDetail`, `SkiDayItem`, `DayCard`, and any other components to render the new labels list (chips or comma-separated text). Hide the section if no labels exist.
- **Clipboard/upload flows.** Update `useLogDay` mutations and any other API consumers (imports, CSV export, etc.) to pass `tag_ids` and read `labels` from responses.

## 5. Testing & Validation
- **Backend specs.** Add model specs for `Tag` and `TagDay`, controller specs for `TagsController`, and request/service specs proving day create/update round-trips tags and prevents cross-user access. Cover the data migration with a reversible migration test or a one-off spec validating existing `activity` data is preserved.
- **Frontend tests.** Update service mocks, add component tests for `LabelSelection`, and extend hook/page tests to cover adding/removing labels and submitting days with zero labels.
- **Manual QA.** Verify:
  1. Existing days retain their previous “activity” as labels post-migration.
  2. Creating/editing days allows 0+ labels.
  3. New users start with the three default labels.
  4. Attempting to delete an in-use label surfaces the expected error in the UI.

## 6. Rollout Notes
- Deploy the migrations and backend first; the API does not need continue to support old clients by still accepting `activity`, this app still just have 1-2 users, solutions should be as simple as possible. If not supporting dual-mode, coordinate a single deploy where migrations run before the new frontend is served.
- Ensure background jobs or imports referencing `activity` are updated before deployment.
