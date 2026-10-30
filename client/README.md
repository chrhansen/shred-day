# Shred.Day Client

React SPA for Shred.Day, built with Vite, TypeScript, Tailwind, shadcn/ui, and TanStack Query.

## Requirements
- Node.js and npm.

## Setup

```sh
cd client
npm install
npm run dev
```

Dev server: `http://localhost:8080`

## API Configuration
- Dev default: `http://localhost:3000`.
- Production builds: set `VITE_API_BASE_URL` (or `API_BASE_URL`).

## Scripts
- `npm run dev` start the dev server.
- `npm run build` build for production.
- `npm run preview` preview the production build.
- `npm run lint` run ESLint.
- `npm test` run Jest unit tests.
- `npx cypress open` open Cypress for E2E.

## Password sign-in

Signup collects an email address and requests a confirmation link. The public `/confirm-email` page captures the link's fragment token in memory, removes it from the address bar, and confirms ownership only after submitting a new password and its confirmation. It never consumes a token with GET or signs the user in automatically. After refreshing, reopen the email link or request another one.

Unconfirmed password accounts receive confirmation/resend guidance, including legacy sessions rejected by the API. Google sign-in uses the provider's verified email and needs no separate email step. Expired or used links can request another email; resend responses remain generic. Tokens and passwords are never stored in browser storage or navigation state.

The sign-in form's “Forgot password?” link opens `/forgot-password`. Recovery links open the public `/reset-password` page and expire after one hour. That page removes the fragment token from the address bar and submits it only with matching new passwords. Invalid or used links offer another request; validation or network errors allow a retry. Successful recovery clears the current browser session before offering sign-in with the new password. See [password recovery API and delivery](../server/README.md#password-recovery) for account eligibility, session invalidation, and deployment requirements.

Primary email is displayed read-only in account settings. Changing it is unavailable; other profile settings remain editable.

### Cypress fixtures

`cy.createUser` creates confirmed synthetic users through a Node/Rails test task, never through a production bypass endpoint. It requires `RAILS_ENV=test`, a loopback HTTP API, and a loopback `DATABASE_URL` whose database is exactly `shred_day_test`. The Ruby runner independently checks the test environment, database and test mail delivery before any write. Fixture inputs travel through stdin; credentials are not logged. Local runs should use asdf Ruby 3.4.2. Public signup tests exercise the separate pending-confirmation flow.
