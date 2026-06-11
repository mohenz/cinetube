create table if not exists public.common_codes (
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

create index if not exists idx_common_codes_group_order
  on public.common_codes(code_group, display_order, code_label);

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










