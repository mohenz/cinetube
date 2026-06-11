-- CineTube import: Araki Noa reducing-only works
-- Source URL requested by owner: https://javtiful.com/kr/actress/araki-noa
-- Import rule: only Javtiful reducing-mosaic video cards are included.
-- Actor profile reference: https://www.avdbs.com/menu/actor.php?actor_idx=11244

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
  where name = 'Araki Noa'
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
    'Araki Noa',
    21,
    162,
    'B84(E)-W56-H87',
    2025,
    'https://javtiful.com/uploads/uploads/collections/actresses/2026/05/03/269028a4be86eba8fb167b4bee5dd4bc.jpg',
    array[
      'https://javtiful.com/uploads/uploads/collections/actresses/2026/05/03/269028a4be86eba8fb167b4bee5dd4bc.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/06/01/9ac044c45cdb0c76b66ef7ea89a5e3c2.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/04/28/4907ad2b4b0a2fe52729c3baa06110e0.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/03/24/b10d2c9ff4a2969584b298a1f87a6167.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/02/21/2be7263e19fc26d4439c7c9f69c4b949.jpg'
    ]::text[],
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
    age = 21,
    height_cm = 162,
    body_size = 'B84(E)-W56-H87',
    debut_year = 2025,
    representative_image_url = 'https://javtiful.com/uploads/uploads/collections/actresses/2026/05/03/269028a4be86eba8fb167b4bee5dd4bc.jpg',
    image_urls = array[
      'https://javtiful.com/uploads/uploads/collections/actresses/2026/05/03/269028a4be86eba8fb167b4bee5dd4bc.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/06/01/9ac044c45cdb0c76b66ef7ea89a5e3c2.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/04/28/4907ad2b4b0a2fe52729c3baa06110e0.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/03/24/b10d2c9ff4a2969584b298a1f87a6167.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/02/21/2be7263e19fc26d4439c7c9f69c4b949.jpg'
    ]::text[]
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
  capture_url,
  snapshot_url,
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
  movie.rating_grade,
  movie.video_url,
  movie.description,
  movie.poster_url,
  movie.poster_url,
  movie.poster_url,
  movie.release_month,
  movie.production_company,
  movie.recommendation_score,
  movie.ranking_score,
  0
