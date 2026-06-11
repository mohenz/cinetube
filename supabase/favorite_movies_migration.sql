create table if not exists public.favorite_movies (
  id bigint generated always as identity primary key,
  user_key text not null default 'local',
  content_type text not null check (content_type in ('movie', 'webtoon')),
  content_id text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_key, content_type, content_id)
);

create index if not exists idx_favorite_movies_user_content
  on public.favorite_movies(user_key, content_type, created_at desc);

create index if not exists idx_favorite_movies_content
  on public.favorite_movies(content_type, content_id);

alter table public.favorite_movies enable row level security;

drop policy if exists "public read favorite movies" on public.favorite_movies;
drop policy if exists "write favorite movies" on public.favorite_movies;

create policy "public read favorite movies" on public.favorite_movies
for select using (true);

create policy "write favorite movies" on public.favorite_movies
for all using (true) with check (true);
