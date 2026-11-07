-- 마이웹툰 챕터: 컷 이미지 목록과 챕터 제목 저장용 컬럼 (재실행 안전)
alter table public.webtoon_chapters add column if not exists chapter_title text;
alter table public.webtoon_chapters add column if not exists page_image_urls text[] not null default '{}';
alter table public.webtoon_chapters add column if not exists page_image_asset_ids uuid[] not null default '{}';
