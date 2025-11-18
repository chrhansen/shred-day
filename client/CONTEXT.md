# Shred Day Client – Context

Use this file to keep timeless knowledge about the client-side codebase. Capture information that is still useful months from now (architecture decisions, recurring patterns, testing tricks), not a log of recent work.

## Overview
- React + TypeScript SPA built with Vite, Tailwind, shadcn/ui, and TanStack Query.
- Talks to the Rails API at `/api/v1/*` using cookie-based session auth.
- Key experiences: logging ski days, browsing calendars/maps/lists, handling bulk imports.

## Architecture & Patterns
- `src/lib/apiClient.ts` centralizes HTTP configuration (base URL, headers, 204 handling). Service modules should call this client instead of `fetch`.
- Shared API and UI types live under `src/types/` to avoid circular imports and `any` usage.
- Business logic that spans components belongs in hooks (e.g., `useLogDay`, `useTextImport`) so pages stay thin.
- Component folders (`src/components`) hold reusable building blocks; organize by feature when possible to keep imports manageable.
- Prefer React Query for server state; reach for context only when data truly needs global sync.

## Testing & Tooling Notes
- Jest/Vitest unit tests: mock `import.meta.env` via module mocks (see `jest.config.cjs` mappings) and use the mocks in `src/lib/__mocks__/`.
- Cypress: set up `cy.intercept` **before** triggering actions, use `[data-sonner-toast]` for toast assertions, and lean on wildcard routes for flexible matching.
- FormData requests must omit `Content-Type` so the browser sets boundaries automatically.
- 204 responses require explicit `.text()`/`.json()` guards—`apiClient` already handles this; reuse it.

## Project Structure

```
client/
├── src/
│   ├── components/            # Shared UI pieces
│   ├── contexts/              # Auth context and similar global state
│   ├── hooks/                 # Feature/business logic hooks
│   ├── lib/
│   │   ├── apiClient.ts       # Shared HTTP client
│   │   └── config.ts          # Environment helpers
│   ├── pages/                 # Route-level components
│   ├── services/              # API wrappers built on apiClient
│   └── types/                 # Centralized TypeScript types
├── cypress/                   # End-to-end tests
└── jest.config.cjs            # Unit-test configuration
```

## Useful Commands

```bash
npm run dev          # Start Vite dev server (port 8080)
npm test             # Run unit tests
npm run build        # Production build
npx cypress open     # Cypress UI runner
npx cypress run      # Cypress headless run
gh pr create         # Open a pull request
gh pr checks <id>    # View PR checks
gh pr merge <id>     # Merge once checks are green
```

## CI/CD Notes
- GitHub Actions run unit tests and Cypress on every PR.
- Merges to `main` trigger deployment via Kamal; no manual steps required.
- When Cypress flakes, re-check toast selectors and intercept ordering first—they are the usual culprits.
