-- Global Sanskrit word dictionary
create table if not exists public.words (
  id uuid default gen_random_uuid() primary key,
  devanagari text not null,
  iast text not null,
  root_dhatu text,
  meaning_short text not null,
  meaning_full text,
  category text,
  created_at timestamptz default now() not null,
  unique(devanagari, iast)
);

-- Anyone authenticated can read words
alter table public.words enable row level security;
create policy "Authenticated users can read words" on public.words
  for select using (auth.role() = 'authenticated');
-- Service role can insert/update words (done by backend)
create policy "Service role can manage words" on public.words
  for all using (auth.role() = 'service_role');

create index idx_words_devanagari on public.words(devanagari);
create index idx_words_iast on public.words(iast);
