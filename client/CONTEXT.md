# Shred Day Client - Context & Progress

## Recent Work (2025-06-17)

### Service Layer Refactoring - COMPLETED ✅

**What was done:**
1. Created centralized API client (`src/lib/apiClient.ts`) to eliminate code duplication
2. Refactored all 7 service files to use the new API client
3. Added comprehensive test coverage (31 tests)
4. Fixed Cypress test failures and successfully deployed to production

**Key Files Created/Modified:**
- `src/lib/apiClient.ts` - Centralized API client with error handling
- `src/lib/config.ts` - Environment configuration
- `src/lib/__mocks__/config.ts` - Mock for testing
- `src/services/*.ts` - All refactored to use API client
- `src/services/__tests__/*.test.ts` - New test files

**Results:**
- ~70% code reduction in service files (~500 lines removed)
- Consistent error handling across all API calls
- Better TypeScript type safety
- All tests passing (Jest + Cypress)

### Key Learnings

1. **Cypress Test Fixes:**
   - Toast messages appear in `[data-sonner-toast]` elements
   - API intercepts must be set up BEFORE triggering the action
   - Use wildcard patterns for more flexible intercepts

2. **Jest Configuration:**
   - Mock `import.meta.env` in tests using module mocks
   - Use `jest.config.cjs` with proper module name mapping

3. **API Client Patterns:**
   - Handle 204 No Content responses explicitly
   - FormData requires removing Content-Type header
   - Re-export utilities for backward compatibility

## Next Steps for Cleanup (Prioritized)

### 1. TypeScript Type Safety (HIGH PRIORITY)
- Remove `any` types throughout components
- Create proper type definitions in dedicated files
- Add validation for type assertions

### 2. Component Decomposition (MEDIUM-HIGH PRIORITY)
- Break down `LogDay.tsx` (603 lines)
- Break down `TextImportPage.tsx` (457 lines)
- Extract business logic to custom hooks

### 3. State Management Patterns (MEDIUM PRIORITY)
- Standardize React Query usage
- Remove manual state synchronization
- Implement optimistic updates

### 4. Error Handling & User Feedback (MEDIUM PRIORITY)
- Add error boundaries
- Consistent toast messages
- Better loading states

### 5. Code Organization (LOW-MEDIUM PRIORITY)
- Organize components by feature/domain
- Create barrel exports
- Standardize import paths

## Project Structure

```
client/
├── src/
│   ├── lib/
│   │   ├── apiClient.ts       # Centralized API client
│   │   └── config.ts          # Environment config
│   ├── services/              # API service layer (all refactored)
│   ├── components/            # React components (needs organization)
│   ├── pages/                 # Route components (some need decomposition)
│   ├── contexts/              # Global state (AuthContext)
│   └── types/                 # TypeScript types
├── cypress/                   # E2E tests
└── jest.config.cjs           # Test configuration
```

## Important Notes

- Authentication: Session-based with cookies
- API Base: `/api/v1/*`
- State Management: React Query + Context API
- UI Components: shadcn/ui with Tailwind CSS
- Testing: Jest for unit tests, Cypress for E2E

## Common Commands

```bash
# Development
npm run dev              # Start dev server (port 8080)
npm test                 # Run Jest tests
npm run build           # Build for production

# Testing
npm test src/services   # Test specific directory
npx cypress open        # Run Cypress interactively
npx cypress run         # Run Cypress headless

# Git workflow
gh pr create            # Create PR
gh pr checks <number>   # Check PR status
gh pr merge <number>    # Merge PR
```

## CI/CD Notes

- Tests run automatically on PR
- Deployment happens automatically after merge to main
- Cypress tests can be flaky - check toast selectors and API intercepts

---
Last updated: 2025-06-17
Context preserved for future sessions