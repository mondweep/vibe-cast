-- Migration 018: kanban_items + kanban_votes
--
-- Phase 1 of KAN-001 (see KANBAN.md). Promotes the previously-markdown-only
-- Kanban into a Supabase-backed table so we can expose it on a public
-- /roadmap page and let authenticated users up-vote backlog items.
--
-- Design (decided 2026-05-19 with the curator):
--   * DB is the source of truth. KANBAN.md is regenerated periodically from
--     the DB as a git-history mirror — never edited by hand to push changes.
--   * Public /roadmap UI is VIEW-ONLY. No in-app admin form. The curator
--     edits items via Cowork (Claude updates rows on demand). Plenty of
--     ergonomics there since this conversation is the workflow.
--   * Authenticated users can vote on items (one vote per (item, user)).
--     Anonymous visitors see counts but can't vote — same pattern as
--     song_likes from migration 017.
--
-- `status` (NOT `column` — that's a reserved word) maps to Kanban lanes:
-- 'backlog' → ideas not yet started; 'in_progress' → actively being built;
-- 'done' → shipped. Display in that order on /roadmap.

-- ---------------------------------------------------------------------------
-- kanban_items
-- ---------------------------------------------------------------------------
create table if not exists kanban_items (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,           -- 'ENG-001', 'KAN-001', etc.
  title         text not null,
  summary       text not null,                  -- one-line shown on card
  body          text,                           -- markdown, full description
  status        text not null default 'backlog'
    check (status in ('backlog', 'in_progress', 'done')),
  display_order int  not null default 0,        -- manual sort within a lane
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Common read paths: list by lane sorted by display_order then created_at.
create index if not exists kanban_items_status_idx
  on kanban_items (status, display_order, created_at);

-- ---------------------------------------------------------------------------
-- kanban_votes (one row per (item, user) — twin of song_likes)
-- ---------------------------------------------------------------------------
create table if not exists kanban_votes (
  item_id    uuid not null references kanban_items (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

create index if not exists kanban_votes_item_idx on kanban_votes (item_id);
create index if not exists kanban_votes_user_idx on kanban_votes (user_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table kanban_items enable row level security;
alter table kanban_votes enable row level security;

-- Items: anyone reads (the whole point — it's a public roadmap).
drop policy if exists "Anyone reads kanban items" on kanban_items;
create policy "Anyone reads kanban items"
  on kanban_items
  for select
  to anon, authenticated
  using (true);

-- Items: only curators can write. The public UI is view-only by design;
-- the curator edits via Cowork (which uses the service role), but this
-- policy keeps the door closed for direct anon/auth API writes.
drop policy if exists "Curator manages kanban items" on kanban_items;
create policy "Curator manages kanban items"
  on kanban_items
  for all
  to authenticated
  using (
    coalesce(lower((auth.jwt() ->> 'email')::text), '') in
      (select lower(email) from curator_allowlist)
  )
  with check (
    coalesce(lower((auth.jwt() ->> 'email')::text), '') in
      (select lower(email) from curator_allowlist)
  );

-- Votes: anyone reads (we expose aggregate counts publicly).
drop policy if exists "Anyone reads kanban votes" on kanban_votes;
create policy "Anyone reads kanban votes"
  on kanban_votes
  for select
  to anon, authenticated
  using (true);

-- Votes: authenticated users may insert / delete their own row only.
drop policy if exists "Authed users vote" on kanban_votes;
create policy "Authed users vote"
  on kanban_votes
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Authed users unvote" on kanban_votes;
create policy "Authed users unvote"
  on kanban_votes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Service role bypasses RLS by default; be explicit so Cowork-driven
-- curator edits + any future seed scripts always work.
drop policy if exists "Service role manages kanban items" on kanban_items;
create policy "Service role manages kanban items"
  on kanban_items
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role manages kanban votes" on kanban_votes;
create policy "Service role manages kanban votes"
  on kanban_votes
  for all
  to service_role
  using (true)
  with check (true);

-- updated_at trigger: keep the row's timestamp accurate without forcing
-- every writer to set it manually.
create or replace function tg_kanban_items_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kanban_items_set_updated_at on kanban_items;
create trigger kanban_items_set_updated_at
  before update on kanban_items
  for each row
  execute function tg_kanban_items_set_updated_at();

notify pgrst, 'reload schema';
