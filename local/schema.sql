create extension if not exists pgcrypto;

drop table if exists public.movies;
drop table if exists public.categories;
drop table if exists public.actors;
drop table if exists public.rating_grades;
drop table if exists public.media_assets;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null default 'local-inline',
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

create table public.categories (
  category_code text primary key,
  name text not null,
  representative_image_url text,
  representative_image_asset_id uuid references public.media_assets(id) on delete set null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

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

create table public.rating_grades (
  grade text primary key,
  display_order integer not null
);

create table public.movies (
  id bigint generated always as identity primary key,
  title text not null,
  movie_code text not null unique,
  category_code text references public.categories(category_code) on update cascade on delete set null,
  actor_id bigint references public.actors(id) on update cascade on delete set null,
  actor_ids bigint[] not null default '{}',
  director_names text[] not null default '{}',
  source_url text,
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
  rotten_tomatoes_score integer,
  ranking_score integer not null default 0,
  click_count integer not null default 0,
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_movies_category_code on public.movies(category_code);
create index idx_movies_actor_id on public.movies(actor_id);
create index idx_movies_actor_ids on public.movies using gin(actor_ids);
create index idx_movies_rating_grade on public.movies(rating_grade);
create index idx_movies_created_at on public.movies(created_at desc);
create index idx_movies_recommendation_score on public.movies(recommendation_score desc);
create index idx_movies_ranking_score on public.movies(ranking_score desc);
create index idx_movies_click_count on public.movies(click_count desc);
create index idx_media_assets_owner on public.media_assets(owner_table, owner_id, owner_field);

insert into public.rating_grades (grade, display_order)
values ('A+', 1), ('A', 2), ('B+', 3), ('B', 4), ('C', 5)
on conflict (grade) do update set display_order = excluded.display_order;
