-- Migration 013: curator allowlist as data, not as code
--
-- Before this migration the curator email list was hardcoded in three
-- places: backend routes (songs/songRequests/feedback), the frontend
-- useCurator hook, and SQL RLS policies. Adding a new curator meant
-- editing all four and shipping a release.
--
-- After this migration the list lives in `curator_allowlist`. A
-- SECURITY DEFINER function `is_curator()` checks it from SQL (used by
-- the rewritten RLS policies on songs, song_requests, feedback). An RPC
-- `am_i_curator()` lets the frontend query "is the signed-in user a
-- curator?" without exposing the full list to non-curators.
--
-- Accepting a curator_application via PATCH /api/feedback now inserts
-- the applicant's email here automatically (server-side), which is the
-- end of the manual-allowlist-editing workflow.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Table
-- ─────────────────────────────────────────────────────────────────────

create table if not exists curator_allowlist (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  display_name    text,
  granted_via     text not null default 'manual'
    check (granted_via in ('seed', 'application', 'manual')),
  application_id  uuid,  -- references feedback(id); not FK to avoid coupling
  notes           text,
  added_at        timestamptz not null default now(),
  added_by        uuid references auth.users (id) on delete set null
);

-- Force email lowercase on insert/update so lookups are case-insensitive.
create or replace function lower_curator_email_trigger() returns trigger
language plpgsql
as $$
begin
  new.email := lower(new.email);
  return new;
end;
$$;

drop trigger if exists lower_curator_email on curator_allowlist;
create trigger lower_curator_email
  before insert or update on curator_allowlist
  for each row execute function lower_curator_email_trigger();

-- ─────────────────────────────────────────────────────────────────────
-- 2. Seed the current curators (idempotent on re-run)
-- ─────────────────────────────────────────────────────────────────────

insert into curator_allowlist (email, display_name, granted_via)
values
  ('mondweep@gmail.com', 'Mondweep Chakravorty', 'seed'),
  ('mondweep@dxsure.uk', 'Mondweep Chakravorty', 'seed')
on conflict (email) do nothing;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Helper function — bypasses RLS to check membership without
--    leaking the full list to non-curators.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.is_curator(check_email text default null)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.curator_allowlist
    where email = lower(coalesce(check_email, (auth.jwt() ->> 'email')::text))
  );
$$;

revoke all on function public.is_curator(text) from public;
grant execute on function public.is_curator(text) to anon, authenticated, service_role;

-- Convenience RPC for the frontend — "am I, the signed-in user, a curator?"
-- Returns just a boolean; doesn't leak the membership of the table.
create or replace function public.am_i_curator()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_curator();
$$;

revoke all on function public.am_i_curator() from public;
grant execute on function public.am_i_curator() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. RLS on the allowlist itself
-- ─────────────────────────────────────────────────────────────────────

alter table curator_allowlist enable row level security;

-- Curators can read, add, remove other curators. The is_curator() check
-- bypasses RLS internally (SECURITY DEFINER) so this isn't a chicken-and-
-- egg cycle for existing curators.
drop policy if exists "Curators manage allowlist" on curator_allowlist;
create policy "Curators manage allowlist"
  on curator_allowlist
  for all
  to authenticated
  using (is_curator())
  with check (is_curator());

drop policy if exists "Service role manages allowlist" on curator_allowlist;
create policy "Service role manages allowlist"
  on curator_allowlist
  for all
  to service_role
  using (true)
  with check (true);

-- ─────────────────────────────────────────────────────────────────────
-- 5. Rewrite existing curator-gated RLS to use is_curator()
-- ─────────────────────────────────────────────────────────────────────
-- Each policy is dropped and recreated with the function call replacing
-- the hardcoded ('mondweep@gmail.com','mondweep@dxsure.uk') literal.

-- songs (from migrations 007 / 010)
drop policy if exists "Curator can manage songs" on songs;
create policy "Curator can manage songs"
  on songs
  for all
  to authenticated
  using (is_curator())
  with check (is_curator());

-- song_requests (from migration 011)
drop policy if exists "Curator can read song requests" on song_requests;
create policy "Curator can read song requests"
  on song_requests
  for select
  to authenticated
  using (is_curator());

drop policy if exists "Curator can update song requests" on song_requests;
create policy "Curator can update song requests"
  on song_requests
  for update
  to authenticated
  using (is_curator());

-- feedback (from migration 012)
drop policy if exists "Curator can read feedback" on feedback;
create policy "Curator can read feedback"
  on feedback
  for select
  to authenticated
  using (is_curator());

drop policy if exists "Curator can update feedback" on feedback;
create policy "Curator can update feedback"
  on feedback
  for update
  to authenticated
  using (is_curator());

-- pending_candidates (from migration 009)
-- If the policy from 009 used the same hardcoded literal, this is a no-op
-- if the policy doesn't exist. Otherwise it switches to is_curator().
drop policy if exists "Curator can read pending candidates" on pending_candidates;
create policy "Curator can read pending candidates"
  on pending_candidates
  for select
  to authenticated
  using (is_curator());

drop policy if exists "Curator can update pending candidates" on pending_candidates;
create policy "Curator can update pending candidates"
  on pending_candidates
  for update
  to authenticated
  using (is_curator());

-- Reload PostgREST.
notify pgrst, 'reload schema';
