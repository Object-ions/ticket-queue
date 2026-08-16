# WORKLOG

A running log of what got built, when, and how to test it. Claude Code appends a new entry at the end of every phase. Newest entries go at the TOP.

Entry format:
```
## [DATE] — Phase N: <name>
**Did:** what changed (files, features)
**Test:** exact steps to verify it works
**Notes:** decisions, gotchas, anything to remember
**Next:** what phase comes next
```

---

<!-- New entries above this line -->

## [2026-08-15] — Phase 1: Supabase backend
**Did:**
- Added `supabase/schema.sql` — the `tickets` table, RLS policies for select/insert/update, and the Storage policies for the `ticket-screenshots` bucket. Committed so the database is reproducible instead of living only in dashboard clicks.
- Added `src/lib/setupCheck.js` — two checks that verify the dashboard work actually landed: the table exists and RLS hides rows from logged-out visitors, and the storage bucket exists and serves public reads.
- Added `src/components/SetupCheck.jsx` + styles — a three-row pass/fail screen (env vars, database, storage).
- Exported `SUPABASE_URL` and `SCREENSHOT_BUCKET` from `src/lib/supabase.js` so the bucket name is defined in exactly one place.
- README now documents the Supabase setup steps.

**Test:**
1. Do the 👤 MANUAL steps (create project → run `supabase/schema.sql` → create the public `ticket-screenshots` bucket → paste URL + anon key into `.env`).
2. Restart the dev server: `npm run dev`.
3. All three rows on http://localhost:5173 should be green ✓, ending with "Backend is ready."
4. Any red ✕ row states exactly what is missing.

**Notes:**
- **Deviation from PLAN.md:** the SQL uses `to authenticated ... using (true)` instead of `using (auth.role() = 'authenticated')`. `auth.role()` is deprecated in Supabase and errors on newer projects; `to authenticated` is the current supported form and does the same thing.
- **Addition not in PLAN.md:** Storage policies. Marking a bucket "public" only makes reads public — uploads stay blocked by RLS on `storage.objects`. Without these policies the Phase 3 upload would fail with "new row violates row-level security policy".
- Check #2 treats *zero readable rows while logged out* as the success case. An empty result is proof RLS is working, not proof the table is empty.
- There is deliberately no DELETE policy — tickets cannot be deleted from the app.
- Not verified end-to-end by me: the Supabase project does not exist yet, so checks 2 and 3 currently report "Skipped". They run for real once the manual steps are done.

**Next:** Phase 2 — shared team login (needs 👤 MANUAL creation of one shared user in Supabase → Authentication → Users).

## [2026-08-15] — Phase 0: Repo + tooling
**Did:**
- Created the public GitHub repo `Object-ions/ticket-queue` with an SSH remote, and a `.gitignore` that blocks `.env`, `node_modules/`, `dist/`, `.DS_Store`, `.vercel`, logs and editor files.
- Scaffolded Vite + React 19 (`package.json`, `vite.config.js`, `index.html`, `src/main.jsx`). Deleted the Vite demo assets (logos, hero image, `App.css`).
- Installed `@supabase/supabase-js`.
- Added `.env.example` (committed, placeholder values) and `.env` (gitignored, local only).
- Added `src/lib/supabase.js` — the single shared Supabase client, plus a `hasSupabaseConfig` flag so the UI can say "not configured yet" instead of crashing while `.env` still holds placeholders.
- Replaced `src/App.jsx` with a Phase 0 placeholder that reports Supabase config status, and `src/index.css` with a small global stylesheet using CSS variables that later phases reuse.

**Test:**
1. `npm install`
2. `npm run dev` → open http://localhost:5173
3. You should see "Ticket Queue" with an amber box: "Supabase is not configured yet…" (correct — Phase 1 fills in the real values).
4. `git status` → `.env` must NOT be listed.
5. `npm run build` → completes with no errors.

**Notes:**
- `.env` currently holds the placeholder values copied from `.env.example`. Phase 1 replaces them with the real project URL + anon key.
- Vite only exposes variables prefixed `VITE_`, and everything with that prefix is bundled into the public JS. That is fine for the anon key by design — RLS is what protects the data. The `service_role` key must never go in a `VITE_` variable.
- Vite requires a dev-server restart to pick up `.env` changes; hot reload will not do it.
- Repo remote uses SSH (`git@github.com:Object-ions/ticket-queue.git`).

**Next:** Phase 1 — create the Supabase project, run the `tickets` table SQL, create the `ticket-screenshots` storage bucket (all 👤 MANUAL in the Supabase dashboard).
