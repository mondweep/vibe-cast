create table if not exists public.word_encounters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  word_id uuid references public.words(id) on delete cascade not null,
  song_id uuid not null,
  line_number int not null,
  encountered_at timestamptz default now() not null,
  looked_up boolean default false not null
);

alter table public.word_encounters enable row level security;
create policy "Users can manage own encounters" on public.word_encounters
  for all using (auth.uid() = user_id);

create index idx_encounters_user on public.word_encounters(user_id);
create index idx_encounters_song on public.word_encounters(song_id);
create index idx_encounters_word on public.word_encounters(word_id);
