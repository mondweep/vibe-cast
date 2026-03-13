create table if not exists public.user_vocabulary (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  word_id uuid references public.words(id) on delete cascade not null,
  encounter_count int default 1 not null,
  first_seen_at timestamptz default now() not null,
  last_seen_at timestamptz default now() not null,
  familiarity float default 0.0 not null check (familiarity >= 0.0 and familiarity <= 1.0),
  marked_learned boolean default false not null,
  marked_revision boolean default false not null,
  srs_interval int default 1 not null,
  srs_ease_factor float default 2.5 not null,
  srs_next_review timestamptz default now() not null,
  unique(user_id, word_id)
);

alter table public.user_vocabulary enable row level security;
create policy "Users can manage own vocabulary" on public.user_vocabulary
  for all using (auth.uid() = user_id);

create index idx_user_vocab_user on public.user_vocabulary(user_id);
create index idx_user_vocab_familiarity on public.user_vocabulary(user_id, familiarity);
create index idx_user_vocab_srs on public.user_vocabulary(user_id, srs_next_review);
