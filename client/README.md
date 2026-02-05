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
