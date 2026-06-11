-- CineTube image management migration.
-- Creates image metadata storage and links movie/category/actor records to uploaded images.

create table if not exists public.media_assets (
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

alter table public.categories add column if not exists representative_image_asset_id uuid references public.media_assets(id) on delete set null;
alter table public.actors add column if not exists representative_image_asset_id uuid references public.media_assets(id) on delete set null;
alter table public.actors add column if not exists image_asset_ids uuid[] not null default '{}';
alter table public.movies add column if not exists poster_asset_id uuid references public.media_assets(id) on delete set null;
alter table public.movies add column if not exists capture_asset_id uuid references public.media_assets(id) on delete set null;
alter table public.movies add column if not exists snapshot_asset_id uuid references public.media_assets(id) on delete set null;

create index if not exists idx_media_assets_owner on public.media_assets(owner_table, owner_id, owner_field);

insert into storage.buckets (id, name, public)
values ('cinetube-images', 'cinetube-images', true)
on conflict (id) do update set public = excluded.public;

alter table public.media_assets enable row level security;

drop policy if exists "public read media assets" on public.media_assets;
drop policy if exists "authenticated write media assets" on public.media_assets;

create policy "public read media assets" on public.media_assets for select using (true);
create policy "authenticated write media assets" on public.media_assets for all to authenticated using (true) with check (true);

drop policy if exists "public read cinetube images" on storage.objects;
drop policy if exists "authenticated upload cinetube images" on storage.objects;
drop policy if exists "authenticated update cinetube images" on storage.objects;
drop policy if exists "authenticated delete cinetube images" on storage.objects;

create policy "public read cinetube images" on storage.objects
for select using (bucket_id = 'cinetube-images');

create policy "authenticated upload cinetube images" on storage.objects
for insert to authenticated with check (bucket_id = 'cinetube-images');

create policy "authenticated update cinetube images" on storage.objects
for update to authenticated using (bucket_id = 'cinetube-images') with check (bucket_id = 'cinetube-images');

create policy "authenticated delete cinetube images" on storage.objects
for delete to authenticated using (bucket_id = 'cinetube-images');










