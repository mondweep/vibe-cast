-- Chat messages table for storing AI tutor interactions
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for user queries
create index if not exists chat_messages_user_id_idx on public.chat_messages(user_id);
create index if not exists chat_messages_created_at_idx on public.chat_messages(created_at);

-- Enable RLS (Row Level Security)
alter table public.chat_messages enable row level security;

-- Policy: Users can only read/write their own messages
create policy "Users can read their own messages" on public.chat_messages
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own messages" on public.chat_messages
  for insert
  with check (auth.uid() = user_id);
