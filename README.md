# Ticket Queue

Internal ticket queue web app for sales reps. Reps submit structured tickets (with an annotated screenshot) instead of DMing the admin. Admin triages and updates status.

Built with **React + Vite** and **Supabase** (Postgres + Auth + Storage). Screenshot annotation via **Fabric.js**.

> ⚠️ This repo is **public**. Never commit `.env` or any Supabase `service_role` key.

## Stack
- Frontend: React + Vite
- Backend: Supabase (hosted Postgres, Auth, Storage)
- Auth: shared team login
- Annotation: Fabric.js
- Hosting: Netlify (free)

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


## Deploying to Netlify

The build settings live in `netlify.toml`, so there is nothing to type into the
Netlify build form — it picks up `npm run build`, the `dist` folder and the Node
version from there.

The one thing Netlify cannot read from the repo is the environment variables,
because `.env` is gitignored and must stay that way. Set both in
**Site configuration → Environment variables** before the first build:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | your project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon (public) key |

Vite inlines `VITE_*` variables at **build** time, not at run time. Adding or
changing one after a deploy does nothing until you trigger a new build.

Both values end up visible in the browser bundle, which is fine: the anon key is
designed to be public and Row Level Security is what protects the data. The
`service_role` key must never be set here.

After the first deploy, point an UptimeRobot monitor at the site URL. A free
Supabase project pauses after 7 days of inactivity; a periodic request keeps it
awake.
