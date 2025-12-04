# Ski days Builder

An app for skiers to log and later view their skiing days. You enter things like date, ski resort, skis, who you skied with, what you did (training, powder, etc.).

You can see all your ski days in a list view and toggle to see days in different seasons.

## Project Overview

This is a monorepo containing both the frontend (React client in /client) and the backend (Ruby on Rails API in /server).

## 🏗️ Project Structure

*   `/client`: Contains the frontend application built with Vite, React, TypeScript, and Tailwind CSS (using shadcn/ui).
*   `/server`: Contains the backend API built with Ruby on Rails (API-only mode) using a PostgreSQL database.
*   `/`: Root directory containing configuration files for Docker (`.dockerignore`), Git (`.gitignore`), Kamal (`.kamal/`), and this README.

## ✨ Key Features

•⁠ A calendar to flick through months or weeks to see when you skied
•⁠ A simple form or similar way of input where you log: Date, equipment, ski resort, people, specific focus of the day, a photo, etc.
•⁠ User accounts with email/password authentication.
•⁠ Logged days and statistics are associated with the logged-in user.
•⁠ You could also filter (e.g. skis, people, etc.) to find when or where you used that piece of equipment or hung out with a certain person
•⁠ Mass import of days from photos (based on date and location in EXIF-data)
•⁠ Export of days in CSV format
•⁠ A user will come to the app when they need to log a new ski day or review their skiing days. Therefore there will be a backend, reached via HTTP, to store and retrieve the data.

## 🚀 To run this project:

This project is a monorepo containing the frontend client and the backend server.

### Client (React Frontend - in `/client`)

```sh
cd client

# Step 1: Install the necessary dependencies.
npm i

# Step 2: Start the development server (usually on http://localhost:8080).
npm run dev
```

### Server (Rails API - in `/server`)

```sh
# Navigate to the server directory
cd server

# Install dependencies (including bcrypt for passwords)
bundle install

# Setup the database (create users table, days table, etc.)
# Note: This will drop existing data if run multiple times!
bin/rails db:setup
# Or to just run pending migrations: bin/rails db:migrate

# Start the Rails server (typically on http://localhost:3000)
bin/rails server
```

## 🛠️ What technologies are used for this project?

### Frontend (`/client`)
- Vite (Build tool & Dev Server)
- TypeScript
- React
- React Router
- shadcn/ui (UI Components)
- Tailwind CSS (Styling)
- TanStack Query (Data Fetching/Caching)

### Backend (`/server`)
- Ruby on Rails (API-only)
- PostgreSQL (Database)
- Puma (Web Server)
- bcrypt (Password Hashing)

### Deployment (`/` and `/server`)
- Docker (Containerization)
- Kamal (Deployment tool, run from project root)
  - Configuration: `config/deploy.yml`
  - Target: Hetzner VPS with Ubuntu
- Kamal-proxy (Reverse Proxy, managed by Kamal)

## 🧪 Testing

This project uses different testing strategies for the backend and frontend.

### Backend (Rails API - in `/server`)

- **Framework:** RSpec (`rspec-rails`)
- **Factories:** FactoryBot (`factory_bot_rails`)
- **Matchers:** Shoulda Matchers (`shoulda-matchers`)

**Running Specs:**

```sh
# Navigate to the server directory
cd server

# Run all model specs
bundle exec rspec spec/models

# Run all request (API endpoint) specs
bundle exec rspec spec/requests

# Run all specs
bundle exec rspec
```

### Frontend (React Client - in `/client`)

- **End-to-End (E2E) Testing:** Cypress
  - Simulates real user interactions in a browser.
  - Configuration: `client/cypress.config.ts`
  - Specs: `client/cypress/e2e/`
- **Unit/Component Testing:** Vitest + React Testing Library
  - For testing individual components and functions in isolation.

**Running E2E Tests:**

Ensure the client development server (`npm run dev`) and the backend server (`bin/rails s`) are running.

```sh
# Navigate to the client directory
cd client

# Open the Cypress Test Runner (interactive mode)
npx cypress open

# Run tests headlessly in the terminal (e.g., for CI)
# npx cypress run
```
