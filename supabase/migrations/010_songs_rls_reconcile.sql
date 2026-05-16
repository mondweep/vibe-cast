-- Migration 010: reconcile RLS policies on public.songs.
--
-- Background: earlier migrations + a snake-cased policy draft that was
-- run from chat (songs_curator_full, songs_public_read) left the
-- songs table with 5–6 overlapping policies, including two conflicting
-- public-read policies. The wider `songs_public_read` (verified=true
-- only) effectively defeated migration 009's `pending_curator_review`
-- gate.
--
-- This migration:
--   1. Drops every known historical policy on songs (idempotent).
--   2. Re-creates exactly three policies: curator-full, public-verified,
--      service-role-full. Same shape as 007 intended.
--
-- After this migration: auto-added songs (pending_curator_review=true)
-- are hidden from public /library until promoted, and only the curator
-- email or service-role can write.

------------------------------------------------------------
-- 1. drop every historical policy on songs (safe — idempotent)
------------------------------------------------------------
drop policy if exists "Authenticated users can read songs"   on public.songs;
drop policy if exists "Authenticated users can insert songs" on public.songs;
drop policy if exists "Service role can manage songs"        on public.songs;
drop policy if exists "Public can read verified songs"       on public.songs;
drop policy if exists "Curator can manage songs"             on public.songs;
drop policy if exists "songs_curator_full"                   on public.songs;
drop policy if exists "songs_public_read"                    on public.songs;

------------------------------------------------------------
-- 2. recreate the canonical three
------------------------------------------------------------

-- anonymous + signed-in non-curators see only fully public verified songs
create policy "Public can read verified songs" on public.songs
  for select
  using (verified = true and pending_curator_review = false);

-- curator account has full read/write across all rows (including drafts
-- and auto-added rows in their 24-hour review window)
create policy "Curator can manage songs" on public.songs
  for all
  using  ((auth.jwt() ->> 'email') in ('mondweep@gmail.com', 'mondweep@dxsure.uk'))
  with check ((auth.jwt() ->> 'email') in ('mondweep@gmail.com', 'mondweep@dxsure.uk'));

-- service role (used by the backend transcribe→translate→verify path) keeps
-- unconditional access
create policy "Service role can manage songs" on public.songs
  for all
  using (auth.role() = 'service_role');

notify pgrst, 'reload schema';
