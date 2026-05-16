-- Verified Library: curated, hand-approved songs + their canonical vocabulary.
--
-- This migration:
--   1. Adds verification metadata + display fields to `songs`.
--   2. Rewrites `songs` RLS: verified songs are PUBLIC (no auth needed),
--      drafts/unverified are visible only to the curator.
--   3. Opens `words` to public read (so anonymous library visitors can see
--      word breakdowns without signing in).
--   4. Adds `song_words` — a link table from verified songs to the words
--      that appear in them. Distinct from `word_encounters` (which tracks
--      per-user history); this is the canonical library mapping.
--   5. Updates curator policies to recognise either mondweep@gmail.com or
--      mondweep@dxsure.uk as the verification-allowed account.

------------------------------------------------------------
-- 1. songs additions
------------------------------------------------------------
alter table public.songs
  add column if not exists verified              boolean      not null default false,
  add column if not exists verified_at           timestamptz,
  add column if not exists verified_by           uuid         references auth.users(id) on delete set null,
  add column if not exists thumbnail_url         text,
  add column if not exists duration_seconds      int,
  add column if not exists transcription_language text;

create index if not exists idx_songs_verified
  on public.songs (verified, cached_at desc);

------------------------------------------------------------
-- 2. songs RLS — public read of verified, curator full access
------------------------------------------------------------
drop policy if exists "Authenticated users can read songs"   on public.songs;
drop policy if exists "Authenticated users can insert songs" on public.songs;
drop policy if exists "Service role can manage songs"        on public.songs;
drop policy if exists "Public can read verified songs"       on public.songs;
drop policy if exists "Curator can manage songs"             on public.songs;

create policy "Public can read verified songs" on public.songs
  for select
  using (verified = true);

create policy "Curator can manage songs" on public.songs
  for all
  using (
    (auth.jwt() ->> 'email') in ('mondweep@gmail.com', 'mondweep@dxsure.uk')
  )
  with check (
    (auth.jwt() ->> 'email') in ('mondweep@gmail.com', 'mondweep@dxsure.uk')
  );

------------------------------------------------------------
-- 3. words — open to public read for library browsing
------------------------------------------------------------
drop policy if exists "Authenticated users can read words" on public.words;
drop policy if exists "Public can read words"              on public.words;
drop policy if exists "Curator can manage words"           on public.words;

create policy "Public can read words" on public.words
  for select
  using (true);

create policy "Curator can manage words" on public.words
  for all
  using (
    (auth.jwt() ->> 'email') in ('mondweep@gmail.com', 'mondweep@dxsure.uk')
  )
  with check (
    (auth.jwt() ->> 'email') in ('mondweep@gmail.com', 'mondweep@dxsure.uk')
  );

-- Keep service role access intact (backend writes use service_role key).
create policy "Service role can manage words" on public.words
  for all
  using (auth.role() = 'service_role');

------------------------------------------------------------
-- 4. song_words — canonical library mapping
------------------------------------------------------------
create table if not exists public.song_words (
  song_id     uuid not null references public.songs(id) on delete cascade,
  word_id     uuid not null references public.words(id) on delete cascade,
  line_number int  not null,
  primary key (song_id, word_id, line_number)
);

create index if not exists idx_song_words_song on public.song_words(song_id);
create index if not exists idx_song_words_word on public.song_words(word_id);

alter table public.song_words enable row level security;

drop policy if exists "Public can read song_words for verified songs" on public.song_words;
drop policy if exists "Curator can manage song_words"                 on public.song_words;
drop policy if exists "Service role can manage song_words"            on public.song_words;

create policy "Public can read song_words for verified songs" on public.song_words
  for select
  using (
    exists (
      select 1 from public.songs s where s.id = song_id and s.verified = true
    )
  );

create policy "Curator can manage song_words" on public.song_words
  for all
  using (
    (auth.jwt() ->> 'email') in ('mondweep@gmail.com', 'mondweep@dxsure.uk')
  )
  with check (
    (auth.jwt() ->> 'email') in ('mondweep@gmail.com', 'mondweep@dxsure.uk')
  );

create policy "Service role can manage song_words" on public.song_words
  for all
  using (auth.role() = 'service_role');

------------------------------------------------------------
-- 5. Convenience view: library_words — every distinct word
--    that appears in any verified song, joined to its base
--    dictionary entry. Used by the /revise prepopulate flow
--    and the library word-browser UI.
------------------------------------------------------------
create or replace view public.library_words as
  select distinct w.*
  from public.words w
  join public.song_words sw on sw.word_id = w.id
  join public.songs      s  on s.id      = sw.song_id
  where s.verified = true;
