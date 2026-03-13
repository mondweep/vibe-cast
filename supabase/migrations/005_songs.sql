create table if not exists public.songs (
  id uuid default gen_random_uuid() primary key,
  youtube_url text unique not null,
  title text,
  lyrics_json jsonb,
  cached_at timestamptz default now() not null
);

alter table public.songs enable row level security;
create policy "Authenticated users can read songs" on public.songs
  for select using (auth.role() = 'authenticated');
create policy "Service role can manage songs" on public.songs
  for all using (auth.role() = 'service_role');

-- Also allow authenticated users to insert (for caching after translation)
create policy "Authenticated users can insert songs" on public.songs
  for insert with check (auth.role() = 'authenticated');

create index idx_songs_url on public.songs(youtube_url);
