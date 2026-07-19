# Prep Tracker

A personal dashboard to track daily preparation for a job switch (DSA, System Design, AI/Agentic topics, project work, and job applications).

## Features
- GitHub-style activity contribution heatmap
- Milestone/goal tracking with sub-tasks
- Topic mastery tracking
- Job application pipeline tracker
- Analytics dashboard with charts (weekly hours, topic mastery breakdown, application funnel)

## Prerequisites
- Node.js (v18+)
- MySQL server running locally

## Local Setup

1. **Clone & Install Dependencies:**
   Install root, server, and client packages:
   ```bash
   npm run install:all
   ```

2. **Configure Environment Variables:**
   - In `server/`, copy `.env.example` to `.env` (or create it) and customize the `DATABASE_URL` with your local MySQL credentials:
     ```env
     DATABASE_URL="mysql://root:PASSWORD@localhost:3306/prep_tracker"
     PORT=5000
     ```

3. **Database Migration & Seeding:**
   - Run Prisma migrations to build schema tables:
     ```bash
     cd server
     npx prisma migrate dev --name init
     ```
   - Seed starter topics:
     ```bash
     npx prisma db seed
     ```

4. **Run in Development:**
   - From the project root, run:
     ```bash
     npm run dev
     ```
     This concurrently starts the Express backend (http://localhost:5000) and Vite frontend (http://localhost:5173).
