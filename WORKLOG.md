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

## [2026-08-18] — Phase 5: Queue board
**Did:**
- `src/lib/constants.js` — added `STATUSES` (New → In Progress → Resolved) and `labelFor()`, which turns a stored value like `sms_delivery` into "SMS delivery".
- `src/lib/tickets.js` — added `fetchTickets()` (all tickets, newest first) and `updateTicketStatus(id, status)`.
- `src/components/TicketCard.jsx` — one ticket: number, title, urgent badge, submitter + category + date, description, screenshot thumbnail that opens full size, and a status dropdown.
- `src/components/QueueBoard.jsx` — the list, the All / New / In Progress / Resolved filter buttons with live counts, a Refresh button, and the status-saving logic.
- `src/App.jsx` — two tabs, "Submit a ticket" and "Queue".
- Board styles appended to `src/index.css`: a colour-coded left edge per status (blue = new, amber = in progress, green = resolved), and resolved tickets greyed back so open work stands out.

**Verified:**
- The board's exact query (`select=*&order=created_at.desc`) runs against the live database and returns `[]` while logged out — RLS still hiding rows. A deliberately wrong column name returns a `42703` error on the same request, which is what makes that check meaningful rather than a query that silently passes.
- `npm run lint` and `npm run build` clean.
- Not verified by me: the board rendering with real rows and a status change saving, both of which need the shared login.

**Test:**
1. `npm run dev` → sign in → click the **Queue** tab.
2. Ticket #1 and #2 are listed, newest first, with their screenshots as thumbnails.
3. Click a thumbnail → the full annotated image opens in a new tab.
4. Change a ticket's status to **In Progress** → the left edge turns amber. Reload the page → the change stuck.
5. Click the **New (n)** filter → only new tickets. The counts on each button update as you change statuses.
6. Submit a new ticket on the other tab, then click **Queue** → it's there without needing a refresh.

**Notes:**
- **Filtering happens in the browser, not in SQL.** With ~5–15 reps the whole table is small, so all rows are fetched once and the filter buttons just narrow what's shown — instant, instead of a round trip per click. If this ever grows to thousands of tickets, move the filter into the query and add pagination.
- **The status dropdown updates the screen before the save finishes**, then puts the old value back if the save fails. It feels instant, and the board never shows a status the database doesn't actually have.
- **Anyone signed in can change any status.** That is a consequence of the shared login — the database genuinely cannot tell the admin from a rep. Reps are asked not to; the app can't enforce it.
- Switching tabs unmounts the board, so returning to it refetches. Cheap here, and it means a ticket you just filed appears without a manual refresh.
- Tickets still cannot be deleted from the app — there is no delete policy, by design.

**Next:** Phase 6 — ticket detail view, then deploy to Vercel + the UptimeRobot ping.


## [2026-08-18] — Phase 4a: Fix — screenshot was cropped and misaligned on the canvas
**Reported:** drawing worked and the ticket uploaded, but the screenshot and the canvas were different shapes and only part of the image showed.

**Cause:** a Fabric image assigned straight to `canvas.backgroundImage` is positioned about its **centre**, not its top-left corner. Its `left`/`top` are 0, so the image ended up centred on the canvas's (0, 0) corner — meaning only its bottom-right quarter fell inside the canvas. That is why the picture looked cropped, sat at the wrong scale against the drawings, and exported with empty space around it.

**Fix:** `placeBackground()` in `src/lib/annotator.js` now scales the image and then pins it explicitly: `originX: 'left'`, `originY: 'top'`, `left: 0`, `top: 0`. `useAnnotationCanvas` calls it instead of setting the background itself.

**Verified in the browser, on four screenshot shapes** — 2940×1912 (retina), 1920×1080, 400×900 (tall), 300×200 (smaller than the canvas). For each: a marker was painted into all four corners of the source image, and all four came back in the **correct corners** of the exported PNG, at full source resolution, with the annotations drawn over them. Before the fix the same test returned the image's centre where its top-left corner should be.

**Test:** attach a wide screenshot → the canvas should be the same shape as the picture, with no cropping and no blank margin. Draw a box around something near an edge, submit, and open `screenshot_url` — the box should sit exactly where you drew it.

**Note — why Phase 4's own testing missed this:** I checked that the annotations rendered and that the export came back at full resolution, and both were true. I never checked that the *background image* filled the frame, so a bug that only affected the background passed. The corner-marker check added here is the thing that actually catches it.

**Next:** Phase 5 — the queue board (unchanged).


