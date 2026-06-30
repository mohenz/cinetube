insert into public.common_codes (code_group, code_value, code_label, display_order, is_enabled, extra)
values
  ('webtoon_import_site', 'auto', '자동 인식', 0, true, '{"system": true}'::jsonb),
  ('webtoon_import_site', 'mangadistrict', 'MangaDistrict', 10, true, '{"placeholder": "https://mangadistrict.com/series/..."}'::jsonb),
  ('webtoon_import_site', 'mangadna', 'MangaDNA', 15, true, '{"placeholder": "https://mangadna.com/manga/..."}'::jsonb),
  ('webtoon_import_site', 'hentai18', 'Hentai18', 20, true, '{"placeholder": "https://hentai18.net/read-hentai/..."}'::jsonb),
  ('webtoon_import_site', 'imhentai', 'IMHentai', 30, true, '{"placeholder": "https://imhentai.xxx/gallery/..."}'::jsonb)
on conflict (code_group, code_value) do update set
  code_label = excluded.code_label,
  display_order = excluded.display_order,
  is_enabled = excluded.is_enabled,
  extra = excluded.extra;










