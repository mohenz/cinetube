-- CineTube import: Tsujimoto An reducing-only works
-- Source URL requested by owner: https://javtiful.com/kr/actress/tsujimoto-an
-- Import rule: only Javtiful reducing-mosaic video cards are included.
-- Actor profile reference: https://www.avdbs.com/menu/actor.php?actor_idx=1298

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
  where name = 'Tsujimoto An'
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
    'Tsujimoto An',
    32,
    155,
    'B82(C)-W57-H80',
    2013,
    'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5034adcdc4108beb9355c005d35bba58.jpg',
    array[
      'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5034adcdc4108beb9355c005d35bba58.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/01/12/7bdfe6e4bce876b72ec2d61f5e600eae.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/09/09/33bcccd3e6ee52c1fc182dd71d12a2bf.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2024/11/25/b82c6eb503947ebf83a88a4ff081673c.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2023/06/12/a6556ad80b0b718981624185d7d59b4d.jpg'
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
    age = 32,
    height_cm = 155,
    body_size = 'B82(C)-W57-H80',
    debut_year = 2013,
    representative_image_url = 'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5034adcdc4108beb9355c005d35bba58.jpg',
    image_urls = array[
      'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5034adcdc4108beb9355c005d35bba58.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/01/12/7bdfe6e4bce876b72ec2d61f5e600eae.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/09/09/33bcccd3e6ee52c1fc182dd71d12a2bf.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2024/11/25/b82c6eb503947ebf83a88a4ff081673c.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2023/06/12/a6556ad80b0b718981624185d7d59b4d.jpg'
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
      'SSNI-172 강제 면도 파이 빵 노출 제복 미소녀',
      'SSNI-172',
      array['Tsujimoto An', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'A+',
      'https://javtiful.com/kr/video/100994/ssni-172-reducing-mosaic',
      'Reducing-mosaic work imported from the Tsujimoto An public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/01/12/7bdfe6e4bce876b72ec2d61f5e600eae.jpg',
      '2026-01',
      'S1 No.1 Style',
      88,
      88
    ),
    (
      'SNIS-819 JK 산책 츠지모토 안즈',
      'SNIS-819',
      array['Tsujimoto An', 'Reducing', 'FHD', 'S1 No.1 Style'],
      'A',
      'https://javtiful.com/kr/video/93039/snis-819-reducing-mosaic',
      'Reducing-mosaic work imported from the Tsujimoto An public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/09/09/33bcccd3e6ee52c1fc182dd71d12a2bf.jpg',
      '2025-09',
      'S1 No.1 Style',
      87,
      87
    ),
    (
      'TEAM-068 최고의 치유로 봉사해 주는 최신회 봄 마사지 츠지모토 안즈',
      'TEAM-068',
      array['Tsujimoto An', 'Reducing', 'HD'],
      'B+',
      'https://javtiful.com/kr/video/72311/team-068-reducing-mosaic',
      'Reducing-mosaic work imported from the Tsujimoto An public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2024/11/25/b82c6eb503947ebf83a88a4ff081673c.jpg',
      '2024-11',
      null,
      86,
      86
    ),
    (
      'TEAM-062 욕구 불만인 신인 간호사의 성기촉진 하메 치료 츠지모토 안즈',
      'TEAM-062',
      array['Tsujimoto An', 'Reducing', 'FHD'],
      'B+',
      'https://javtiful.com/kr/video/34723/team-062-reducing-mosaic',
      'Reducing-mosaic work imported from the Tsujimoto An public actress page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2023/06/12/a6556ad80b0b718981624185d7d59b4d.jpg',
      '2023-06',
      null,
      85,
      85
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










