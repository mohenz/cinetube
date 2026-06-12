-- CineTube import: Horisawa Mayu MissAV reducing-only works
-- Source URL requested by owner: https://missav.to/actress/horisawa-mayu/movie
-- Import rule: only visible MissAV actress page cards with the [Reducing] label are included.

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
  where name = 'Horisawa Mayu'
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
    'Horisawa Mayu',
    0,
    0,
    '',
    0,
    null,
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
  click_count,
  is_main
)
select
  movie.title,
  movie.movie_code,
  'reducing-mosaic',
  actor_ref.id,
  movie.keywords,
  'B+',
  movie.video_url,
  movie.description,
  movie.poster_url,
  movie.poster_url,
  movie.poster_url,
  '',
  'MissAV',
  84,
  84,
  0,
  false
from actor_ref
cross join (
  values
    (
      'FSDSS-345 First Service On The First Day Of Entering The Store. Super Luxury Soapland''s First Princess Continuous Shooting 120 Minutes Course Mayu Horizawa',
      'FSDSS-345',
      array['MissAV', 'Reducing', 'Reducing Mosaic', 'Horisawa Mayu', 'Mayu Horizawa', 'FSDSS-345'],
      'https://missav.to/watch/v5Kjh/fsdss-345r',
      'Horisawa Mayu Reducing listing imported from the visible MissAV actress page.',
      'https://cdn.missav.to/thumb/upload/xR9O8.jpg'
    ),
    (
      'FSDSS-344 This Is My First Time ... 3 Production Specials For Sexual Development Full Of First Time! !! Mayu Horizawa',
      'FSDSS-344',
      array['MissAV', 'Reducing', 'Reducing Mosaic', 'Horisawa Mayu', 'Mayu Horizawa', 'FSDSS-344'],
      'https://missav.to/watch/v5Kfz/fsdss-344r',
      'Horisawa Mayu Reducing listing imported from the visible MissAV actress page.',
      'https://cdn.missav.to/thumb/upload/xR9JA.jpg'
    ),
    (
      'FSDSS-343 Rookie H Curious Almost Virgin Mayu Horizawa AV Debut',
      'FSDSS-343',
      array['MissAV', 'Reducing', 'Reducing Mosaic', 'Horisawa Mayu', 'Mayu Horizawa', 'FSDSS-343'],
      'https://missav.to/watch/v5KdV/fsdss-343r',
      'Horisawa Mayu Reducing listing imported from the visible MissAV actress page.',
      'https://cdn.missav.to/thumb/upload/xR9GW.jpg'
    ),
    (
      'MXGS-1257 Papa Katsu, Who Came To The Desire For Money With A Light Feeling. Female College Student Mayu Case.7 Mayu Horisawa',
      'MXGS-1257',
      array['MissAV', 'Reducing', 'Reducing Mosaic', 'Horisawa Mayu', 'Mayu Horisawa', 'MXGS-1257'],
      'https://missav.to/watch/v5IcW/mxgs-1257r',
      'Horisawa Mayu Reducing listing imported from the visible MissAV actress page.',
      'https://cdn.missav.to/thumb/upload/xR7z4.jpg'
    ),
    (
      'NACR-596 I Love Cum! Dirty Girl For Free! ! Mayu Horisawa',
      'NACR-596',
      array['MissAV', 'Reducing', 'Reducing Mosaic', 'Horisawa Mayu', 'Mayu Horisawa', 'NACR-596'],
      'https://missav.to/watch/v5HBz/nacr-596r',
      'Horisawa Mayu Reducing listing imported from the visible MissAV actress page.',
      'https://cdn.missav.to/thumb/upload/xR6U9.jpg'
    ),
    (
      'MDTM-786 A Student Who Wears A Uniform Is A Convenient Friend. Mayu Horisawa 02',
      'MDTM-786',
      array['MissAV', 'Reducing', 'Reducing Mosaic', 'Horisawa Mayu', 'Mayu Horisawa', 'MDTM-786'],
      'https://missav.to/watch/v5GVr/mdtm-786r',
      'Horisawa Mayu Reducing listing imported from the visible MissAV actress page.',
      'https://cdn.missav.to/thumb/upload/xR69f.jpg'
    ),
    (
      'NACR-576 Squeeze The Semen Until The Ball Is Empty! Business Trip Oil Massage Mayu Horisawa',
      'NACR-576',
      array['MissAV', 'Reducing', 'Reducing Mosaic', 'Horisawa Mayu', 'Mayu Horisawa', 'NACR-576'],
      'https://missav.to/watch/v5GIh/nacr-576r',
      'Horisawa Mayu Reducing listing imported from the visible MissAV actress page.',
      'https://cdn.missav.to/thumb/upload/xR5Uw.jpg'
    ),
    (
      'WAAA-188 Eh! You Have Put It Out To Naka Right Now, Right? !! Mayu Horizawa',
      'WAAA-188',
      array['MissAV', 'Reducing', 'Reducing Mosaic', 'Horisawa Mayu', 'Mayu Horizawa', 'WAAA-188'],
      'https://missav.to/watch/v5CiB/waaa-188r',
      'Horisawa Mayu Reducing listing imported from the visible MissAV actress page.',
      'https://cdn.missav.to/thumb/upload/xR103.jpg'
    ),
    (
      'EKDV-686 Seeding A New Maid Who Came With Hope From Morning Till Night Convulsive Treatment Training A Man Who Feels Only Disgust Commits so Much That He Wants To Cry Mayu Horizawa',
      'EKDV-686',
      array['MissAV', 'Reducing', 'Reducing Mosaic', 'Horisawa Mayu', 'Mayu Horizawa', 'EKDV-686'],
      'https://missav.to/watch/v5AY8/ekdv-686r',
      'Horisawa Mayu Reducing listing imported from the visible MissAV actress page.',
      'https://cdn.missav.to/thumb/upload/xQZyY.jpg'
    ),
    (
      'FSDSS-399 Convulsions Copulation, Climax Tide, Group Drive Squid Mayu Horizawa',
      'FSDSS-399',
      array['MissAV', 'Reducing', 'Reducing Mosaic', 'Horisawa Mayu', 'Mayu Horizawa', 'FSDSS-399'],
      'https://missav.to/watch/v5kjZ/fsdss-399r',
      'Horisawa Mayu Reducing listing imported from the visible MissAV actress page.',
      'https://cdn.missav.to/thumb/upload/xQIjq.jpg'
    )
) as movie(title, movie_code, keywords, video_url, description, poster_url)
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
  click_count = excluded.click_count,
  is_main = excluded.is_main;










