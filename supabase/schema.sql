-- CineHub Supabase Clean Schema for CineTube.
-- WARNING: Running this script will DROP all existing tables and recreate them from scratch.

-- 1. Drop existing tables in correct dependency order
drop table if exists public.movies;
drop table if exists public.categories;
drop table if exists public.actors;
drop table if exists public.rating_grades;
drop table if exists public.media_assets;

-- 2. Create media_assets table first (so other tables can reference it directly)
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null default 'cinetube-images',
  object_path text not null unique,
  public_url text not null,
  original_name text,
  mime_type text,
  size_bytes bigint,
  owner_table text not null,
  owner_field text not null,
  owner_id text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Create categories table
create table public.categories (
  category_code text primary key,
  name text not null,
  representative_image_url text,
  representative_image_asset_id uuid references public.media_assets(id) on delete set null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. Create actors table
create table public.actors (
  id bigint generated always as identity primary key,
  name text not null,
  age integer,
  height_cm integer,
  body_size text,
  debut_year integer,
  representative_image_url text,
  representative_image_asset_id uuid references public.media_assets(id) on delete set null,
  image_urls text[] not null default '{}',
  image_asset_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- 5. Create rating_grades table
create table public.rating_grades (
  grade text primary key,
  display_order integer not null
);

-- 6. Create movies table
create table public.movies (
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
  poster_asset_id uuid references public.media_assets(id) on delete set null,
  capture_url text,
  capture_asset_id uuid references public.media_assets(id) on delete set null,
  snapshot_url text,
  snapshot_asset_id uuid references public.media_assets(id) on delete set null,
  release_month text,
  production_company text,
  recommendation_score integer not null default 0,
  ranking_score integer not null default 0,
  click_count integer not null default 0,
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);

-- 7. Create indexes for performance and rapid lookup
create index idx_movies_category_code on public.movies(category_code);
create index idx_movies_actor_id on public.movies(actor_id);
create index idx_movies_rating_grade on public.movies(rating_grade);
create index idx_movies_created_at on public.movies(created_at desc);
create index idx_movies_recommendation_score on public.movies(recommendation_score desc);
create index idx_movies_ranking_score on public.movies(ranking_score desc);
create index idx_movies_click_count on public.movies(click_count desc);
create index idx_media_assets_owner on public.media_assets(owner_table, owner_id, owner_field);

-- 8. Seed storage bucket and default rating grades
insert into storage.buckets (id, name, public)
values ('cinetube-images', 'cinetube-images', true)
on conflict (id) do update set public = excluded.public;

insert into public.rating_grades (grade, display_order)
values ('A+', 1), ('A', 2), ('B+', 3), ('B', 4), ('C', 5)
on conflict (grade) do update set display_order = excluded.display_order;

-- 9. Enable Row Level Security (RLS) on all tables
alter table public.media_assets enable row level security;
alter table public.categories enable row level security;
alter table public.actors enable row level security;
alter table public.rating_grades enable row level security;
alter table public.movies enable row level security;

-- 10. Configure Row Level Security (RLS) Policies

-- public read access policies
drop policy if exists "public read media assets" on public.media_assets;
drop policy if exists "public read categories" on public.categories;
drop policy if exists "public read actors" on public.actors;
drop policy if exists "public read rating grades" on public.rating_grades;
drop policy if exists "public read movies" on public.movies;

create policy "public read media assets" on public.media_assets for select using (true);
create policy "public read categories" on public.categories for select using (true);
create policy "public read actors" on public.actors for select using (true);
create policy "public read rating grades" on public.rating_grades for select using (true);
create policy "public read movies" on public.movies for select using (true);

-- authenticated write access policies
drop policy if exists "authenticated write media assets" on public.media_assets;
drop policy if exists "authenticated write categories" on public.categories;
drop policy if exists "authenticated write actors" on public.actors;
drop policy if exists "authenticated write rating grades" on public.rating_grades;
drop policy if exists "authenticated write movies" on public.movies;

create policy "write media assets" on public.media_assets for all using (true) with check (true);
create policy "write categories" on public.categories for all using (true) with check (true);
create policy "write actors" on public.actors for all using (true) with check (true);
create policy "write rating grades" on public.rating_grades for all using (true) with check (true);
create policy "write movies" on public.movies for all using (true) with check (true);

-- storage objects policies
drop policy if exists "public read cinetube images" on storage.objects;
drop policy if exists "authenticated upload cinetube images" on storage.objects;
drop policy if exists "authenticated update cinetube images" on storage.objects;
drop policy if exists "authenticated delete cinetube images" on storage.objects;

create policy "public read cinetube images" on storage.objects
for select using (bucket_id = 'cinetube-images');

create policy "upload cinetube images" on storage.objects
for insert with check (bucket_id = 'cinetube-images');

create policy "update cinetube images" on storage.objects
for update using (bucket_id = 'cinetube-images') with check (bucket_id = 'cinetube-images');

create policy "delete cinetube images" on storage.objects
for delete using (bucket_id = 'cinetube-images');