from actor_ref
cross join (
  values
    (
      'SNOS-166 내 거시기를 너무 사랑해서 갓 짜낸 정액을 두고 싸우고 얼굴에 사정해달라고 애원하는 두 하녀',
      'SNOS-166',
      array['Araki Noa', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'A+',
      'https://javtiful.com/kr/video/108958/snos-166-reducing-mosaic',
      'Reducing-mosaic work imported from the Araki Noa public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/06/01/9ac044c45cdb0c76b66ef7ea89a5e3c2.jpg',
      '2026-06',
      'S1 No.1 Style',
      94,
      94
    ),
    (
      'SNOS-190 내가 너무나 순진하다고 생각했던 의붓여동생이 사실은 변태였어... 대낮에 속옷도 안 입고 날 유혹하더라.',
      'SNOS-190',
      array['Araki Noa', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'A+',
      'https://javtiful.com/kr/video/106969/snos-190-reducing-mosaic',
      'Reducing-mosaic work imported from the Araki Noa public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/04/28/4907ad2b4b0a2fe52729c3baa06110e0.jpg',
      '2026-04',
      'S1 No.1 Style',
      93,
      93
    ),
    (
      'SNOS-157 일본에서 가장 얼굴이 귀여운 애인과 가는 벨로베로 키스 온천 여행',
      'SNOS-157',
      array['Araki Noa', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'A',
      'https://javtiful.com/kr/video/105219/snos-157-reducing-mosaic',
      'Reducing-mosaic work imported from the Araki Noa public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/03/24/b10d2c9ff4a2969584b298a1f87a6167.jpg',
      '2026-03',
      'S1 No.1 Style',
      92,
      92
    ),
    (
      'SNOS-117 싫어하는 장인에게 죄송합니다.',
      'SNOS-117',
      array['Araki Noa', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'A',
      'https://javtiful.com/kr/video/103444/snos-117-reducing-mosaic',
      'Reducing-mosaic work imported from the Araki Noa public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/02/21/2be7263e19fc26d4439c7c9f69c4b949.jpg',
      '2026-02',
      'S1 No.1 Style',
      91,
      91
    ),
    (
      'SNOS-098 1개월 진짜 금욕한 진짜 귀여운 미소녀가 성욕대 해방 이키 부러지는, 초절정 키메섹 에로티즘',
      'SNOS-098',
      array['Araki Noa', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'A',
      'https://javtiful.com/kr/video/101768/snos-098-reducing-mosaic',
      'Reducing-mosaic work imported from the Araki Noa public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/01/24/9d78d152b9505392fa70f740f2a1fab6.jpg',
      '2026-01',
      'S1 No.1 Style',
      90,
      90
    ),
    (
      'SNOS-036 무구하고 어른스러운 여학생이라면 뭐든지 용서해 준다. 교사의 나는 음란한 귀여운 도서 위원을 범해서 오징어 뻔했다. 신키 노조미',
      'SNOS-036',
      array['Araki Noa', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'B+',
      'https://javtiful.com/kr/video/99735/snos-036-reducing-mosaic',
      'Reducing-mosaic work imported from the Araki Noa public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/12/20/40bc4febd56edaff265fda07fbfea6a4.jpg',
      '2025-12',
      'S1 No.1 Style',
      89,
      89
    ),
    (
      'SNOS-007 대량 실금이 멈추지 않는다 ...! 아라키 노조미, 처음의 수치심 슈퍼 누설',
      'SNOS-007',
      array['Araki Noa', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'B+',
      'https://javtiful.com/kr/video/98140/snos-007-reducing-mosaic',
      'Reducing-mosaic work imported from the Araki Noa public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/11/25/6dd5a9a8ce55988753ca9be5e59dd637.jpg',
      '2025-11',
      'S1 No.1 Style',
      88,
      88
    ),
    (
      'SONE-952 아르바이트 점장과 여대생은 종전을 놓치고… 호텔에서 달콤하고 애절한 농후 성교에 빠져 버렸습니다. 이케나이 순애상 방 NTR 신기 노조미',
      'SONE-952',
      array['Araki Noa', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'B+',
      'https://javtiful.com/kr/video/96408/sone-952-reducing-mosaic',
      'Reducing-mosaic work imported from the Araki Noa public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/10/26/ec6e6045a6dbd74bbc782fff58b9d7cb.jpg',
      '2025-10',
      'S1 No.1 Style',
      87,
      87
    ),
    (
      'SONE-913 귀여운 얼굴로 야한 치료사가 나에게 반한 제로 거리 밀착으로 연인처럼 지포를 치유하는 달콤한 남성 에스테틱 아키 기노하라',
      'SONE-913',
      array['Araki Noa', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'B',
      'https://javtiful.com/kr/video/94253/sone-913-reducing-mosaic',
      'Reducing-mosaic work imported from the Araki Noa public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/09/22/5d5be495efe42713cbd368396f55a810.jpg',
      '2025-09',
      'S1 No.1 Style',
      86,
      86
    ),
    (
      'SONE-864 이 여학생, 순수하게 보이고 중년 교사와 사랑에 빠져, 치●사(다른 사람)에게도 즉시 늪한다. 신키 노조미',
      'SONE-864',
      array['Araki Noa', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'B',
      'https://javtiful.com/kr/video/91926/sone-864-reducing-mosaic',
      'Reducing-mosaic work imported from the Araki Noa public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/08/24/5300b40cb4f51ec7b1e74bdba070aaa2.jpg',
      '2025-08',
      'S1 No.1 Style',
      85,
      85
    ),
    (
      'SONE-721 삼촌 숙박 데이트 농밀 성교 많이 웃고, 많이 벨로츄하고, 많이 넉넉히 얽히는 최고의 성교 신기 노조미',
      'SONE-721',
      array['Araki Noa', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'B',
      'https://javtiful.com/kr/video/85882/sone-721-reducing-mosaic',
      'Reducing-mosaic work imported from the Araki Noa public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/05/27/160097ec527da425fb1f80a2b6e115d8.jpg',
      '2025-05',
      'S1 No.1 Style',
      84,
      84
    )
) as movie(title, movie_code, keywords, rating_grade, video_url, description, poster_url, release_month, production_company, recommendation_score, ranking_score)
on conflict (movie_code) do update set
  title = excluded.title,
  category_code = excluded.category_code,
  actor_id = excluded.actor_id,
  keywords = excluded.keywords,
  rating_grade = excluded.rating_grade,
  video_url = excluded.video_url,
  description = excluded.description,
  poster_url = excluded.poster_url,
  capture_url = excluded.capture_url,
  snapshot_url = excluded.snapshot_url,
  release_month = excluded.release_month,
  production_company = excluded.production_company,
  recommendation_score = excluded.recommendation_score,
  ranking_score = excluded.ranking_score,
  click_count = excluded.click_count;










