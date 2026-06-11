-- CineTube import: Miyuki Arisaka requested reducing-mosaic work
-- Source URL requested by owner: https://supjav.com/307511.html
-- Import rule: only the owner-requested work is included.

insert into public.categories (category_code, name, is_visible)
values ('reducing-mosaic', 'Reducing Mosaic', true)
on conflict (category_code) do update set
  name = excluded.name,
  is_visible = excluded.is_visible;

with existing_actor as (
  select id
  from public.actors
  where lower(name) in (lower('Miyuki Arisaka'), lower('Arisaka Miyuki'))
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
    'Miyuki Arisaka',
    28,
    161,
    'B82-W55-H84',
    2017,
    'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5b9c92ca67495f540dcbf1642c55cb71.jpg',
    array[
      'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5b9c92ca67495f540dcbf1642c55cb71.jpg',
      'https://img.supjav.com/images/2024/11/miaa077pl.jpg'
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
    name = 'Miyuki Arisaka',
    age = 28,
    height_cm = 161,
    body_size = 'B82-W55-H84',
    debut_year = 2017,
    representative_image_url = 'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5b9c92ca67495f540dcbf1642c55cb71.jpg',
    image_urls = array[
      'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5b9c92ca67495f540dcbf1642c55cb71.jpg',
      'https://img.supjav.com/images/2024/11/miaa077pl.jpg'
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
  'MIAA-077 I That I Have Been Attached For 7 Days With A Classmate Who I Dislike With A Handsome Boyfriend''s Commanding ... Miyuki Arisaka',
  'MIAA-077',
  'reducing-mosaic',
  actor_ref.id,
  array['Miyuki Arisaka', 'Arisaka Miyuki', 'Reducing', 'Supjav', 'MOODYZ'],
  'B+',
  'https://supjav.com/307511.html',
  'Supjav reducing-mosaic work imported from the owner-requested video page.',
  'https://img.supjav.com/images/2024/11/miaa077pl.jpg',
  'https://img.supjav.com/images/2024/11/miaa077pl.jpg',
  'https://img.supjav.com/images/2024/11/miaa077pl.jpg',
  '2024-11',
  'MOODYZ',
  84,
  84,
  0
from actor_ref
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










