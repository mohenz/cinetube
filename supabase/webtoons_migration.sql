create table if not exists public.webtoons (
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

create table if not exists public.webtoon_chapters (
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

create index if not exists idx_webtoons_webtoon_id on public.webtoons(webtoon_id);
create index if not exists idx_webtoons_created_at on public.webtoons(created_at desc);
create index if not exists idx_webtoon_chapters_webtoon_id on public.webtoon_chapters(webtoon_id);
create index if not exists idx_webtoon_chapters_number on public.webtoon_chapters(webtoon_id, chapter_number);










