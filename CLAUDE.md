# CLAUDE.md — Ticket Queue App

> This file is read by Claude Code at the start of every session. It defines the rules, stack, and phase plan. Read it fully before doing anything.

---

## What we're building

An internal ticket queue web app for sales reps working inside our GoHighLevel (GHL) system. Instead of DMing the admin with problems, reps submit a structured ticket (title, description, category, screenshot) into a shared queue. The admin triages and updates status. Reps can **draw/annotate on their screenshot** before submitting to highlight the problem.

Audience: ~5–15 internal reps. Not public-facing. Simplicity beats scale.

---

## Golden rules (do not violate)

1. **Work ONE phase at a time.** Complete the current phase, update `WORKLOG.md`, then STOP and wait for the go-ahead. Do not run ahead to the next phase.
2. **Never commit secrets.** `.env` is gitignored. Only `.env.example` (with placeholder values) is committed. The repo is **public** — treat it that way.
3. **The `service_role` key NEVER appears in frontend code or in the repo.** The frontend uses only the Supabase **anon** key, loaded from `import.meta.env.VITE_SUPABASE_ANON_KEY`. Security is enforced by Row Level Security (RLS), not by hiding the anon key.
4. **After every phase**, append an entry to `WORKLOG.md` (date, phase name, what changed, how to test it).
5. **This is a learning project.** Prefer clear, readable code over clever code. Add a short comment on anything non-obvious so the owner can learn from it.
6. **Ask before installing heavy dependencies** not already listed in the stack below.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Styling | Plain CSS or a single lightweight CSS file (no heavy UI kit) |
| Backend | Supabase (hosted Postgres + Auth + Storage) |
| Auth | **Shared team login** — one email/password all reps use |
| Image annotation | Fabric.js (draw arrows/boxes/freehand on the screenshot) |
| Hosting (later) | Vercel free tier |
| Uptime (later) | UptimeRobot free monitor (prevents Supabase 7-day pause) |

---

## Architecture (how it fits together)

```
Rep's browser (React app on Vercel)
        │
        ├── Supabase Auth  ──► shared team login (session persists)
        │
        ├── Supabase DB    ──► tickets table (all reads/writes)
        │
        └── Supabase Storage ─► ticket-screenshots bucket (annotated PNGs)
```

Because login is **shared**, we cannot tell reps apart by their account. So the submit form includes a **"Your name"** field (a dropdown of reps, or free text) so every ticket is attributable.

---

## Data model

**Table: `tickets`**

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key, default `gen_random_uuid()` |
| ticket_number | int | auto-increment identity, human-readable # |
| created_at | timestamptz | default `now()` |
| submitter_name | text | who filed it (from the "Your name" field) |
| title | text | short summary |
| description | text | the problem, in detail |
| category | text | one of: sms_delivery, ai_agent, pipeline, data, other |
| priority | text | 'normal' or 'urgent', default 'normal' |
| status | text | 'new' \| 'in_progress' \| 'resolved', default 'new' |
| screenshot_url | text | nullable, points to Storage object |

**Storage bucket: `ticket-screenshots`** — stores the flattened annotated PNG. Public read is fine for an internal tool (or use signed URLs if we want to be stricter later).

---

## Definition of done (applies to EVERY phase)

- The feature works when run locally (`npm run dev`).
- No secrets in any committed file.
- `WORKLOG.md` has a new entry.
- The owner can test it by following the "How to test" line in the worklog entry.
- Code is committed with a clear message (e.g. `feat: phase 3 — ticket submit form`).

---

## Phase plan (detail lives in PLAN.md)

- **Phase 0** — Repo + tooling: Vite React app, `.gitignore`, `.env.example`, Supabase client, README.
- **Phase 1** — Supabase backend: create the `tickets` table + storage bucket + RLS policies (SQL provided in PLAN.md).
- **Phase 2** — Shared login: login screen, session persistence, gate the app behind auth.
- **Phase 3** — Submit form: title, description, category, "Your name", priority + basic image upload (no drawing yet).
- **Phase 4** — Annotation: Fabric.js layer over the uploaded image, flatten to PNG on submit, upload to Storage.
- **Phase 5** — Queue board: list all tickets, filter by status, change status (New → In Progress → Resolved).
- **Phase 6** — Detail + deploy: ticket detail view, then deploy to Vercel + set up UptimeRobot ping.

Start at Phase 0. Do not skip ahead.

---

## Coding conventions

- Functional React components + hooks. No class components.
- One Supabase client instance in `src/lib/supabase.js`, imported everywhere.
- Keep components small; a file over ~150 lines is a signal to split.
- Environment variables are read via `import.meta.env.VITE_*` (Vite requirement).
- Commit after each working phase, not mid-phase.
