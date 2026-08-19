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

## [2026-08-19] — Admin delete + the rep list
**Did — admins can now delete tickets (schema section 7):**
- A DELETE policy on `tickets` guarded by `is_admin()` — the same function that guards updates, so there is one definition of "admin" and the two policies cannot drift apart. Reps still cannot delete.
- A matching DELETE policy on `storage.objects` for the screenshot bucket. **Deleting the row is only half the job**: without this the images would stay in the bucket forever — invisible, unreferenced, and still counting against storage.
- `deleteTicket()` in `src/lib/tickets.js` removes the row **first**, then the files. If the row is gone but a file lingers, the cost is a few unreferenced KB nobody sees; if the files went first and the row delete then failed, the queue would show a ticket with broken images. A failed file cleanup is deliberately not thrown either — the ticket is already gone, so reporting failure would be misleading.
- `storagePathFromUrl()` in `src/lib/ticketImages.js` — storage deletes take an object path, but the row only stores the full public URL. Returns null for anything outside our bucket, so a hand-edited URL is skipped rather than producing a nonsense delete.
- `TicketDetail` gets a two-step delete for admins: "Delete ticket" → a red warning naming the ticket number → "Delete permanently". **Not** a browser `confirm()` dialog — those can't be styled and block the page. The control sits at the far end of the action row, away from the status dropdown, so the destructive button is never what your cursor lands on by accident.

**Did — the rep list:**
- Inserted the six names: Moses, Jo, Lior, Sol, Bernardo, Fatima. The "Your name" field is now a dropdown; the free-text fallback stays in the code for the case where the list is empty.

**Verified against the live database:** one query returned all 8 expected rows — `admins can delete tickets [DELETE]`, `admins can delete screenshots [DELETE]`, and the six rep names. Lint and build clean, deployed to production.

**Test:**
1. Sign in as admin → open any ticket → **Delete ticket** → the warning names the ticket → **Delete permanently**. It disappears from the queue and its images are gone from the bucket.
2. Sign in as `all@…` → open a ticket → **no delete control at all**. If you forced one, RLS would reject it.
3. Submit tab → "Your name" is a dropdown of the six names.

**Note:** deletion is permanent and there is no undo, by design — no soft-delete column, no trash. If a ticket is deleted by mistake it is gone, screenshots included.

**Next:** nothing outstanding.


## [2026-08-19] — Deployed: live at https://tickets.jo11pipeline.com
**The app is in production.** Netlify project `jo-11-project-queue`, custom subdomain on the owner's Namecheap domain, valid TLS, real data.

**Did — username login:**
- `src/lib/auth.js` — `usernameToEmail()`. Supabase's password auth has no concept of a username; the identifier is always an email. Reps now type `all` and the `@morflorida.com` is appended. Anything containing an `@` passes through untouched, so the admin's Gmail address still works.
- `src/components/Login.jsx` — the field is "Username" and is `type="text"`, deliberately: what gets typed usually isn't a valid email and the browser would refuse to submit it.

**Did — value constraints (schema section 6):**
- CHECK constraints on `category`, `priority` and `status`, plus non-blank `submitter_name` and `title`. Until now only the UI restricted these; the API would have accepted anything.
- **Verified by trying to break it**: inserting `status = 'banana'` inside a transaction failed with `violates check constraint "tickets_status_check"`, then rolled back. A constraint nobody tested is a constraint nobody knows works.

