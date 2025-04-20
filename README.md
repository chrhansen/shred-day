# Ski days Builder

An app for skiers to log and later view their skiing days. You enter things like date, ski resort, skis, who you skied with, what you did (training, powder, etc.). 

You can see all your ski days in a calendar or on a map. 

## 🌟 Project Overview


## ✨ Key Features

•⁠ A calendar to flick through months or weeks to see when you skied
•⁠ A map to see where you went
•⁠ A simple form or similar way of input where you log: Date, equipment, ski resort, people, specific focus of the day, a photo, etc. 
•⁠ You could also filter (e.g. skis, people, etc.) to find when or where you used that piece of equipment or hung out with a certain person
•⁠ A user will come to the app when they need to log a new ski day or review their skiing days. Therefore there will be a backend, reached via HTTP, to store and retrieve the data. 


## To run this project:

This project is a monorepo containing the frontend client and the backend server.

### Client (React Frontend)

```sh
cd client

# Step 1: Install the necessary dependencies.
npm i

# Step 2: Start the development server with auto-reloading and an instant preview.
npm run dev
```

### Server (Rails API)

(Instructions to run the server will be added once it's set up.)

## What technologies are used for this project?

This project is built with:

### Frontend in /client-directory
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

### Backend in /server-directory
- Ruby on Rails - API-only
- Postgres Database

### Deploy

- Hetzner VPS with Ubuntu
- Kamal for deploying both Rails and React
