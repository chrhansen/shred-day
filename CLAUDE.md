# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shred Day is a monorepo application for skiers to log and review their skiing days. It consists of:
- **Frontend**: React/TypeScript with Vite, TanStack Query, and shadcn/ui components
- **Backend**: Ruby on Rails 8.0 API with PostgreSQL 17
- **Deployment**: Docker containers deployed via Kamal to Hetzner VPS

## Common Development Commands

### Frontend (Client) - `/client` directory

```bash
# Install dependencies
npm install

# Run development server (http://localhost:8080)
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run unit tests
npm test
npm run test:watch  # Watch mode

# Run Cypress E2E tests (requires both client and server running)
npx cypress open     # Interactive mode
npx cypress run      # Headless mode
```

### Backend (Server) - `/server` directory

```bash
# Install dependencies
bundle install

# Database setup (creates database with seed data)
bin/rails db:setup

# Run migrations only
bin/rails db:migrate

# Start Rails server (http://localhost:3000)
bin/rails server

# Run all RSpec tests
bundle exec rspec

# Run specific test categories
bundle exec rspec spec/models       # Model tests
bundle exec rspec spec/requests     # API endpoint tests
bundle exec rspec spec/services     # Service object tests

# Run a single spec file
bundle exec rspec spec/models/user_spec.rb

# Rails console
bin/rails console

# Database console
bin/rails dbconsole
```

### Deployment Commands (from root directory)

```bash
# Deploy using Kamal
bin/kamal deploy

# Other Kamal commands
bin/kamal logs -f          # Tail production logs
bin/kamal console          # Production Rails console
bin/kamal shell            # Production shell
bin/kamal dbc              # Production database console
```

## High-Level Architecture

### Authentication Flow
- Session-based authentication using Rails sessions with cookies
- Google OAuth integration for sign-in/sign-up
- All API endpoints require authentication except:
  - User creation (sign-up)
  - Session creation (sign-in)
  - Health check endpoint

### Key Domain Models
- **User**: Core authentication entity
- **Day**: Represents a ski day with date, resort, notes, and associated skis
- **Ski**: Equipment that can be associated with multiple days
- **Resort**: Ski resort locations with coordinates
- **Photo**: Images associated with days (supports EXIF extraction)
- **DraftDay**: Temporary entities created during bulk imports
- **PhotoImport/TextImport**: Manage bulk import workflows

### API Structure
All API endpoints are namespaced under `/api/v1/`:
- Authentication: `/users`, `/sessions`, `/google_sign_in_flow`
- Core resources: `/days`, `/skis`, `/resorts`, `/stats`
- Import workflows: `/photo_imports`, `/text_imports`, `/draft_days`
- Export: `/csv_export`

### Frontend Architecture
- **State Management**: TanStack Query for server state
- **Routing**: React Router with protected routes
- **UI Components**: shadcn/ui components with Tailwind CSS
- **Authentication Context**: Global auth state management
- **Service Layer**: Dedicated service files for API communication

### Data Import Features
1. **Photo Import**: Extracts EXIF data to create draft days with date/location
2. **Text Import**: Parses text/CSV files to extract dates and resort names
3. **Draft Day Workflow**: Review and edit imported data before committing

## Development Patterns

### Backend Patterns
- Service objects for complex business logic (e.g., `PhotoCreateService`, `DayNumberUpdaterService`)
- Active Model Serializers for consistent JSON API responses
- Prefixed IDs for all models (e.g., `day_`, `usr_`, `ski_`)
- RSpec with FactoryBot for testing

### Frontend Patterns
- Service layer pattern for API calls
- Custom hooks for shared logic
- Component composition with shadcn/ui
- TypeScript interfaces for type safety

### Testing Approach
- Backend: RSpec for unit and integration tests
- Frontend: Cypress for E2E tests, Jest/Vitest for unit tests
- Test factories and fixtures for consistent test data

## Important Configuration

### Environment Variables
- `RAILS_MASTER_KEY`: Rails credentials encryption
- `POSTGRES_PASSWORD`: Database password
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth credentials
- `DB_HOST`: Database host (defaults to `server-db` in production)

### CORS Configuration
The Rails API is configured to accept requests from the frontend development server (localhost:8080).

### Asset Storage
- Active Storage configured with S3-compatible object storage
- Image processing via ruby-vips for photo variants

## Current Development Focus

The project is actively implementing text import functionality:
- Backend models and controllers are in place
- Frontend components created but need service integration
- Text parsing logic needs implementation
- Resort lookup/creation from parsed names pending

## Key Files to Understand

- `/server/config/routes.rb`: API endpoint definitions
- `/server/app/controllers/application_controller.rb`: Authentication logic
- `/client/src/App.tsx`: Frontend routing and auth setup
- `/client/src/contexts/AuthContext.tsx`: Authentication state management
- `/memory-bank/projectbrief.md`: Detailed project requirements