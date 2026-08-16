# Ticket Queue

Internal ticket queue web app for sales reps. Reps submit structured tickets (with an annotated screenshot) instead of DMing the admin. Admin triages and updates status.

Built with **React + Vite** and **Supabase** (Postgres + Auth + Storage). Screenshot annotation via **Fabric.js**.

> ⚠️ This repo is **public**. Never commit `.env` or any Supabase `service_role` key.

## Stack
- Frontend: React + Vite
- Backend: Supabase (hosted Postgres, Auth, Storage)
- Auth: shared team login
- Annotation: Fabric.js
- Hosting: Vercel (free)

## Local setup
1. `git clone <repo-url> && cd <repo>`
2. `npm install`
3. Copy env file: `cp .env.example .env`
4. Fill `.env` with your Supabase URL + anon key (Supabase → Project Settings → API).
5. `npm run dev`

> Vite reads `.env` only at startup — restart the dev server after editing it.

## Supabase setup
1. Create a free Supabase project.
2. SQL Editor → paste and run [`supabase/schema.sql`](supabase/schema.sql) (creates the `tickets` table + RLS policies).
3. Storage → new bucket named `ticket-screenshots`, **Public** enabled.
4. Run the app — the setup check on the home screen verifies all three steps.

## Project docs
- `CLAUDE.md` — build rules + conventions (read by Claude Code)
- `PLAN.md` — phase-by-phase roadmap + SQL
- `WORKLOG.md` — running log of what's been built

## Status
See `WORKLOG.md` for current progress.
