-- CineTube import: Toujou Natsu reducing-only works
-- Source URL requested by owner: https://javtiful.com/kr/actress/toujou-natsu
-- Import rule: only Javtiful reducing-mosaic video cards are included.
-- Representative image source:
-- - https://javtiful.com/kr/actress/toujou-natsu

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
  where name = 'Toujou Natsu'
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
    'Toujou Natsu',
    0,
    0,
    '',
    0,
    'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/fa4dc212dbdded487821f6416363b18f.jpg',
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
    representative_image_url = 'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/fa4dc212dbdded487821f6416363b18f.jpg'
  where id in (select id from actor_ref)
  returning id
)
insert into public.movies (
  title,
  movie_code,
  category_code,
  actor_id,
  actor_ids,
  director_names,
  source_url,
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
  rotten_tomatoes_score,
  ranking_score,
  click_count,
  is_main
)
select
  movie.title,
  movie.movie_code,
  'reducing-mosaic',
  actor_ref.id,
  array[actor_ref.id],
  '{}'::text[],
  movie.video_url,
  movie.keywords,
  'B+',
  movie.video_url,
  movie.description,
  movie.poster_url,
  movie.poster_url,
  movie.poster_url,
  '',
  'Javtiful',
  84,
  null,
  84,
  0,
  false
