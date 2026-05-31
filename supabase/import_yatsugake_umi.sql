-- CineTube import: Yatsugake Umi
-- Source URL requested by owner: https://javtiful.com/kr/actress/yatsugake-umi
-- Supplemental public references used for profile/movie metadata:
-- - https://www.gravurefit.com/en/profile/yatsugake-umi/
-- - https://www.javdatabase.com/movies/abf-109/

insert into public.categories (
  category_code,
  name,
  is_visible
)
values (
  'prestige-exclusive',
  'Prestige Exclusive',
  true
)
on conflict (category_code) do update set
  name = excluded.name,
  is_visible = excluded.is_visible;

with existing_actor as (
  select id
  from public.actors
  where name = 'Yatsugake Umi'
  limit 1
),
actor_insert as (
  insert into public.actors (
    name,
    age,
    height_cm,
    body_size,
    debut_year,
    image_urls,
    image_asset_ids
  )
  select
    'Yatsugake Umi',
    25,
    160,
    'B80(C)-W57-H85',
    2020,
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
  release_month,
  production_company,
  recommendation_score
)
select
  movie.title,
  movie.movie_code,
  'prestige-exclusive',
  actor_ref.id,
  movie.keywords,
  'B',
  movie.video_url,
  movie.description,
  movie.poster_url,
  movie.release_month,
  'Prestige',
  70
from actor_ref
cross join (
  values
    (
      'ABF-270 성욕에 지배된 미대생 커플의 동거 질 내 사정 성교록. 하치카케 우미',
      'ABF-270',
      array['Umi Yatsugake', 'Prestige', 'Featured Actress'],
      'https://javtiful.com/kr/video/94468/abf-270',
      'Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/09/25/87f051985acae6ad87451ad544a1cd2c.jpg',
      '2026'
    ),
    (
      'ABF-260 신 테크 단지 10 분간 참을 수 있다면 ... 보상 나마 질 내 사정',
      'ABF-260',
      array['Umi Yatsugake', 'Prestige', 'Featured Actress'],
      'https://javtiful.com/kr/video/91587/abf-260',
      'Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/08/21/92b19ba9a184d47fa78eea174e1d3ba9.jpg',
      '2026'
    ),
    (
      'ABF-251 아저씨가 좋아 깜짝 미소녀와 이챠베로 3실전',
      'ABF-251',
      array['Umi Yatsugake', 'Prestige', 'Featured Actress'],
      'https://javtiful.com/kr/video/89616/abf-251',
      'Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/07/24/aa44a435658f56522afae559b30e6221.jpg',
      '2025'
    ),
    (
      'ABF-241 아침 발치치 ○ 포에서 일어나서 하메 걷는 토요일.',
      'ABF-241',
      array['Umi Yatsugake', 'Prestige', 'Featured Actress'],
      'https://javtiful.com/kr/video/87724/abf-241',
      'Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/06/26/2417207d15546f21d143f9f44d56473a.jpg',
      '2025'
    ),
    (
      'ABF-231 설마의, 뒤 옵 유혹',
      'ABF-231',
      array['Umi Yatsugake', 'Prestige', 'Featured Actress'],
      'https://javtiful.com/kr/video/85481/abf-231',
      'Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/05/22/002d1d7fe76caf242b6d5015a89ce07e.jpg',
      '2025'
    ),
    (
      'ABF-109 작은 악마 미소녀에게 이성이 망가질수록 농락당한다.',
      'ABF-109',
      array['Cosplay Drama', 'Featured Actress', 'Slender', 'Uniform', 'Umi Yatsugake'],
      'https://javtiful.com/kr/video/60279/abf-109',
      'Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2024/05/30/1aa1744757655a72e6c73fe1c176ad9a.jpg',
      '2024-05'
    )
) as movie(title, movie_code, keywords, video_url, description, poster_url, release_month)
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
