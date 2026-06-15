alter table public.media_assets
  add column if not exists thumb_url text;

update public.media_assets
set thumb_url = public_url
where thumb_url is null
  and public_url is not null;
