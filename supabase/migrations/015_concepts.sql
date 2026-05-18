-- Migration 015: concept layer + word-to-concept mapping
--
-- Adds a second layer above the dictionary: ~20-30 broad concepts (e.g.
-- "Forms of Vishnu", "Cosmology", "Yoga & Meditation", "Devotion",
-- "Sacrifice & Yajña") that each cover 30-50+ words. Lets the Library
-- and /play surface a knowledge graph instead of a flat name-list.
--
-- Concepts attach to the global `words` table (not per-song), so the
-- same Sanskrit term has the same concept memberships in every song
-- it appears in. A word can belong to multiple concepts (soft membership
-- via `weight`) — e.g. "Acyuta" belongs to "Forms of Vishnu" and also
-- "Eternity / Imperishability".
--
-- Population is one-off, run from the curator's laptop via
-- scripts/cluster_concepts.ts. Re-run when enough new songs land.

------------------------------------------------------------
-- 1. concepts table
------------------------------------------------------------
create table if not exists public.concepts (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique,
  label         text        not null,
  summary       text,
  color         text,              -- hex (e.g. '#5B7FFF'); optional for graph styling
  display_order int         not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_concepts_display_order
  on public.concepts(display_order, label);

alter table public.concepts enable row level security;

drop policy if exists "Public can read concepts" on public.concepts;
drop policy if exists "Curator can manage concepts" on public.concepts;
drop policy if exists "Service role can manage concepts" on public.concepts;

create policy "Public can read concepts" on public.concepts
  for select using (true);

create policy "Curator can manage concepts" on public.concepts
  for all using (public.is_curator()) with check (public.is_curator());

create policy "Service role can manage concepts" on public.concepts
  for all using (auth.role() = 'service_role');

------------------------------------------------------------
-- 2. word_concepts — many-to-many join with soft weight
------------------------------------------------------------
create table if not exists public.word_concepts (
  word_id    uuid        not null references public.words(id) on delete cascade,
  concept_id uuid        not null references public.concepts(id) on delete cascade,
  weight     real        not null default 1.0,        -- 1.0 = full membership; lower = secondary
  created_at timestamptz not null default now(),
  primary key (word_id, concept_id)
);

create index if not exists idx_word_concepts_word    on public.word_concepts(word_id);
create index if not exists idx_word_concepts_concept on public.word_concepts(concept_id);

alter table public.word_concepts enable row level security;

drop policy if exists "Public can read word_concepts" on public.word_concepts;
drop policy if exists "Curator can manage word_concepts" on public.word_concepts;
drop policy if exists "Service role can manage word_concepts" on public.word_concepts;

create policy "Public can read word_concepts" on public.word_concepts
  for select using (true);

create policy "Curator can manage word_concepts" on public.word_concepts
  for all using (public.is_curator()) with check (public.is_curator());

create policy "Service role can manage word_concepts" on public.word_concepts
  for all using (auth.role() = 'service_role');

------------------------------------------------------------
-- 3. Convenience view: song_concepts
--    Lists which concepts appear in each verified song, with
--    a `word_count` showing how strongly each concept shows up.
--    Used by /play side panel and /api/songs/:videoId/concepts.
------------------------------------------------------------
create or replace view public.song_concepts as
  select
    s.id                              as song_id,
    s.youtube_url                     as youtube_url,
    c.id                              as concept_id,
    c.slug                            as concept_slug,
    c.label                           as concept_label,
    c.color                           as concept_color,
    count(distinct sw.word_id)        as word_count
  from public.songs       s
  join public.song_words  sw on sw.song_id    = s.id
  join public.word_concepts wc on wc.word_id  = sw.word_id
  join public.concepts    c  on c.id          = wc.concept_id
  where s.verified = true
  group by s.id, s.youtube_url, c.id, c.slug, c.label, c.color;

-- Reload PostgREST so the new columns/views are visible immediately.
notify pgrst, 'reload schema';
