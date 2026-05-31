-- CineHub Supabase schema for CineTube.
-- Apply after checking whether tables with the same names already exist.

create table if not exists public.categories (
  category_code text primary key,
  name text not null,
  representative_image_url text,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.actors (
  id bigint generated always as identity primary key,
  name text not null,
  age integer,
  height_cm integer,
  body_size text,
  debut_year integer,
  representative_image_url text,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.rating_grades (
  grade text primary key,
  display_order integer not null
);

create table if not exists public.movies (
  id bigint generated always as identity primary key,
  title text not null,
  movie_code text not null unique,
  category_code text references public.categories(category_code) on update cascade on delete set null,
  actor_id bigint references public.actors(id) on update cascade on delete set null,
  keywords text[] not null default '{}',
  rating_grade text references public.rating_grades(grade) on update cascade on delete set null,
  video_url text,
  description text,
  poster_url text,
  capture_url text,
  snapshot_url text,
  release_month text,
  production_company text,
  recommendation_score integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_movies_category_code on public.movies(category_code);
create index if not exists idx_movies_actor_id on public.movies(actor_id);
create index if not exists idx_movies_rating_grade on public.movies(rating_grade);
create index if not exists idx_movies_created_at on public.movies(created_at desc);
create index if not exists idx_movies_recommendation_score on public.movies(recommendation_score desc);

insert into public.rating_grades (grade, display_order)
values ('A+', 1), ('A', 2), ('B+', 3), ('B', 4), ('C', 5)
on conflict (grade) do update set display_order = excluded.display_order;

alter table public.categories enable row level security;
alter table public.actors enable row level security;
alter table public.rating_grades enable row level security;
alter table public.movies enable row level security;

drop policy if exists "public read categories" on public.categories;
drop policy if exists "public read actors" on public.actors;
drop policy if exists "public read rating grades" on public.rating_grades;
drop policy if exists "public read movies" on public.movies;

create policy "public read categories" on public.categories for select using (true);
create policy "public read actors" on public.actors for select using (true);
create policy "public read rating grades" on public.rating_grades for select using (true);
create policy "public read movies" on public.movies for select using (true);

-- For production, connect the admin screens to Supabase Auth and keep writes authenticated.
drop policy if exists "authenticated write categories" on public.categories;
drop policy if exists "authenticated write actors" on public.actors;
drop policy if exists "authenticated write rating grades" on public.rating_grades;
drop policy if exists "authenticated write movies" on public.movies;

create policy "authenticated write categories" on public.categories for all to authenticated using (true) with check (true);
create policy "authenticated write actors" on public.actors for all to authenticated using (true) with check (true);
create policy "authenticated write rating grades" on public.rating_grades for all to authenticated using (true) with check (true);
create policy "authenticated write movies" on public.movies for all to authenticated using (true) with check (true);