## [2026-08-18] — Phase 4: Image annotation (Fabric.js)
**Did:**
- Installed `fabric` v7.4.0.
- `src/lib/annotator.js` — the drawing geometry: `fitToWidth()` (screen size + export multiplier), `makeRect()`/`resizeRect()`, `makeArrow()` (Fabric has no arrow primitive, so it's a Line + rotated Triangle grouped together), and `canvasToPngFile()`.
- `src/lib/useAnnotationCanvas.js` — the hook that owns the Fabric canvas: loads the screenshot as the background, wires the mouse handlers for box/arrow, sets up the pencil brush, and exposes tool/undo/clear.
- `src/components/ScreenshotAnnotator.jsx` — the canvas + toolbar layout (31 lines; all the imperative work lives in the hook).
- `src/components/AnnotatorToolbar.jsx` — Draw / Arrow / Box, plus Undo and Clear.
- `src/components/ScreenshotPicker.jsx` — the static preview is replaced by the annotator, lazy-loaded.
- `src/components/TicketForm.jsx` — on submit, uploads the flattened PNG from the canvas instead of the file the rep picked.
- Toolbar and canvas styles appended to `src/index.css`.

**Verified in the browser (canvas layer, no login needed):**
- A 800×500 source shows at 560×350, and the exported PNG comes back **800×500** — full resolution, not the shrunken on-screen size.
- 3,831 annotation pixels are baked into the exported PNG; the arrow head lands exactly on the line's end point in `#e11d48`.
- The arrow is a single Fabric `group`, so Undo removes the shaft and the head together.
- Clear removes the drawings but keeps the background screenshot.
- Export is a real `File`, `image/png`, ready for Storage.
- `npm run lint` and `npm run build` clean.

**Test:**
1. `npm run dev` → sign in.
2. Attach a screenshot → toolbar + canvas appear.
3. **Draw** — freehand scribble. **Arrow** — drag from one point to another; the head follows your direction. **Box** — drag a rectangle.
4. **Undo** removes the last mark (one click removes a whole arrow). **Clear** removes all marks but keeps the screenshot.
5. Submit → open the new row's `screenshot_url` → **your drawings are in the image**, at the screenshot's original resolution.
6. Pick a different screenshot without reloading → a fresh canvas with no leftover drawings.

**Notes:**
- **The canvas is exported, not the original file.** The rep's file is never uploaded — `canvasToPngFile()` flattens the screenshot and the drawings into one PNG. If the canvas somehow failed to build, the form falls back to uploading the raw file, so a broken canvas costs the annotations, not the ticket.
- **Resolution:** the canvas is displayed at 560 px wide to fit the form, but `toDataURL` is called with a multiplier that undoes that shrink. Without it the admin would receive a blurry 560 px image of a 1920 px screenshot.
- **Fabric is lazy-loaded.** It is ~288 kB — bigger than the rest of the app combined. `React.lazy` keeps it out of the initial bundle, so signing in and filing a text-only ticket never downloads it. Main bundle stayed at 410 kB; Fabric is a separate chunk fetched when a screenshot is picked.
- Fabric v6+ no longer creates `freeDrawingBrush` for you — it must be constructed manually or drawing mode silently does nothing.
- Canvas selection is off. Shapes are drawn and left alone; without this a stray click picks one up and drags it.
- The annotator is keyed on the file, and the cleanup calls `canvas.dispose()`. Both matter: without them, swapping screenshots stacks a dead canvas under the new one and keeps the old drawings.
- `canvas.clear()` is deliberately not used — it would wipe the background screenshot along with the marks.
- One fixed colour (`#e11d48`) and one stroke width. A colour picker is easy to add later; it wasn't in the plan and reps only need "point at the problem".

**Next:** Phase 5 — the queue board: list all tickets, filter by status, move New → In Progress → Resolved.


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

**Security fix to Phase 1 (found during this test):** Supabase's advisor flagged *"Clients can list all files in this bucket"* — the `anyone can read screenshots` SELECT policy I added on `storage.objects` in Phase 1. A public bucket already serves every file over its public URL, so the policy bought us nothing the app uses, but it did let anyone with the anon key **list** the bucket and walk every screenshot ever uploaded. Filenames are random UUIDs specifically so they can't be guessed; a listing policy undoes that. Removed from `supabase/schema.sql`. The setup check probes a known public URL rather than listing, so nothing in the app breaks.
👤 MANUAL: in the Storage banner, click **Remove policy** (or run `drop policy if exists "anyone can read screenshots" on storage.objects;` in the SQL Editor). Then re-open a `screenshot_url` — it must still load.

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