from actor_ref
cross join (
  values
    (
      'HMN-435 손님이 있었는데도... 편의점에서 일하는 동안 정액량을 두 배로 늘려주는 최음제를 마셨고, 내가 증오하는 매니저도 증오하고, 게다가 짧은 시간 동안 일도 했어.',
      'HMN-435',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'HMN-435'],
      'https://javtiful.com/kr/video/108239/hmn-435-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/05/21/8d4a4e84b8c42bee856a6d5cd855c203-sm.jpg'
    ),
    (
      'DASS-863 드 M 잡어 남자의 지 ○ 포 붕괴하고 천국 이키시키는 매도 미지근한 풍속 랜드 도조 나츠',
      'DASS-863',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'DASS-863'],
      'https://javtiful.com/kr/video/102756/dass-863-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/02/11/8c2aa75d21add0593a04ac6b3fd765d6-sm.jpg'
    ),
    (
      'HMN-774 빚의 카타에 미친 부자에 빠지는 와타시. ～임신하면 추가 보수라고 해서 위험 일종 붙이 레 프를 받아들여진 제복 미소녀～ 도죠 나츠',
      'HMN-774',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'HMN-774'],
      'https://javtiful.com/kr/video/101872/hmn-774-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/01/27/35029e22c6b2fcc3d13639d8ba1848bc-sm.jpg'
    ),
    (
      'DASS-859 귀성처의 드 시골에서 첫사랑 언니와의 「굳이 갓 H」에 빠져서 1발, 2발, 3발과 땀 투성이로 몇번이나 질 내 사정했다...잊을 수 없는, 여름. 도죠 나츠',
      'DASS-859',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'DASS-859'],
      'https://javtiful.com/kr/video/101297/dass-859-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/01/17/7ce4a7f9d29e69e1d27d8ee4388c7b06-sm.jpg'
    ),
    (
      'HMN-743 불꽃 놀이의 밤, 미친 갑작스러운 폭우',
      'HMN-743',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'HMN-743'],
      'https://javtiful.com/kr/video/98036/hmn-743-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/11/23/7b0967572d01de3e43d1bed4b48f8246-sm.jpg'
    ),
    (
      'HMN-740 부드러운 운전 아버지에게 소중한 그녀를 헌상시켜 질 내 사정 SEX에서 오징어 되는 차 밖에서 감시 역할을 하게 된 나는 그 후, 몇번이나 몇번이나 도라레코 NTR 영상 울 발기 자위 해 버렸다. 도죠 나츠',
      'HMN-740',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'HMN-740'],
      'https://javtiful.com/kr/video/96450/hmn-740-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/10/27/16a7839a9c5cff967527538f6e5658da-sm.jpg'
    ),
    (
      'HMN-664 이웃의 귀여운 언니와 남성 에스테틱으로 재회, 동거 중인 남자친구에게 거짓말을 해서 편의점에 가는 10분 사이에 자택 뒤 옵 실전으로 매일시 단질 내 사정 히가시죠 나츠',
      'HMN-664',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'HMN-664'],
      'https://javtiful.com/kr/video/96361/hmn-664-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/10/26/c54e77b746c7f86d731afb3dfed49883-sm.jpg'
    ),
    (
      'HMN-469 몸 대신 질 내 사정 처치 하녀 아버지를 지키기 위해 싫어하는 키모 아야지에게 마 ○ 고를 내밀었던 유니폼 미소녀 도죠 나츠',
      'HMN-469',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'HMN-469'],
      'https://javtiful.com/kr/video/95742/hmn-469-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/10/16/2954b941e7b028dcf2c23ec3ec7052eb-sm.jpg'
    ),
    (
      'DASS-785 변녀 생활. 냄새, 더러운, 거절할 수 없습니다. 저희 부원 전용의 저즙 메기 처리 매니저 취임 축하합니다! 도죠 나츠',
      'DASS-785',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'DASS-785'],
      'https://javtiful.com/kr/video/95734/dass-785-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/10/16/724587064df647915617744c7001021d-sm.jpg'
    ),
    (
      'HMN-684 최음제 시샤로 망가지는 처음의 최음 시샤가 청순 이미지를 바꾸는 후나후냐 키마와 난교 키메섹 질 내 사정한 도죠 나츠의 하루 밀착 문서',
      'HMN-684',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'HMN-684'],
      'https://javtiful.com/kr/video/91891/hmn-684-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/08/24/31c92455b08980ba238a83dd69ab10b2-sm.jpg'
    ),
    (
      'HMN-725 아내의 동반자는, 둘만이 되면 노판 노브라로 응석해 오지 않는 아이… 남자를 모르는 순심의 딸의 구애다이슈키 홀드 성교에 늪 질 내 사정 버렸다. 도죠 나츠',
      'HMN-725',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'HMN-725'],
      'https://javtiful.com/kr/video/89523/hmn-725-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/07/21/7af44a5689fd3084d129091dbd144822-sm.jpg'
    ),
    (
      'HNDS-182 소리 내면 질 내 사정!',
      'HNDS-182',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'HNDS-182'],
      'https://javtiful.com/kr/video/88975/hnds-182-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/07/13/a65d909e3fe258ced4fe44d72c42457d-sm.jpg'
    ),
    (
      'HMN-709 콘돔의 붙이는 방법을 가르쳐 주었는데!애녀의 언니가 대학 데뷔를 완수하면… 남은 성욕이 폭발!',
      'HMN-709',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'HMN-709'],
      'https://javtiful.com/kr/video/87494/hmn-709-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/06/21/f394531e4f8da986bac7dd4213afcba0-sm.jpg'
    ),
    (
      'NHDTB-953 여자 목욕탕에서 악한 오줌을주는 합숙 여자를 잡아 하메하면서 청소의 형',
      'NHDTB-953',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'NHDTB-953'],
      'https://javtiful.com/kr/video/85376/nhdtb-953-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/05/20/9c52b408de973ecd5907e83a607837b7-sm.jpg'
    ),
    (
      'DASS-574 남자 싫어하는 날씬한 미유의 아들에게 미약을 ● 시켜 일주일. 자궁이 쑤시고 이성을 잃은 딸은 싫어하면서도 내 거근을 요구하게 됐다. 도죠 나츠',
      'DASS-574',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'DASS-574'],
      'https://javtiful.com/kr/video/81460/dass-574-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2025/03/27/eb5d8db697767f21abbc76e4ba551770-sm.jpg'
    ),
    (
      'JUL-896 되살아나기 8년 전의 악몽―. 거식을 앞둔 신혼 아내는, 강의의 형기를 마친 의형에게 종부 추간 레×프되어… 도죠 나츠',
      'JUL-896',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'JUL-896'],
      'https://javtiful.com/kr/video/79046/jul-896-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/assets/front/media/video-thumb-placeholder.svg'
    ),
    (
      'HMN-649 매일 나를 간병해 주는 첫사랑 간호사가 게스 의원장의 절륜 중년 아버지에 한밤중의 빈 병실에서 압박 피스톤! 브리브리 정자가 역류할 때까지 씨앗 프레스 되고 있었다… 야근 NTR 도조 나츠',
      'HMN-649',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'HMN-649'],
      'https://javtiful.com/kr/video/78561/hmn-649-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/assets/front/media/video-thumb-placeholder.svg'
    ),
    (
      'DASS-231 무방비에 검은 팬티 스타킹을 보여주는 언니의 큰 엉덩이를 쓰러뜨리고 질 내 사정해 버린 나. 도죠 나츠',
      'DASS-231',
      array['Javtiful', 'Reducing', 'Reducing Mosaic', 'Toujou Natsu', 'DASS-231'],
      'https://javtiful.com/kr/video/44932/dass-231-reducing-mosaic',
      'Toujou Natsu Reducing Mosaic listing imported from Javtiful.',
      'https://javtiful.com/assets/front/media/video-thumb-placeholder.svg'
    )
) as movie(title, movie_code, keywords, video_url, description, poster_url)
on conflict (movie_code) do update set
  title = excluded.title,
  category_code = excluded.category_code,
  actor_id = excluded.actor_id,
  actor_ids = excluded.actor_ids,
  director_names = excluded.director_names,
  source_url = excluded.source_url,
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
  rotten_tomatoes_score = excluded.rotten_tomatoes_score,
  ranking_score = excluded.ranking_score,
  click_count = excluded.click_count,
  is_main = excluded.is_main;
