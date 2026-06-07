-- CineHub Supabase Clean Schema for CineTube.
-- WARNING: Running this script will DROP all existing tables and recreate them from scratch.

-- 1. Drop existing tables in correct dependency order
drop table if exists public.movies;
drop table if exists public.categories;
drop table if exists public.actors;
drop table if exists public.rating_grades;
drop table if exists public.common_codes;
drop table if exists public.favorite_movies;
drop table if exists public.gallery_images;
drop table if exists public.webtoon_chapters;
drop table if exists public.webtoons;
drop table if exists public.media_assets;

-- 2. Create media_assets table first (yl other tables can reference it directly)
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

-- 6. Create common code table
create table public.common_codes (
  id bigint generated always as identity primary key,
  code_group text not null,
  code_value text not null,
  code_label text not null,
  display_order integer not null default 99,
  is_enabled boolean not null default true,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (code_group, code_value)
);

create table public.webtoons (
  id bigint generated always as identity primary key,
  webtoon_id text not null unique,
  title text not null,
  rating text,
  alternative text,
  artist text,
  genre text,
  type text,
  tage text[] not null default '{}',
  poster_image text,
  poster_image_asset_id uuid references public.media_assets(id) on delete set null,
  url text,
  webtoon_images text[] not null default '{}',
  webtoon_image_asset_ids uuid[] not null default '{}',
  regdate timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.webtoon_chapters (
  id bigint generated always as identity primary key,
  webtoon_chapter_id text not null unique,
  webtoon_id text not null references public.webtoons(webtoon_id) on update cascade on delete cascade,
  chapter_number integer not null default 0,
  chapter_url text,
  chapter_poster text,
  chapter_poster_asset_id uuid references public.media_assets(id) on delete set null,
  regdate timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.gallery_images (
  id bigint generated always as identity primary key,
  gallery_image_id text not null unique,
  title text not null,
  description text,
  image_url text,
  image_asset_id uuid references public.media_assets(id) on delete set null,
  source text,
  tags text[] not null default '{}',
  is_visible boolean not null default true,
  regdate timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 7. Create movies table
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

create table public.favorite_movies (
  id bigint generated always as identity primary key,
  user_key text not null default 'local',
  content_type text not null check (content_type in ('movie', 'webtoon', 'gallery')),
  content_id text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_key, content_type, content_id)
);

-- 8. Create indexes for performance and rapid lookup
create index idx_movies_category_code on public.movies(category_code);
create index idx_movies_actor_id on public.movies(actor_id);
create index idx_movies_actor_ids on public.movies using gin(actor_ids);
create index idx_movies_rating_grade on public.movies(rating_grade);
create index idx_movies_created_at on public.movies(created_at desc);
create index idx_movies_recommendation_score on public.movies(recommendation_score desc);
create index idx_movies_ranking_score on public.movies(ranking_score desc);
create index idx_movies_click_count on public.movies(click_count desc);
create index idx_media_assets_owner on public.media_assets(owner_table, owner_id, owner_field);
create index idx_common_codes_group_order on public.common_codes(code_group, display_order, code_label);
create index idx_webtoons_webtoon_id on public.webtoons(webtoon_id);
create index idx_webtoons_created_at on public.webtoons(created_at desc);
create index idx_webtoon_chapters_webtoon_id on public.webtoon_chapters(webtoon_id);
create index idx_webtoon_chapters_number on public.webtoon_chapters(webtoon_id, chapter_number);
create index idx_gallery_images_gallery_image_id on public.gallery_images(gallery_image_id);
create index idx_gallery_images_created_at on public.gallery_images(created_at desc);
create index idx_gallery_images_visible on public.gallery_images(is_visible, created_at desc);
create index idx_favorite_movies_user_content on public.favorite_movies(user_key, content_type, created_at desc);
create index idx_favorite_movies_content on public.favorite_movies(content_type, content_id);

-- 9. Seed storage bucket and default rating grades
insert into storage.buckets (id, name, public)
values ('cinetube-images', 'cinetube-images', true)
on conflict (id) do update set public = excluded.public;

insert into public.rating_grades (grade, display_order)
values ('A+', 1), ('A', 2), ('B+', 3), ('B', 4), ('C', 5)
on conflict (grade) do update set display_order = excluded.display_order;

insert into public.common_codes (code_group, code_value, code_label, display_order, is_enabled, extra)
values
  ('import_site', 'auto', '자동 인식', 0, true, '{"system": true}'::jsonb),
  ('import_site', 'tmdb', 'TMDB', 10, true, '{"placeholder": "TMDB URL 또는 TMDB 작품번호"}'::jsonb),
  ('import_site', 'javtiful', 'Javtiful', 20, true, '{"placeholder": "Javtiful URL 또는 작품번호"}'::jsonb),
  ('import_site', 'supjav', 'Supjav', 30, true, '{"placeholder": "Supjav URL 또는 작품번호"}'::jsonb),
  ('import_site', 'missav', 'MissAV', 40, true, '{"placeholder": "MissAV URL 또는 작품번호"}'::jsonb),
  ('webtoon_import_site', 'auto', '자동 인식', 0, true, '{"system": true}'::jsonb),
  ('webtoon_import_site', 'mangadistrict', 'MangaDistrict', 10, true, '{"placeholder": "https://mangadistrict.com/series/..."}'::jsonb),
  ('webtoon_import_site', 'hentai18', 'Hentai18', 20, true, '{"placeholder": "https://hentai18.net/read-hentai/..."}'::jsonb),
  ('webtoon_import_site', 'imhentai', 'IMHentai', 30, true, '{"placeholder": "https://imhentai.xxx/gallery/..."}'::jsonb)
on conflict (code_group, code_value) do update set
  code_label = excluded.code_label,
  display_order = excluded.display_order,
  is_enabled = excluded.is_enabled,
  extra = excluded.extra;

-- 10. Enable Row Level Security (RLS) on all tables
alter table public.media_assets enable row level security;
alter table public.categories enable row level security;
alter table public.actors enable row level security;
alter table public.rating_grades enable row level security;
alter table public.common_codes enable row level security;
alter table public.movies enable row level security;
alter table public.gallery_images enable row level security;
alter table public.favorite_movies enable row level security;

-- 11. Configure Row Level Security (RLS) Policies

-- public read access policies
drop policy if exists "public read media assets" on public.media_assets;
drop policy if exists "public read categories" on public.categories;
drop policy if exists "public read actors" on public.actors;
drop policy if exists "public read rating grades" on public.rating_grades;
drop policy if exists "public read common codes" on public.common_codes;
drop policy if exists "public read movies" on public.movies;
drop policy if exists "public read gallery images" on public.gallery_images;
drop policy if exists "public read favorite movies" on public.favorite_movies;

create policy "public read media assets" on public.media_assets for select using (true);
create policy "public read categories" on public.categories for select using (true);
create policy "public read actors" on public.actors for select using (true);
create policy "public read rating grades" on public.rating_grades for select using (true);
create policy "public read common codes" on public.common_codes for select using (true);
create policy "public read movies" on public.movies for select using (true);
create policy "public read gallery images" on public.gallery_images for select using (true);
create policy "public read favorite movies" on public.favorite_movies for select using (true);

-- authenticated write access policies
drop policy if exists "authenticated write media assets" on public.media_assets;
drop policy if exists "authenticated write categories" on public.categories;
drop policy if exists "authenticated write actors" on public.actors;
drop policy if exists "authenticated write rating grades" on public.rating_grades;
drop policy if exists "authenticated write common codes" on public.common_codes;
drop policy if exists "authenticated write movies" on public.movies;
drop policy if exists "authenticated write gallery images" on public.gallery_images;
drop policy if exists "authenticated write favorite movies" on public.favorite_movies;

create policy "write media assets" on public.media_assets for all using (true) with check (true);
create policy "write categories" on public.categories for all using (true) with check (true);
create policy "write actors" on public.actors for all using (true) with check (true);
create policy "write rating grades" on public.rating_grades for all using (true) with check (true);
create policy "write common codes" on public.common_codes for all using (true) with check (true);
create policy "write movies" on public.movies for all using (true) with check (true);
create policy "write gallery images" on public.gallery_images for all using (true) with check (true);
create policy "write favorite movies" on public.favorite_movies for all using (true) with check (true);

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










