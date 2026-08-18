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

## [2026-08-18] — Phase 3: Ticket submit form
**Did:**
- `src/lib/constants.js` — the category and priority option lists (short DB value + human label), plus the accepted image types and the 10 MB size cap. One source of truth so Phase 5's board can't drift from the form.
- `src/lib/tickets.js` — `validateImage()` and `createTicket()`. Uploads the screenshot to the `ticket-screenshots` bucket, then inserts the row with the returned public URL, and returns the new `ticket_number`.
- `src/components/ScreenshotPicker.jsx` — file input, type/size validation, and a thumbnail preview. Deliberately its own file: Phase 4 swaps this preview for the Fabric.js drawing canvas.
- `src/components/TicketForm.jsx` — Your name, Title, Description, Category, Priority, Screenshot. Shows "Ticket #N submitted" on success.
- `src/App.jsx` — signed-in view now renders the form instead of the Phase 2 placeholder.
- Form control styles (textarea, select, file input, image preview) appended to `src/index.css`.

**Test:**
1. `npm run dev` → sign in.
2. Fill in the form, attach a screenshot, submit → green "Ticket #1 submitted".
3. Supabase → Table Editor → `tickets` → the row is there, with your name, category, priority, `status = new`, and a `screenshot_url`.
4. Open that `screenshot_url` in a new tab → the image loads.
5. Supabase → Storage → `ticket-screenshots` → the file is in the bucket.
6. Submit a second ticket → it is #2, and your name is still pre-filled.
7. Try attaching a non-image (e.g. a PDF) → an inline error, and the file is not accepted.

**Notes:**
- **"Your name" is free text, not a dropdown.** PLAN.md allowed either. Free text means no hardcoded rep list to maintain as the team changes; the name is saved to `localStorage` so each rep types it once on their own machine.
- **Upload happens before the insert, on purpose.** A ticket row must never point at a file that failed to upload. The trade-off: if the insert fails after a successful upload, an orphaned image is left in the bucket. That is the cheaper failure — a stray file costs a few KB, a broken image link costs the admin real time.
- Uploaded files are renamed to a random UUID. Original filenames can contain spaces and slashes that break URLs, and can leak information (`client-complaint-acme-corp.png`).
- `.insert()` returns nothing by default in Supabase, so the call chains `.select('ticket_number').single()` to get the database-generated number back for the success message.
- The 10 MB cap and the image-type check are for a fast, clear error message only. They are browser-side and can be bypassed; the real limits live in Supabase Storage settings.
- `status` is never set by the form — the column defaults to `'new'`.
- Not verified end-to-end by me: submitting requires the shared login password, which I do not have. Lint and build are clean, and the Phase 1/2 checks (RLS, bucket, storage policies) already passed against the live project.

**Still open from Phase 2 (👤 MANUAL):** public signups appear to still be enabled. Authentication → Sign In / Providers → Email → turn OFF **Allow new users to sign up**. Until then anyone holding the public anon key can create an account and read/write every ticket.

**Next:** Phase 4 — Fabric.js annotation layer over the screenshot, flattened to a PNG on submit.


## [2026-08-17] — Phase 2: Shared team login
**Did:**
- `src/lib/useSession.js` — a hook that reads the stored session on load and subscribes to auth changes, so signing in/out re-renders the app automatically and a page refresh keeps you signed in.
- `src/components/Login.jsx` — email + password form calling `supabase.auth.signInWithPassword`.
- `src/components/Header.jsx` — top bar showing the team account email plus a Sign out button.
- `src/App.jsx` — the gate: no env vars → Phase 1 setup check; still loading → "Loading…"; no session → Login; session → the app.
- Login/header/button/input styles appended to `src/index.css`.

**Verified against the live project:**
- `tickets` table returns `[]` to a logged-out request → Phase 1 RLS confirmed working.
- Storage bucket `ticket-screenshots` exists and serves public reads.
- Auth endpoint responds correctly (`invalid_credentials` for bad credentials).
- `npm run build` and `npm run lint` both clean.

**Test:**
1. Do the 👤 MANUAL steps below.
2. `npm run dev` → you should see the login form, not the app.
3. Sign in with the shared credentials → header + "Signed in" panel.
4. Refresh the page → still signed in (session persists in localStorage).
5. Click Sign out → back to the login form.

**👤 MANUAL — required:**
- **Create the shared user:** Supabase → Authentication → Users → Add user → *Create new user*. Use a team address (e.g. `team@yourdomain.com`) and a strong password. Tick **Auto Confirm User**, otherwise the account cannot log in until the email is confirmed.
- **🔴 Turn OFF public signups:** Authentication → Sign In / Providers → Email → disable **Allow new users to sign up**. I checked the live project and this is currently **enabled**, which is a real hole — see Notes.

**Notes:**
- **Security finding:** the project currently reports `disable_signup: false`. Because the anon key is public in the browser bundle, anyone who finds it could register their own account, become `authenticated`, and our RLS policies (`to authenticated using (true)`) would then grant them full read/write on every ticket. Disabling signups closes it: accounts can then only be created by an admin in the dashboard.
- The auth gate in `App.jsx` is a convenience, not a security boundary — the browser's JS can be edited. RLS at the database is what actually protects data.
- `loading` state exists to stop the login form flashing on screen for already-signed-in reps during the session check.
- Supabase's "Invalid login credentials" message is intentionally vague so it cannot be used to discover which emails exist. Passed through as-is.

**Next:** Phase 3 — the ticket submit form (name, title, description, category, priority, plain image upload).


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
