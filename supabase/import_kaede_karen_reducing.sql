-- CineTube import: Kaede Karen reducing-only works
-- Source URL requested by owner: https://javtiful.com/kr/actress/kaede-karen
-- Import rule: only Javtiful reducing-mosaic video cards are included.
-- Actor profile reference: https://www.avdbs.com/menu/actor.php?actor_idx=4981

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
  where name = 'Kaede Karen'
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
    'Kaede Karen',
    26,
    162,
    'B82(D)-W59-H81',
    2018,
    'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/223fc5244b5f8fb47a0593f0df15afb5.jpg',
    array[
      'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/223fc5244b5f8fb47a0593f0df15afb5.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/03/07/6fdc3878d6a4ca737e3835d7b7ae0395.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/02/27/fdf4f6c79c95586ecf6d3fdfea9d041c.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/02/08/2e5ffd9ccd9d3c3f3913e80b931b2463.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/01/10/1c228f8b2bc9d4afcf31b96eaceef442.jpg'
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
    age = 26,
    height_cm = 162,
    body_size = 'B82(D)-W59-H81',
    debut_year = 2018,
    representative_image_url = 'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/223fc5244b5f8fb47a0593f0df15afb5.jpg',
    image_urls = array[
      'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/223fc5244b5f8fb47a0593f0df15afb5.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/03/07/6fdc3878d6a4ca737e3835d7b7ae0395.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/02/27/fdf4f6c79c95586ecf6d3fdfea9d041c.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/02/08/2e5ffd9ccd9d3c3f3913e80b931b2463.jpg',
      'https://javtiful.com/uploads/uploads/videos/thumbs/2026/01/10/1c228f8b2bc9d4afcf31b96eaceef442.jpg'
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
    ('IPZZ-802 DIGITAL CHANNEL DC144 카에데 카렌 아름다운 여신 첫 부카케 해금', 'IPZZ-802', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'A+', 'https://javtiful.com/kr/video/104236/ipzz-802-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2026/03/07/6fdc3878d6a4ca737e3835d7b7ae0395.jpg', '2026-03', 'Idea Pocket', 95, 95),
    ('MIDA-039 카에데 카렌과 새로운 아리. 가장 강한 두 사람. 여신 할렘 금세기 가장 아름다운 언니에 끼워 치녀 Special', 'MIDA-039', array['Kaede Karen', 'Reducing', 'FHD', 'Madonna'], 'A+', 'https://javtiful.com/kr/video/103766/mida-039-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2026/02/27/fdf4f6c79c95586ecf6d3fdfea9d041c.jpg', '2026-02', 'Madonna', 94, 94),
    ('IPZZ-778 압도적이고 미인 가정 교사에게 조련되어 몸도 마음도 의존해 버리는 매도 오나사포 카에데 카렌', 'IPZZ-778', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'A+', 'https://javtiful.com/kr/video/102645/ipzz-778-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2026/02/08/2e5ffd9ccd9d3c3f3913e80b931b2463.jpg', '2026-02', 'Idea Pocket', 93, 93),
    ('IPX-831 실험 문서! ! 24시간 감시 연금 SEX! 1일 통째로 카렌과 야리 먹으면 어떻게 되어 버리는 것인가… 카에데 카렌', 'IPX-831', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'A', 'https://javtiful.com/kr/video/102640/ipx-831-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2026/02/08/cc79f6f0cf208fffdf38838a50a39709.jpg', '2026-02', 'Idea Pocket', 92, 92),
    ('IPZZ-703 카에데 카렌 대난교 해금 노컷 SP 총 16명 20발 오버의 큰 부카케 축제', 'IPZZ-703', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'A', 'https://javtiful.com/kr/video/100888/ipzz-703-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2026/01/10/1c228f8b2bc9d4afcf31b96eaceef442.jpg', '2026-01', 'Idea Pocket', 91, 91),
    ('FSDSS-609 압도적 "미"의 뒤에 숨겨진 에로스 다나카 레몬 AV 데뷔', 'FSDSS-609', array['Kaede Karen', 'Tanaka Lemon', 'Reducing', 'FHD', 'Faleno Star'], 'A', 'https://javtiful.com/kr/video/99780/fsdss-609-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2025/12/21/90bc0f6a62406f6f379caf669879f975.jpg', '2025-12', 'Faleno Star', 90, 90),
    ('IPX-811 - 미약으로 다음날 아침까지 각성 절정', 'IPX-811', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'A', 'https://javtiful.com/kr/video/99711/ipx-811-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2025/12/20/e97ee14077eeb651405f9612bfd1e94c.jpg', '2025-12', 'Idea Pocket', 89, 89),
    ('IPZZ-240 싫어하는 성희롱 상사의 데카말라가 스트라이크 지나서…', 'IPZZ-240', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B+', 'https://javtiful.com/kr/video/99361/ipzz-240-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2025/12/15/20d20328debd381064a369bd47dbafe2.jpg', '2025-12', 'Idea Pocket', 88, 88),
    ('IPX-658 신인 여자 사원에게 초조해 색녀 되어 맞이하는 최고로 깊은 사정', 'IPX-658', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B+', 'https://javtiful.com/kr/video/99358/ipx-658-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2025-12', 'Idea Pocket', 87, 87),
    ('IPX-414 1개월간 금욕하고 그녀가 없는 며칠 동안 그녀의 여동생과 마음이 미칠 정도로 일심불란에 섹스 버렸다 합계 8회의 밀착성교! 카에데 카렌', 'IPX-414', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B+', 'https://javtiful.com/kr/video/99014/ipx-414-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2025-12', 'Idea Pocket', 86, 86),
    ('IPZZ-456 만끽 걸… 몇발 얕아도 돌아주지 않는 끈질긴 추간 피스톤레×프의 비극.', 'IPZZ-456', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B+', 'https://javtiful.com/kr/video/98446/ipzz-456-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2025-12', 'Idea Pocket', 85, 85),
    ('IPX-850 출장처가 기록적 호우로 동정부하와 갑자기 상대방에…', 'IPX-850', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B+', 'https://javtiful.com/kr/video/98440/ipx-850-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2025-12', 'Idea Pocket', 84, 84),
    ('IPZZ-242 교육실습생, 사육중… 가르침에 집단륜 ●레×프된 수영부 고문', 'IPZZ-242', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B+', 'https://javtiful.com/kr/video/97966/ipzz-242-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2025-11', 'Idea Pocket', 83, 83),
    ('IPX-612 사랑하는 학생과 아름다움 여자 교사', 'IPX-612', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B+', 'https://javtiful.com/kr/video/97916/ipx-612-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2025-11', 'Idea Pocket', 82, 82),
    ('IPX-528 죽을 정도로 싫어하는 상사와 출장처의 온천 여관에서 설마의 상방에… 카에데 카렌', 'IPX-528', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B+', 'https://javtiful.com/kr/video/97750/ipx-528-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2025-11', 'Idea Pocket', 81, 81),
    ('IPZZ-677 손이 닿지 않는다고 포기하고 있던 아르바이트 앞의 미인 너무 많은 선배는 취하면 키스마로… 카에데 카렌', 'IPZZ-677', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B', 'https://javtiful.com/kr/video/95532/ipzz-677-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2025-10', 'Idea Pocket', 80, 80),
    ('IPZZ-655 치트급 미약을 담아 키메섹 마사지에 이키 미친 미인 아내 카에데 카렌', 'IPZZ-655', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B', 'https://javtiful.com/kr/video/92850/ipzz-655-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2025-09', 'Idea Pocket', 79, 79),
    ('IPZZ-508 초문제작 해금! ! 가정 방문처의 쓰레기방', 'IPZZ-508', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B', 'https://javtiful.com/kr/video/90962/ipzz-508-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2025-08', 'Idea Pocket', 78, 78),
    ('IPZZ-484 동정 전용 메이드 카렌 씨의 SEX 강의 개인 레슨 하트와 지포를 부드럽게 감싸 주는 최고의 붓 강판 봉사 섹스 카에데 카렌', 'IPZZ-484', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B', 'https://javtiful.com/kr/video/80235/ipzz-484-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2025/03/09/9cbf0a26d43cb74a909aa78b298aa7c2.jpg', '2025-03', 'Idea Pocket', 77, 77),
    ('IPZZ-329 귀엽고 에로틱한 후배 OL을 호텔로 가져가면...도를 넘은 ≪절윤녀≫로 돌아와 토벌에 있었다.', 'IPZZ-329', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B', 'https://javtiful.com/kr/video/76492/ipzz-329-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2025/01/19/e83ee10919b39e1cb82bb149f5da2896.jpg', '2025-01', 'Idea Pocket', 76, 76),
    ('IPX-352 중년 좋아하는 문학 미소녀에게 몸을 움직일 수 없는 상태로 차분히 촉촉하게 색녀가 된다.', 'IPX-352', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B', 'https://javtiful.com/kr/video/76118/ipx-352-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2025/01/16/f504c987ff09a6288ada410b411bb582.jpg', '2025-01', 'Idea Pocket', 75, 75),
    ('IPX-724 다음부터 다음으로 넣는 대신… 카에데 카렌', 'IPX-724', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B', 'https://javtiful.com/kr/video/59562/ipx-724-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2024-05', 'Idea Pocket', 74, 74),
    ('IPX-706 초조해, 초조해, 절정 요구하는 여자의 에로스 확변 오르가즘 일생분의 초절 FUCK 카에데 카렌', 'IPX-706', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B', 'https://javtiful.com/kr/video/59553/ipx-706-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2024-05', 'Idea Pocket', 73, 73),
    ('PFES-065 먹이 T 백의 카 게 키 유혹 사내의 남자 먹는 여자 직원은 먹이 T 백으로 초대하는 여자 카에데 카렌', 'PFES-065', array['Kaede Karen', 'Reducing', 'FHD'], 'B', 'https://javtiful.com/kr/video/57894/pfes-065-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2024-04', null, 72, 72),
    ('FSDSS-638 다나카 레몬의 압도적인 아름다움과 S 카와 색녀 테크로 오로지 타락하고 싶다', 'FSDSS-638', array['Kaede Karen', 'Tanaka Lemon', 'Reducing', 'FHD', 'Faleno Star'], 'B', 'https://javtiful.com/kr/video/42988/fsdss-638-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2023/09/25/0c4b7350b5e8d84fa917793ef51917fe.jpg', '2023-09', 'Faleno Star', 71, 71),
    ('IPX-534 죽을 정도로 기분 나쁜 상사의 데카틴에 여러 번 오징어되는 굴욕 레', 'IPX-534', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B', 'https://javtiful.com/kr/video/41857/ipx-534-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2023/09/10/87bea3abcb24d51f23d02b2d89155b52.jpg', '2023-09', 'Idea Pocket', 70, 70),
    ('IPX-596 미인 가정 교사 카렌 선생님의 키스 강의 개인 레슨 카에데 카렌', 'IPX-596', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B', 'https://javtiful.com/kr/video/34283/ipx-596-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2023/06/08/c1d4266b49d9e54103a32a6fc002b753.jpg', '2023-06', 'Idea Pocket', 69, 69),
    ('IPX-278 백의의 신 대응 무방비인 티라리즘으로 항상 유혹해 버리는 천연 순수 간호사 당신 시선의 주관 영상도! 카에데 카렌', 'IPX-278', array['Kaede Karen', 'Reducing', 'FHD', 'Idea Pocket'], 'B', 'https://javtiful.com/kr/video/34156/ipx-278-reducing-mosaic', 'Reducing-mosaic work imported from the Kaede Karen public actress page.', null, '2023-06', 'Idea Pocket', 68, 68)
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










