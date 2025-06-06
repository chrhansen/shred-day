# Project Brief

*   **Structure:** Monorepo with React frontend (`/client`), Ruby on Rails 8.0 API backend (`/server`), and PostgreSQL 17 database. Deployment via Kamal in a Github Action.
*   **Core Requirements:**
    *   User accounts with email/password sign-up and sign-in (using Rails sessions).
    *   Log ski days with details (date, resort, skis, etc.), associated with the logged-in user.
    *   View logged ski days (user-specific) on a calendar.
    *   View logged ski days (user-specific) on a map.
    *   Filter the user's ski days by equipment, people, etc.
    *   Backend API for data storage and retrieval, with endpoints protected by session authentication.
    *   Display user-specific statistics (total days, unique resorts, etc.).
    *   Mass import of days from photos (based on date and location in EXIF-data).
    *   Mass import of days from text/CSV files (parsing dates and resort names).
    *   Export of days in CSV format.
*   **Goals:** Create an app for skiers to easily log and review their *own* skiing activities visually (calendar, map) and through filtered lists, with convenient bulk import/export capabilities.
*   **Scope:** [What is included and excluded from this project?] - *Requires User Input*
*   **Source of Truth:** This document is the foundational reference for the project's scope and direction.

## Text Import Functionality

**Objective:** Allow users to import ski days from text or CSV files by parsing dates and resort names.

**Progress:**
- **Backend (Ruby on Rails):**
    - `TextImport` model with status enum: waiting, processing, committed, canceled, failed
    - `DraftDay` model updated to support both `photo_import` and `text_import` associations
    - Added `original_text` field to `draft_days` table for text import context
    - Routes defined: `/api/v1/text_imports` with CRUD operations and `process` action
    - Controller `api/v1/text_imports_controller.rb` handles create, show, update, destroy, and process actions
    - Serializers updated to include necessary fields for text imports

- **Frontend (React):**
    - `TextImportPage.tsx` component for the import workflow
    - `TextDraftDayList.tsx` component to display and manage draft days
    - `TextDraftDayEditor.tsx` component for editing individual draft days
    - `textImportService.ts` for API communication
    - Navbar integration with "From Text" button under Import Days section
    - Route `/text-imports/:importId` configured in App.tsx

**Next Steps:**
1. Implement text parsing logic in the backend to extract dates and resort names
2. Add resort lookup/creation logic for parsed resort names
3. Integrate the text import service calls in the frontend components
4. Test the end-to-end workflow
5. Add error handling and validation
6. Consider duplicate detection logic
