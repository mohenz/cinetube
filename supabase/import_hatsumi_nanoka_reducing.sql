-- CineTube import: Hatsumi Nanoka reducing-only works
-- Source URL requested by owner: https://javtiful.com/kr/actress/hatsumi-nanoka
-- Import rule: only Javtiful reducing-mosaic video cards are included.
-- Actor profile references:
-- - https://www.i-dol.tv/idol/detail/671/
-- - https://mine-secret.com/?p=204
-- - https://healingisland3103.com/nanoka-hatsumi-wiki/

insert into public.categories (
  category_code,
  name,
  is_visible
)
values (
  'reducing-mosaic',
  'Reducing Mosaic',
  true
)
on conflict (category_code) do update set
  name = excluded.name,
  is_visible = excluded.is_visible;

with existing_actor as (
  select id
  from public.actors
  where name = 'Hatsumi Nanoka'
  limit 1
),
actor_insert as (
  insert into public.actors (
    name,
    age,
    height_cm,
    body_size,
    debut_year,
    representative_image_url,
    image_urls,
    image_asset_ids
  )
  select
    'Hatsumi Nanoka',
    20,
    157,
    'E cup / W57',
    2025,
    'https://javtiful.com/uploads/uploads/collections/actresses/2026/05/03/0b7447247c2ade7eb4b6d6903be1333f.jpg',
    '{}'::text[],
    '{}'::uuid[]
  where not exists (select 1 from existing_actor)
  returning id
),
actor_ref as (
  select id from actor_insert
  union all
  select id from existing_actor
  limit 1
),
actor_update as (
  update public.actors
  set
    age = 20,
    height_cm = 157,
    body_size = 'E cup / W57',
    debut_year = 2025,
    representative_image_url = 'https://javtiful.com/uploads/uploads/collections/actresses/2026/05/03/0b7447247c2ade7eb4b6d6903be1333f.jpg'
  where id in (select id from actor_ref)
  returning id
)
insert into public.movies (
  title,
  movie_code,
  category_code,
  actor_id,
  keywords,
  rating_grade,
  video_url,
  description,
  poster_url,
  release_month,
  production_company,
  recommendation_score
)
select
  movie.title,
  movie.movie_code,
  'reducing-mosaic',
  actor_ref.id,
  movie.keywords,
  'B',
  movie.video_url,
  movie.description,
  movie.poster_url,
  movie.release_month,
  movie.production_company,
  70
from actor_ref
cross join (
  values
    (
      'SNOS-242 조용한 의붓딸을 끊임없이 핥고 성폭행한 후',
      'SNOS-242',
      array['Hatsumi Nanoka', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/108406/snos-242-reducing-mosaic',
      'Reducing-mosaic work imported from the Hatsumi Nanoka public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/05/23/14ecafcc753d937b521b519fef65a664-sm.jpg',
      '2026-05',
      null
    ),
    (
      'SNOS-201 많이 속삭이고, 많이 시코시코되어, 많이 사정해버린다, 귀와 지포가 심으로부터 떠오르는 위스퍼 맨즈 에스테츠 하츠미인가?',
      'SNOS-201',
      array['Hatsumi Nanoka', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/106903/snos-201-reducing-mosaic',
      'Reducing-mosaic work imported from the Hatsumi Nanoka public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/04/27/29ea0951a826bc80f75c566b9465df53-sm.jpg',
      '2026-04',
      null
    ),
    (
      'SNOS-173 청초 귀여운 가르침에 유혹된 나는 그녀의 얼굴, 목소리, 육체를 견딜 수 없어… 배덕에 빠져 꽂혀 버린 외설 성교 하츠미인가?',
      'SNOS-173',
      array['Hatsumi Nanoka', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/105161/snos-173-reducing-mosaic',
      'Reducing-mosaic work imported from the Hatsumi Nanoka public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/03/23/b77e8f2375308a35638c9e920f00b74e-sm.jpg',
      '2026-03',
      null
    ),
    (
      'SNOS-121 미소녀와 속옷에 녹는 초농후 베로베로츄~타액성교 하츠미인가',
      'SNOS-121',
      array['Hatsumi Nanoka', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/103445/snos-121-reducing-mosaic',
      'Reducing-mosaic work imported from the Hatsumi Nanoka public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/02/21/1b8fd93b843ef12d91b2fd65518c7f09-sm.jpg',
      '2026-02',
      null
    ),
    (
      'SNOS-101 아침에 한 섹스는 치약, 있어? 이차 붙어, 키스하고, 많이 얽히는, 첫 숙박 호텔 하메 촬영 하츠미인가?',
      'SNOS-101',
      array['Hatsumi Nanoka', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/101770/snos-101-reducing-mosaic',
      'Reducing-mosaic work imported from the Hatsumi Nanoka public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/01/24/989c6e693b41ce15e4a987d1b4b73756-sm.jpg',
      '2026-01',
      null
    ),
    (
      'SNOS-042 하츠미인가, 최강 에로스. 새우 반대로, 물총, 경련 버려, 최고입니다!',
      'SNOS-042',
      array['Hatsumi Nanoka', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/99736/snos-042-reducing-mosaic',
      'Reducing-mosaic work imported from the Hatsumi Nanoka public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/12/20/c33081e313be90a187b15b6dfc7409f7-sm.jpg',
      '2025-12',
      null
    ),
    (
      'SONE-996 쾌감. 전부 첫 체험이다! 하츠미인가?',
      'SONE-996',
      array['Hatsumi Nanoka', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/96485/sone-996-reducing-mosaic',
      'Reducing-mosaic work imported from the Hatsumi Nanoka public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/10/27/14cd8a32968b14db7af02f8a9eb6ccd0-sm.jpg',
      '2025-10',
      null
    ),
    (
      'SONE-962 신인 NO.1 STYLE 하츠미인가 시로우트,인가? 일재,인가?',
      'SONE-962',
      array['Hatsumi Nanoka', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/94259/sone-962-reducing-mosaic',
      'Reducing-mosaic work imported from the Hatsumi Nanoka public actress page.',
      null,
      '2025',
      null
    )
) as movie(title, movie_code, keywords, video_url, description, poster_url, release_month, production_company)
on conflict (movie_code) do update set
  title = excluded.title,
  category_code = excluded.category_code,
  actor_id = excluded.actor_id,
  keywords = excluded.keywords,
  rating_grade = excluded.rating_grade,
  video_url = excluded.video_url,
  description = excluded.description,
  poster_url = excluded.poster_url,
  release_month = excluded.release_month,
  production_company = excluded.production_company,
  recommendation_score = excluded.recommendation_score;










