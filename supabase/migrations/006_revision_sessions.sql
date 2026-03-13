create table if not exists public.revision_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  started_at timestamptz default now() not null,
  ended_at timestamptz,
  mode text not null check (mode in ('flashcard', 'audio', 'matching', 'sentence')),
  words_reviewed int default 0 not null,
  words_correct int default 0 not null,
  words_incorrect int default 0 not null
);

alter table public.revision_sessions enable row level security;
create policy "Users can manage own sessions" on public.revision_sessions
  for all using (auth.uid() = user_id);

create index idx_revision_user on public.revision_sessions(user_id);