**Did — DNS and hosting:**
- Namecheap: `CNAME tickets → jo-11-project-queue.netlify.app` and the TXT record Netlify required to prove ownership of a domain it doesn't manage. The existing `app → whitelabel.ludicrous.cloud` CNAME and the SPF record were left alone.
- Netlify: custom domain added and set primary, Let's Encrypt certificate issued (`CN=tickets.jo11pipeline.com`, strict HTTPS returns 200).
- **The certificate failed twice before succeeding, and it was worth understanding why rather than clicking again**: `dig SOA` shows a negative-cache TTL of ~1 hour. Netlify's first attempt fired seconds before the CNAME existed, so Let's Encrypt's resolvers cached "no such name" and kept answering that. Nothing was misconfigured; every retry inside that window was guaranteed to fail. It provisioned itself once the cache expired.
- This project is **not** connected to GitHub for continuous deploy — it deploys from the CLI (`netlify deploy --prod --build`). Pushing to GitHub does not publish. Worth knowing before wondering why a change isn't live.

**Did — keeping Supabase awake (`.github/workflows/keep-supabase-awake.yml`):**
- A scheduled GitHub Action every 3 days, instead of UptimeRobot.
- **UptimeRobot pointed at the site would not have worked.** A free Supabase project pauses after 7 days without *database* activity, and this site is static files on Netlify — the Supabase call happens in the visitor's browser. A monitor fetching the page never touches the database. This job queries the REST API directly, which is what actually resets the clock.
- Runs unauthenticated, so RLS applies and it reads nothing back. An empty array still counts as activity.
- Credentials are GitHub Actions secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`), not committed — the repo is public.
- **Verified**: triggered a run by hand, both steps green — Supabase HTTP 200, site HTTP 200.
- Caveat: GitHub disables scheduled workflows after 60 days with no repo activity. If this project goes quiet for two months, re-enable it in the Actions tab.

**Accounts as they now stand:**

| | `all@morflorida.com` | `moshikolee@gmail.com` |
|---|---|---|
| Who | the reps, shared | the admin |
| Read every ticket | ✅ | ✅ |
| Submit | ✅ | ✅ |
| Change status | ❌ | ✅ |

`reps` is a list of **names only** — no passwords, no accounts, no permissions. It exists purely to populate the "Your name" dropdown, because a shared login means the database cannot tell who filed what. Attribution is honour-system: nothing stops someone picking a colleague's name. Fine for an internal tool; do not treat `submitter_name` as proof of anything.

**Still open (both need the owner's input, neither blocks use):**
1. **`reps` is still empty** — so the name field remains free text. One INSERT away: `insert into reps (name) values ('Moses'), ('Dana');`
2. **Ticket deletion** — still nobody can delete, admins included. Undecided. If it is ever added, note that storage has no delete policy either, so images would be orphaned.

**Next:** nothing outstanding. The app is live and in use.


## [2026-08-18] — Pre-deploy: permissions audit + Netlify config
**Permissions, as they actually stand** (checked against `pg_policies`, not from memory):

| | reps (shared login) | admin |
|---|---|---|
| Read tickets | ✅ all | ✅ all |
| Create tickets | ✅ | ✅ |
| Change status | ❌ | ✅ |
| Delete tickets | ❌ | ❌ |

- Reps can **read** every ticket, not only submit — that was the explicit ask ("ok for all users to see all tickets").
- **Nobody can delete**, admins included. There is no DELETE policy on `tickets`, deliberately, since Phase 1. "Admins have full CRUD" is not accurate today; it is CRU.
- There is no relation between reps and tickets. `submitter_name` is a stored string, so a rep cannot be tied back to their own tickets or edit them.
- Storage has no delete policy either, so an image cannot be removed from the app. If ticket deletion is ever added, deleting a row would leave its screenshots behind.

**Hosting changed from Vercel to Netlify** (owner's call). `netlify.toml` now carries the build command, publish directory, Node version pin, and an SPA redirect, so the site is configured by the repo rather than by a form someone filled in once. README documents the deploy.

**Still open before this is usable by the team:**
1. **No reps added** — `reps` is empty, so the "Your name" field is still free text.
2. **No shared rep login exists** — only the admin account (`moshikolee@gmail.com`). Reps have nothing to sign in with.
3. **No CHECK constraints** on `category`, `status` or `priority`. The database would accept `status = 'banana'`; only the UI restricts the values.
4. **Ticket deletion** — not decided.

**Notes:**
- `VITE_*` variables are inlined at **build** time. Setting them in Netlify after a deploy does nothing until a new build runs — a genuinely easy hour to lose.
- The anon key being visible in the deployed bundle is by design. RLS is the boundary. The `service_role` key must never be set in Netlify.

**Next:** deploy to Netlify, then point UptimeRobot at the URL so the free Supabase project doesn't pause after 7 days.


## [2026-08-18] — Phase 6: Rep list, ticket detail view, multiple screenshots
**Asked for:** a proper rep list instead of free-text names, a ticket "card" showing the whole ticket, and more than one image per ticket.

**Did — rep list:**
- `supabase/schema.sql` section 5 — a `reps` table (name, active flag) readable by any signed-in user, writable only from the dashboard.
- `fetchReps()` in `src/lib/tickets.js`; the "Your name" field is now a dropdown of active reps. **If the list is empty the field falls back to free text**, so the form keeps working before any reps are added, and a failed lookup never blocks a ticket.
- The dropdown opens on an empty "Select your name…" option — otherwise the first rep alphabetically gets silently credited with every ticket.

**Did — multiple screenshots:**
- New `screenshot_urls text[]` column on `tickets`, with the existing rows backfilled from `screenshot_url`. An array rather than a `ticket_images` table: a ticket has a handful of images, they are never queried on their own, and an array needs no join, no second set of RLS policies, and no extra insert.
- Up to **4** screenshots per ticket (`MAX_IMAGES`). Each gets its own Fabric canvas, so every image can be annotated separately.
- `src/lib/ticketImages.js` — one helper that reads `screenshot_urls`, falling back to the old `screenshot_url`. No component needs to know that history, and the three existing tickets keep their images.
- Uploads run concurrently (`Promise.all`), so four screenshots don't take four times as long.

**Did — detail view:**
- `src/components/TicketDetail.jsx` — full description with the rep's line breaks intact, every screenshot at full width, all the metadata, and the status control for admins. Clicking a row or its thumbnail opens it; "← Back to queue" returns.
- Board rows show a **count badge** on the thumbnail when a ticket has more than one image.
- The row body is a real `<button>`, so it is keyboard-reachable, styled back down to look like plain text. The status dropdown sits outside it so changing status doesn't also navigate.

**Verified against the live database:**
- Section 5 ran: "Success. No rows returned".
- The backfill is correct — all three existing tickets now report exactly 1 image, and `screenshot_urls[1]` matches the old `screenshot_url` on every row.
- `npm run lint` and `npm run build` clean.
- Not verified by me: the form and detail view with real data, which needs the login.

**👤 MANUAL — add your reps** (until you do, the name field stays free text):
```sql
insert into reps (name) values ('Moses'), ('Dana'), ('Alex');
```

**Test:**
1. Submit tab → "Your name" is a dropdown of the reps you added.
2. Attach 2–3 screenshots at once. Tabs appear (Image 1 / Image 2 …) — draw something different on each, switch between them, and confirm **your marks are still there** when you switch back.
3. "Remove this image" drops one without disturbing the others.
4. Submit → Queue → the row shows a thumbnail with a count badge.
5. Click the row → the detail view opens with the full description and every screenshot, each annotated as you drew it.
6. As admin, change the status from the detail view → go back → the row reflects it.

**Notes:**
- **The canvases stay mounted while hidden.** Switching images uses `hidden`, not unmounting — a Fabric canvas that unmounts loses its drawings, so tabbing between screenshots would have quietly erased the rep's work.
- **Each annotator gets a stable ref, keyed by the File object.** The first version built these inline, which handed the annotator a new object on every render and rebuilt the canvas each time — typing one character in the title field would have wiped every drawing. Caught before it shipped, but it is the kind of bug that looks like nothing in the diff.
- `screenshot_url` still exists on the table for the old rows. It is no longer written to; the app reads `screenshot_urls` only.
- Deactivating a rep (`active = false`) removes them from the dropdown but leaves their name on old tickets, which is why it is a flag rather than a delete.

**Next:** deploy to Vercel + the UptimeRobot ping.


## [2026-08-18] — Phase 5a: Compact board, visible priority, admin-only status changes
**Asked for:** the board was too heavy to manage, priority wasn't visible, and only an admin should be able to change a ticket's status.

**Did — the admin role (enforced in the database, not just hidden in the UI):**
- `supabase/schema.sql` section 4 — a new `admins` table (one row per admin email), a read policy so signed-in users can check it, and an `is_admin()` function. The `tickets` UPDATE policy is replaced: it was `to authenticated using (true)`, it is now `using (is_admin())`.
- No insert/update/delete policy on `admins` — admins are added in the dashboard only, so a rep cannot promote themselves.
- The admin email is **not** committed. It goes in a row, which also means adding an admin later is an INSERT rather than a policy rewrite. This repo is public.
- `src/lib/useIsAdmin.js` — looks the signed-in email up in `admins`. Admins get the status dropdown; everyone else gets a read-only status badge. This is presentation only; the RLS policy is what actually rejects a rep's write.

**Did — the board:**
- `TicketCard` is now a compact row: number, priority badge, title on one line, then submitter/category/date, then the description clamped to two lines. Thumbnail is 56×40 and opens full size in a new tab.
- **Priority now shows on every ticket** — "Urgent" in red, "Normal" in quiet grey. A loud badge on all of them would stop urgent ones from standing out.
- The list is one bordered block with hairline dividers instead of separate floating cards, so the queue reads as something to scan down.
- Status colour moved to a 4px left edge: blue = new, amber = in progress, green = resolved.
- Roughly four tickets now occupy the space that used to hold one and a half.

**👤 MANUAL — required, in this order:**
1. **Re-run `supabase/schema.sql`** (SQL Editor → New query → paste the whole file → Run). It is safe to re-run: tables use `create ... if not exists` and policies are dropped and recreated. No data is lost.
2. **Make yourself the admin:** `insert into admins (email) values ('moshikolee@gmail.com');`
3. **Create the new shared rep login:** Authentication → Users → Add user → Create new user, e.g. `team@yourdomain.com`, tick **Auto Confirm User**. That is the password you give the reps. You keep using your own account to triage.
4. Still open from Phase 2: Authentication → Sign In / Providers → Email → turn **OFF** "Allow new users to sign up."

**Test:**
1. Sign in as yourself → Queue → an **ADMIN** badge appears next to Refresh, and each row has a status dropdown. Change one → it saves.
2. Sign out, sign in as the new rep account → the same tickets are visible, but the status is a **read-only badge** with no dropdown.
3. To prove it is the database enforcing it and not just the UI: as the rep, run this in the browser console — it should fail, not silently succeed.
   ```js
   const { error } = await window.supabase?.from('tickets').update({ status: 'resolved' }).eq('ticket_number', 1)
   ```
   (Or simply trust the policy: `using (is_admin())` rejects the write for any email not in `admins`.)

**Notes:**
- **Why a second account rather than a role flag on the shared one:** with one login the database genuinely cannot tell an admin from a rep — every request carries the same JWT. Two accounts give the JWT something to distinguish, which is what makes `is_admin()` possible at all.
- Reps can read the `admins` table (the app needs it to decide what to render). It contains internal email addresses only.
- The description is clamped with `-webkit-line-clamp`, so the full text is still in the DOM — Phase 6's detail view is where it gets read properly.
- `min-width: 0` on `.ticket-main` is what lets a long title truncate; without it a flex child refuses to shrink below its content and stretches the row.

**Next:** Phase 6 — ticket detail view, then Vercel + UptimeRobot.


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
