-- ============================================================
-- Ticket Queue — database schema
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Kept in the repo so the database is reproducible, not just "whatever we
-- clicked in the dashboard that one time".
-- ============================================================


-- ------------------------------------------------------------
-- 1. The tickets table
-- ------------------------------------------------------------
create table if not exists tickets (
  -- Internal primary key. Random UUID so IDs are unguessable.
  id uuid primary key default gen_random_uuid(),

  -- Human-readable counter (#1, #2, #3...). Postgres fills this in for us.
  -- This is what reps and the admin actually say out loud.
  ticket_number int generated always as identity,

  created_at timestamptz default now(),

  -- Login is shared across the whole team, so the database cannot tell reps
  -- apart. This field is how a ticket gets attributed to a person — it comes
  -- from the "Your name" field on the submit form.
  submitter_name text not null,

  title text not null,
  description text,

  -- One of: sms_delivery, ai_agent, pipeline, data, other
  category text default 'other',

  -- 'normal' or 'urgent'
  priority text default 'normal',

  -- 'new' | 'in_progress' | 'resolved'
  status text default 'new',

  -- Public URL of the annotated screenshot in Storage. Nullable — a ticket
  -- does not have to have an image.
  screenshot_url text
);


-- ------------------------------------------------------------
-- 2. Row Level Security on the tickets table
-- ------------------------------------------------------------
-- RLS is the actual security boundary of this app. The anon key ships inside
-- the browser bundle and anyone can read it, so "who can do what" has to be
-- decided by the database, not by keeping a key secret.
--
-- With RLS enabled and no matching policy, every row is invisible and every
-- write is rejected — including to someone holding the anon key. The policies
-- below then grant access back, but only to requests carrying a valid login.
alter table tickets enable row level security;

-- `to authenticated` means: this policy only applies to a request whose JWT
-- says it is signed in. A logged-out visitor never matches, so they see
-- nothing. Once signed in (Phase 2), `using (true)` lets them see every row —
-- correct here, because this is a shared internal queue where the whole team
-- is meant to see the whole board.
drop policy if exists "authenticated can read tickets" on tickets;
create policy "authenticated can read tickets"
  on tickets for select
  to authenticated
  using (true);

-- INSERT policies use `with check` instead of `using`: `using` filters rows
-- that already exist, `with check` validates the row being written.
drop policy if exists "authenticated can insert tickets" on tickets;
create policy "authenticated can insert tickets"
  on tickets for insert
  to authenticated
  with check (true);

-- UPDATE (moving a ticket New -> In Progress -> Resolved) is granted in
-- section 4 below, to admins only. The original version of this file granted it
-- to every signed-in user; that policy is dropped there.
drop policy if exists "authenticated can update tickets" on tickets;

-- Note: there is deliberately NO delete policy. Nobody can delete a ticket
-- from the app. Removing one is a manual action in the dashboard.


-- ------------------------------------------------------------
-- 3. Storage policies for the screenshot bucket
-- ------------------------------------------------------------
-- Create the bucket in the dashboard first (Storage -> New bucket ->
-- name: ticket-screenshots, Public: ON), then run this.
--
-- Marking a bucket "public" only makes READING a file public. UPLOADING is
-- still blocked by RLS on the storage.objects table until a policy allows it.
-- Without the policy below, the Phase 3 upload fails with "new row violates
-- row-level security policy".
drop policy if exists "authenticated can upload screenshots" on storage.objects;
create policy "authenticated can upload screenshots"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ticket-screenshots');

-- Lets a signed-in user overwrite/replace a file they just uploaded.
drop policy if exists "authenticated can update screenshots" on storage.objects;
create policy "authenticated can update screenshots"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'ticket-screenshots');

-- Read access: deliberately NOT granted here.
--
-- An earlier version of this file created a broad SELECT policy on
-- storage.objects so the app could list the bucket. Supabase's own advisor
-- flagged it, correctly: a public bucket already serves every file over its
-- public URL, so the policy added nothing we use — but it did let anyone
-- holding the anon key LIST the bucket and walk every screenshot ever
-- uploaded. The filenames are random UUIDs precisely so they can't be guessed;
-- a listing policy hands out the whole list and undoes that.
--
-- The app never lists the bucket. It stores each file's public URL on the
-- ticket row and reads it from there.
drop policy if exists "anyone can read screenshots" on storage.objects;


-- ============================================================
-- 4. Admin role (added after Phase 5)
-- ============================================================
-- Everyone signs in with the same shared account, so the database cannot tell
-- one rep from another. The one distinction we do need is admin vs rep: any
-- signed-in person may READ every ticket, but only an admin may change a
-- ticket's status.
--
-- That is done with a second account. The reps share one login; the admin has
-- their own. This table lists which email addresses count as admins.
--
-- Why a table instead of hardcoding the email in the policy below: this repo is
-- public. Keeping the address in a row means it is never committed, and adding
-- or removing an admin later is an INSERT rather than a policy rewrite.
create table if not exists admins (
  email text primary key,
  added_at timestamptz default now()
);

alter table admins enable row level security;

-- Signed-in users can read this list. The app needs it to decide whether to
-- show the status dropdown at all — showing a control that the database will
-- reject is worse than not showing it.
drop policy if exists "authenticated can read admins" on admins;
create policy "authenticated can read admins"
  on admins for select
  to authenticated
  using (true);

-- No insert/update/delete policy: admins are added in the Supabase dashboard,
-- never from the app. A rep cannot promote themselves.

-- `auth.jwt() ->> 'email'` is the email on the caller's login token. The
-- function is the single definition of "is this caller an admin", so the policy
-- below and any future one cannot drift apart.
create or replace function is_admin()
  returns boolean
  language sql
  stable
as $$
  select exists (
    select 1 from admins where email = auth.jwt() ->> 'email'
  );
$$;

-- Replaces the Phase 1 policy that let ANY signed-in user change a status
-- (dropped in section 2).
drop policy if exists "admins can update tickets" on tickets;
create policy "admins can update tickets"
  on tickets for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- 👤 MANUAL, run once with your own address (not committed here, because this
-- repo is public):
--   insert into admins (email) values ('you@example.com');
