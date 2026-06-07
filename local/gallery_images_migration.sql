create table if not exists public.gallery_images (
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

alter table public.favorite_movies drop constraint if exists favorite_movies_content_type_check;
alter table public.favorite_movies add constraint favorite_movies_content_type_check
  check (content_type in ('movie', 'webtoon', 'gallery'));

create index if not exists idx_gallery_images_gallery_image_id on public.gallery_images(gallery_image_id);
create index if not exists idx_gallery_images_created_at on public.gallery_images(created_at desc);
create index if not exists idx_gallery_images_visible on public.gallery_images(is_visible, created_at desc);
