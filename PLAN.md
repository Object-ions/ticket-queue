# PLAN.md — Ticket Queue Build Roadmap

Detailed steps per phase. Claude Code executes **one phase at a time** and stops. The owner does the manual Supabase-dashboard steps (marked 👤 MANUAL).

---

## Phase 0 — Repo + tooling

**Goal:** a running empty React app with safe secret handling.

1. Scaffold: `npm create vite@latest . -- --template react`
2. Install deps: `npm install @supabase/supabase-js`
3. Create `.env` (gitignored) and `.env.example` (committed) with:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Create `src/lib/supabase.js` that initializes the client from those env vars.
5. Confirm `.gitignore` excludes `.env`, `node_modules`, `dist`.
6. `npm run dev` shows a placeholder page.

**Done when:** app runs locally, `.env` is NOT tracked by git (`git status` proves it).

---

## Phase 1 — Supabase backend

**Goal:** the database + storage the app will talk to.

👤 MANUAL (owner does these in supabase.com):
1. Create a new Supabase project (free tier). Copy the Project URL + anon key into `.env`.
2. Open the SQL Editor and run the schema below.
3. Create a Storage bucket named `ticket-screenshots`, set it to **public**.

**SQL to run:**
```sql
create table tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number int generated always as identity,
  created_at timestamptz default now(),
  submitter_name text not null,
  title text not null,
  description text,
  category text default 'other',
  priority text default 'normal',
  status text default 'new',
  screenshot_url text
);

alter table tickets enable row level security;

-- Shared internal tool: any signed-in user can read/write all tickets.
create policy "authenticated can read"   on tickets for select using (auth.role() = 'authenticated');
create policy "authenticated can insert" on tickets for insert with check (auth.role() = 'authenticated');
create policy "authenticated can update" on tickets for update using (auth.role() = 'authenticated');
```

**Done when:** the table + bucket exist and the anon key is in `.env`.

---

## Phase 2 — Shared team login

**Goal:** nobody sees the queue without signing in.

👤 MANUAL: in Supabase → Authentication → Users, create ONE user (e.g. `team@switchcase...`) with a password. This is the shared login.

Claude Code builds:
1. A `Login` component (email + password → `supabase.auth.signInWithPassword`).
2. Session persistence (Supabase does this automatically; wire up `onAuthStateChange`).
3. Gate: if no session, show Login; if session, show the app.
4. A Sign out button somewhere small.

**Done when:** you must log in to see anything; refresh keeps you logged in.

---

## Phase 3 — Submit form (no drawing yet)

**Goal:** a working ticket submission, plain image upload.

Fields: **Your name** (dropdown or text), Title, Description, Category (dropdown), Priority (normal/urgent), Screenshot (file input).

Flow: fill form → upload file to `ticket-screenshots` → insert a `tickets` row with the returned `screenshot_url` → show a success message with the ticket number.

**Done when:** submitting creates a row you can see in the Supabase table editor, with the image in the bucket.

---

## Phase 4 — Image annotation (Fabric.js)

**Goal:** let reps draw on the screenshot before submitting.

1. Install: `npm install fabric`
2. When a rep selects an image, render it onto a Fabric.js canvas.
3. Toolbar: freehand pen, arrow, rectangle/box, highlighter, undo, clear.
4. On submit: flatten canvas → export as PNG (`canvas.toDataURL`) → upload THAT to Storage instead of the raw file.
5. Touch support so it works on tablets/phones.

**Done when:** a rep can draw a red box on a screenshot and the saved image shows the box.

---

## Phase 5 — Queue board

**Goal:** the admin's triage view + rep visibility.

1. Fetch all tickets, newest first.
2. Card/row per ticket: number, title, submitter, category, priority, status, thumbnail.
3. Filter by status (New / In Progress / Resolved / All).
4. Status control: change a ticket's status inline (updates the row).
5. (Nice-to-have) live updates via Supabase Realtime so the board refreshes itself.

**Done when:** you can see every ticket, filter them, and move one from New → In Progress → Resolved.

---

## Phase 6 — Detail view + deploy

1. Click a ticket → detail view: full description, full-size annotated screenshot, metadata.
2. Deploy to Vercel (connect the GitHub repo, add the two env vars in Vercel settings).
3. Set up a free UptimeRobot HTTP monitor on the Vercel URL (pings keep Supabase from pausing after 7 idle days).

**Done when:** the app is live at a URL, reps can reach it, and the uptime monitor is running.

---

## Explicit v2 backlog (do NOT build now)

- Comment thread per ticket
- Email/SMS notification on status change
- Search
- Per-rep individual logins + assignment
- Categories tied dynamically to GHL issue types
