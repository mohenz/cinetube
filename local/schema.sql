create extension if not exists pgcrypto;

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

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null default 'local-inline',
  object_path text not null unique,
  public_url text not null,
  thumb_url text,
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

create extension if not exists pg_trgm;

create index idx_movies_category_code on public.movies(category_code);
create index idx_movies_actor_id on public.movies(actor_id);
create index idx_movies_actor_ids on public.movies using gin(actor_ids);
create index idx_movies_rating_grade on public.movies(rating_grade);
create index idx_movies_created_at on public.movies(created_at desc);
create index idx_movies_recommendation_score on public.movies(recommendation_score desc);
create index idx_movies_ranking_score on public.movies(ranking_score desc);
create index idx_movies_click_count on public.movies(click_count desc);
create index idx_movies_category_created_at on public.movies(category_code, created_at desc);
create index idx_movies_category_ranking on public.movies(category_code, ranking_score desc, created_at desc);
create index idx_movies_release_created_at on public.movies(release_month desc, created_at desc);
create index idx_movies_ranking_recommendation on public.movies(ranking_score desc, recommendation_score desc, created_at desc);
create index idx_movies_click_created_at on public.movies(click_count desc, created_at desc);
create index idx_movies_main_created_at on public.movies(is_main, created_at desc) where is_main = true;
create index idx_media_assets_owner on public.media_assets(owner_table, owner_id, owner_field);
create index idx_media_assets_owner_sort on public.media_assets(owner_table, owner_id, owner_field, sort_order);
create index idx_common_codes_group_order on public.common_codes(code_group, display_order, code_label);
create index idx_common_codes_enabled_order on public.common_codes(code_group, is_enabled, display_order, code_label);
create index idx_actors_name on public.actors(name);
create index idx_categories_visible_created_at on public.categories(is_visible, created_at desc);
create index idx_webtoons_webtoon_id on public.webtoons(webtoon_id);
create index idx_webtoons_created_at on public.webtoons(created_at desc);
create index idx_webtoons_regdate_created_at on public.webtoons(regdate desc, created_at desc);
create index idx_webtoon_chapters_webtoon_id on public.webtoon_chapters(webtoon_id);
create index idx_webtoon_chapters_number on public.webtoon_chapters(webtoon_id, chapter_number);
create index idx_gallery_images_gallery_image_id on public.gallery_images(gallery_image_id);
create index idx_gallery_images_created_at on public.gallery_images(created_at desc);
create index idx_gallery_images_visible on public.gallery_images(is_visible, created_at desc);
create index idx_gallery_images_visible_regdate on public.gallery_images(is_visible, regdate desc, created_at desc);
create index idx_favorite_movies_user_content on public.favorite_movies(user_key, content_type, created_at desc);
create index idx_favorite_movies_content on public.favorite_movies(content_type, content_id);
create index idx_favorite_movies_content_created_at on public.favorite_movies(content_type, content_id, created_at desc);
create index idx_categories_representative_asset on public.categories(representative_image_asset_id);
create index idx_actors_representative_asset on public.actors(representative_image_asset_id);
create index idx_webtoons_poster_asset on public.webtoons(poster_image_asset_id);
create index idx_webtoon_chapters_poster_asset on public.webtoon_chapters(chapter_poster_asset_id);
create index idx_gallery_images_asset on public.gallery_images(image_asset_id);
create index idx_movies_poster_asset on public.movies(poster_asset_id);
create index idx_movies_capture_asset on public.movies(capture_asset_id);
create index idx_movies_snapshot_asset on public.movies(snapshot_asset_id);
create index idx_actors_name_trgm on public.actors using gin (name gin_trgm_ops);
create index idx_actors_body_size_trgm on public.actors using gin (body_size gin_trgm_ops);
create index idx_gallery_images_title_trgm on public.gallery_images using gin (title gin_trgm_ops);
create index idx_gallery_images_id_trgm on public.gallery_images using gin (gallery_image_id gin_trgm_ops);
create index idx_gallery_images_description_trgm on public.gallery_images using gin (description gin_trgm_ops);
create index idx_gallery_images_source_trgm on public.gallery_images using gin (source gin_trgm_ops);

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










