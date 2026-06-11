-- CineTube import: Aoi Tsukasa requested reducing-mosaic works
-- Source URLs requested by owner:
-- - https://javtiful.com/kr/video/72258/ssni-987-reducing-mosaic
-- - https://javtiful.com/kr/video/100262/ssni-346-reducing-mosaic
-- - https://supjav.com/208427.html
-- Import rule: only the three owner-requested works are included.

insert into public.categories (category_code, name, is_visible)
values ('reducing-mosaic', 'Reducing Mosaic', true)
on conflict (category_code) do update set
  name = excluded.name,
  is_visible = excluded.is_visible;

with existing_actor as (
  select id
  from public.actors
  where name = 'Aoi Tsukasa'
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
    'Aoi Tsukasa',
    35,
    163,
    'B85(D)-W58-H88',
    2010,
    'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/fc0e23f78f3ba378355f3566f47f4f0a.jpg',
    array[
      'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/fc0e23f78f3ba378355f3566f47f4f0a.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2024/11/24/1b06144708f8a05e18512498d297a026.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/12/30/375b749b894f548aef4540492adc16ea.jpg',
      'https://img.supjav.com/images/2020/12/1607175575-snis675pl.jpg'
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
    age = 35,
    height_cm = 163,
    body_size = 'B85(D)-W58-H88',
    debut_year = 2010,
    representative_image_url = 'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/fc0e23f78f3ba378355f3566f47f4f0a.jpg',
    image_urls = array[
      'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/fc0e23f78f3ba378355f3566f47f4f0a.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2024/11/24/1b06144708f8a05e18512498d297a026.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/12/30/375b749b894f548aef4540492adc16ea.jpg',
      'https://img.supjav.com/images/2020/12/1607175575-snis675pl.jpg'
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
      'SSNI-987 도 시골의 여름은 야르 일이 없고 옆의 미인 부인의 유혹을 타고 매일 차분히 땀 투성이 교미 아오이 츠카사',
      'SSNI-987',
      array['Aoi Tsukasa', 'Reducing', 'Javtiful', 'S1 NO.1 STYLE'],
      'A',
      'https://javtiful.com/kr/video/72258/ssni-987-reducing-mosaic',
      'Javtiful reducing-mosaic work imported from the owner-requested video page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2024/11/24/1b06144708f8a05e18512498d297a026.jpg',
      '2024-11',
      'S1 NO.1 STYLE',
      88,
      88
    ),
    (
      'SSNI-346 내가 없는 2일간, 그녀가 다른 남자와 아침부터 밤까지 야리 뛰고 있던 가슴 대변 영상 아오이 츠카사',
      'SSNI-346',
      array['Aoi Tsukasa', 'Reducing', 'Javtiful', 'S1 NO.1 STYLE'],
      'A',
      'https://javtiful.com/kr/video/100262/ssni-346-reducing-mosaic',
      'Javtiful reducing-mosaic work imported from the owner-requested video page.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/12/30/375b749b894f548aef4540492adc16ea.jpg',
      '2025-12',
      'S1 NO.1 STYLE',
      87,
      87
    ),
    (
      'SNIS-675 S1 x ATTACKERS Special Being Fucked In Front Of The Eyes Of Collaboration Planning Husband - Of Harmonious Couple Setting Sun Tsukasa Aoi',
      'SNIS-675',
      array['Aoi Tsukasa', 'Reducing', 'Supjav', 'S1 NO.1 STYLE'],
      'B+',
      'https://supjav.com/208427.html',
      'Supjav reducing-mosaic work imported from the owner-requested video page.',
      'https://img.supjav.com/images/2020/12/1607175575-snis675pl.jpg',
      '2020-12',
      'S1 NO.1 STYLE',
      86,
      86
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










