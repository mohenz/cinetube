-- CineTube import: Koumura Izuki reducing-only works
-- Source URL requested by owner: https://javtiful.com/kr/actress/koumura-izuki
-- Import rule: only Javtiful reducing-mosaic video cards are included.
-- Actor profile references:
-- - https://mines-pro.jp/model/11011
-- - https://avmix.net/%E5%B9%B8%E6%9D%91%E6%B3%89%E5%B8%8C/
-- Representative image source:
-- - https://javtiful.com/kr/actress/koumura-izuki

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
  where name = 'Koumura Izuki'
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
    'Koumura Izuki',
    25,
    156,
    'B83(D)-W58-H85',
    2025,
    'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/23d0a6710da8fe43fc3ec6237b0e5b2b.jpg',
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
    age = 25,
    height_cm = 156,
    body_size = 'B83(D)-W58-H85',
    debut_year = 2025,
    representative_image_url = 'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/23d0a6710da8fe43fc3ec6237b0e5b2b.jpg'
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
  recommendation_score,
  ranking_score,
  click_count
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
  70,
  70,
  0
from actor_ref
cross join (
  values
    (
      'NACT-132 임대 후 재임대 세입자 ● 앞치마만 두르고 볶음밥을 만들어주고 목욕 서비스까지 제공합니다!',
      'NACT-132',
      array['Koumura Izuki', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/108550/nact-132-reducing-mosaic',
      'Reducing-mosaic work imported from the Koumura Izuki public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/05/26/f4b08f8d0bb79ee58cf952cb1243cb99-sm.jpg',
      '2026-05',
      null
    ),
    (
      'PRED-866 발기부전으로 고생하시는 시아버지께 제 답답한 마음을 털어놓았는데, 그분의 구강성교가 정말 환상적이었어요!',
      'PRED-866',
      array['Koumura Izuki', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/108022/pred-866-reducing-mosaic',
      'Reducing-mosaic work imported from the Koumura Izuki public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/05/16/5c8cb79e1992df8c0d27a595f58d8a80-sm.jpg',
      '2026-05',
      null
    ),
    (
      'MFYD-140 남성 성기를 좋아하는 이즈키 유키무라는 격렬한 구강성교와 정액으로 흠뻑 젖은 성인용품 고문을 당한다.',
      'MFYD-140',
      array['Koumura Izuki', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/108005/mfyd-140-reducing-mosaic',
      'Reducing-mosaic work imported from the Koumura Izuki public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/05/16/d25a3192b710db794bed95c186d5a7d0-sm.jpg',
      '2026-05',
      null
    ),
    (
      'APNS-409 사랑하는 아내의 영상이 담긴 DVD를 방금 받았습니다.',
      'APNS-409',
      array['Koumura Izuki', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/107789/apns-409-reducing-mosaic',
      'Reducing-mosaic work imported from the Koumura Izuki public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/05/13/01f3d8de3305e2e90f04ee092986482d-sm.jpg',
      '2026-05',
      null
    ),
    (
      'FTHTD-198 여자 축구팀 매니저가 짝사랑하는 선배 선수가 팀 주전 자리를 얻도록 돕기 위해 구단 고문과 성행위를 하고 있다.',
      'FTHTD-198',
      array['Koumura Izuki', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/107412/fthtd-198-reducing-mosaic',
      'Reducing-mosaic work imported from the Koumura Izuki public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/05/06/2a0c3a2d63915b5ff9d9e66063c548f1-sm.jpg',
      '2026-05',
      null
    ),
    (
      'CAWD-983 아이돌급으로 귀여운 교복 여학생들의 비극적인 운명',
      'CAWD-983',
      array['Koumura Izuki', 'Reducing', 'HD'],
      'https://javtiful.com/kr/video/107230/cawd-983-reducing-mosaic',
      'Reducing-mosaic work imported from the Koumura Izuki public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/05/03/5dc05ed43fb2ab883866dc7d00f1c278-sm.jpg',
      '2026-05',
      null
    ),
    (
      'PFES-122 이상한 이웃 여대생이 복도에서 무애상에 바지를 보여주고 있습니다 만 ... 무라무라하고 있습니까? 유키무라 이즈미',
      'PFES-122',
      array['Koumura Izuki', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/105419/pfes-122-reducing-mosaic',
      'Reducing-mosaic work imported from the Koumura Izuki public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/03/28/eac62b2808e5f59d4252dbcbc599c5b5-sm.jpg',
      '2026-03',
      null
    ),
    (
      'CAWD-957 사정 정자를 좋아하는 메챠카와 변태 메이드는 남편이 다할 때까지 엄청 대량 얼굴을 쏘고 싶다. 유키무라 이즈미',
      'CAWD-957',
      array['Koumura Izuki', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/103953/cawd-957-reducing-mosaic',
      'Reducing-mosaic work imported from the Koumura Izuki public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/03/02/e1dca30c8cde556e442c8a0e54f87f6b-sm.jpg',
      '2026-03',
      null
    ),
    (
      'ADN-762 당신을 위해, 나는… 불륜의 변명을 찾는 땀 투성이의 젊은 아내 유키무라 이즈미',
      'ADN-762',
      array['Koumura Izuki', 'Reducing', 'FHD'],
      'https://javtiful.com/kr/video/103933/adn-762-reducing-mosaic',
      'Reducing-mosaic work imported from the Koumura Izuki public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/03/02/c69b7736ee773cfb6488d2d37d93f121-sm.jpg',
      '2026-03',
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
  recommendation_score = excluded.recommendation_score,
  ranking_score = excluded.ranking_score,
  click_count = excluded.click_count;










