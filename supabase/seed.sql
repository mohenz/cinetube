-- CineTube Database Seed Script
-- Copy and run this script in your Supabase SQL Editor to populate the database with premium initial data.
-- Ensure you have run schema.sql first before executing this seed file.

-- 1. Seed Categories
insert into public.categories (category_code, name, representative_image_url, is_visible) values
  ('ACT', '액션', 'https://picsum.photos/seed/cinetube-action/1400/760', true),
  ('DRM', '드라마', 'https://picsum.photos/seed/cinetube-drama/1400/760', true),
  ('SCI', 'SF', 'https://picsum.photos/seed/cinetube-sci-fi/1400/760', true),
  ('THR', '스릴러', 'https://picsum.photos/seed/cinetube-thriller/1400/760', true),
  ('ROM', '로맨스', 'https://picsum.photos/seed/cinetube-romance/1400/760', true),
  ('DOC', '다큐멘터리', 'https://picsum.photos/seed/cinetube-documentary/1400/760', true)
on conflict (category_code) do update set
  name = excluded.name,
  representative_image_url = excluded.representative_image_url,
  is_visible = excluded.is_visible;

-- 2. Seed Actors (Use OVERRIDING SYSTEM VALUE to preserve explicitly defined IDs)
insert into public.actors (id, name, age, height_cm, body_size, debut_year, representative_image_url, image_urls) overriding system value values
  (1, '한서윤', 32, 168, '34-24-35', 2014, 'https://picsum.photos/seed/actor-han/600/900', array['https://picsum.photos/seed/actor-han-1/600/900', 'https://picsum.photos/seed/actor-han-2/600/900', 'https://picsum.photos/seed/actor-han-3/600/900', 'https://picsum.photos/seed/actor-han-4/600/900']),
  (2, '이도현', 36, 181, '40-31-38', 2011, 'https://picsum.photos/seed/actor-lee/600/900', array['https://picsum.photos/seed/actor-lee-1/600/900', 'https://picsum.photos/seed/actor-lee-2/600/900', 'https://picsum.photos/seed/actor-lee-3/600/900', 'https://picsum.photos/seed/actor-lee-4/600/900']),
  (3, '정하린', 29, 171, '33-23-34', 2018, 'https://picsum.photos/seed/actor-jung/600/900', array['https://picsum.photos/seed/actor-jung-1/600/900', 'https://picsum.photos/seed/actor-jung-2/600/900', 'https://picsum.photos/seed/actor-jung-3/600/900', 'https://picsum.photos/seed/actor-jung-4/600/900']),
  (4, '강민재', 41, 178, '39-32-37', 2009, 'https://picsum.photos/seed/actor-kang/600/900', array['https://picsum.photos/seed/actor-kang-1/600/900', 'https://picsum.photos/seed/actor-kang-2/600/900', 'https://picsum.photos/seed/actor-kang-3/600/900', 'https://picsum.photos/seed/actor-kang-4/600/900']),
  (5, '오지안', 34, 166, '32-24-34', 2013, 'https://picsum.photos/seed/actor-oh/600/900', array['https://picsum.photos/seed/actor-oh-1/600/900', 'https://picsum.photos/seed/actor-oh-2/600/900', 'https://picsum.photos/seed/actor-oh-3/600/900', 'https://picsum.photos/seed/actor-oh-4/600/900']),
  (6, '문태오', 38, 184, '41-33-39', 2010, 'https://picsum.photos/seed/actor-moon/600/900', array['https://picsum.photos/seed/actor-moon-1/600/900', 'https://picsum.photos/seed/actor-moon-2/600/900', 'https://picsum.photos/seed/actor-moon-3/600/900', 'https://picsum.photos/seed/actor-moon-4/600/900'])
on conflict (id) do update set
  name = excluded.name,
  age = excluded.age,
  height_cm = excluded.height_cm,
  body_size = excluded.body_size,
  debut_year = excluded.debut_year,
  representative_image_url = excluded.representative_image_url,
  image_urls = excluded.image_urls;

-- Adjust the auto-increment identity sequence for actors so subsequent UI creations start at ID 7
select setval(pg_get_serial_sequence('public.actors', 'id'), coalesce(max(id), 1)) from public.actors;

-- 3. Seed Default Rating Grades
insert into public.rating_grades (grade, display_order) values
  ('A+', 1),
  ('A', 2),
  ('B+', 3),
  ('B', 4),
  ('C', 5)
on conflict (grade) do update set
  display_order = excluded.display_order;

-- 4. Seed Movies (Use OVERRIDING SYSTEM VALUE to preserve explicitly defined IDs)
insert into public.movies (id, title, movie_code, category_code, actor_id, keywords, rating_grade, video_url, description, poster_url, capture_url, snapshot_url, release_month, production_company, recommendation_score, created_at) overriding system value values
  (1, '미드나잇 에코', 'MV-0001', 'ACT', 1, array['시네마틱', '프리미엄', 'act'], 'A+', 'https://www.youtube.com/watch?v=demo1', '미드나잇 에코은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-1-미드나잇 에코/600/900', 'https://picsum.photos/seed/capture-1/1400/760', 'https://picsum.photos/seed/snapshot-1/1400/760', '2021-02', 'CineWorks', 100, now() - interval '0 days'),
  (2, '붉은 궤도', 'MV-0002', 'SCI', 2, array['시네마틱', '프리미엄', 'sci'], 'A', 'https://www.youtube.com/watch?v=demo2', '붉은 궤도은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-2-붉은 궤도/600/900', 'https://picsum.photos/seed/capture-2/1400/760', 'https://picsum.photos/seed/snapshot-2/1400/760', '2022-03', 'Frame Lab', 99, now() - interval '1 days'),
  (3, '라스트 시그널', 'MV-0003', 'THR', 3, array['시네마틱', '프리미엄', 'thr'], 'B+', 'https://www.youtube.com/watch?v=demo3', '라스트 시그널은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-3-라스트 시그널/600/900', 'https://picsum.photos/seed/capture-3/1400/760', 'https://picsum.photos/seed/snapshot-3/1400/760', '2023-04', 'Nova Pictures', 98, now() - interval '2 days'),
  (4, '겨울의 프레임', 'MV-0004', 'DRM', 4, array['시네마틱', '프리미엄', 'drm'], 'A', 'https://www.youtube.com/watch?v=demo4', '겨울의 프레임은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-4-겨울의 프레임/600/900', 'https://picsum.photos/seed/capture-4/1400/760', 'https://picsum.photos/seed/snapshot-4/1400/760', '2024-05', 'Studio Red', 97, now() - interval '3 days'),
  (5, '블루 아카이브', 'MV-0005', 'DOC', 5, array['시네마틱', '프리미엄', 'doc'], 'B', 'https://www.youtube.com/watch?v=demo5', '블루 아카이브은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-5-블루 아카이브/600/900', 'https://picsum.photos/seed/capture-5/1400/760', 'https://picsum.photos/seed/snapshot-5/1400/760', '2025-06', 'CineWorks', 96, now() - interval '4 days'),
  (6, '시티 오브 노바', 'MV-0006', 'SCI', 6, array['시네마틱', '프리미엄', 'sci'], 'A+', 'https://www.youtube.com/watch?v=demo6', '시티 오브 노바은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-6-시티 오브 노바/600/900', 'https://picsum.photos/seed/capture-6/1400/760', 'https://picsum.photos/seed/snapshot-6/1400/760', '2020-07', 'Frame Lab', 95, now() - interval '5 days'),
  (7, '하이라이트 원', 'MV-0007', 'ACT', 2, array['시네마틱', '프리미엄', 'act'], 'B+', 'https://www.youtube.com/watch?v=demo7', '하이라이트 원은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-7-하이라이트 원/600/900', 'https://picsum.photos/seed/capture-7/1400/760', 'https://picsum.photos/seed/snapshot-7/1400/760', '2021-08', 'Nova Pictures', 94, now() - interval '6 days'),
  (8, '그날의 컷', 'MV-0008', 'ROM', 1, array['시네마틱', '프리미엄', 'rom'], 'A', 'https://www.youtube.com/watch?v=demo8', '그날의 컷은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-8-그날의 컷/600/900', 'https://picsum.photos/seed/capture-8/1400/760', 'https://picsum.photos/seed/snapshot-8/1400/760', '2022-09', 'Studio Red', 93, now() - interval '7 days'),
  (9, '오프닝 나이트', 'MV-0009', 'DRM', 3, array['시네마틱', '프리미엄', 'drm'], 'B', 'https://www.youtube.com/watch?v=demo9', '오프닝 나이트은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-9-오프닝 나이트/600/900', 'https://picsum.photos/seed/capture-9/1400/760', 'https://picsum.photos/seed/snapshot-9/1400/760', '2023-10', 'CineWorks', 92, now() - interval '8 days'),
  (10, '스틸 레인', 'MV-0010', 'THR', 4, array['시네마틱', '프리미엄', 'thr'], 'A+', 'https://www.youtube.com/watch?v=demo10', '스틸 레인은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-10-스틸 레인/600/900', 'https://picsum.photos/seed/capture-10/1400/760', 'https://picsum.photos/seed/snapshot-10/1400/760', '2024-11', 'Frame Lab', 91, now() - interval '9 days'),
  (11, '모션 로그', 'MV-0011', 'DOC', 6, array['시네마틱', '프리미엄', 'doc'], 'C', 'https://www.youtube.com/watch?v=demo11', '모션 로그은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-11-모션 로그/600/900', 'https://picsum.photos/seed/capture-11/1400/760', 'https://picsum.photos/seed/snapshot-11/1400/760', '2025-12', 'Nova Pictures', 90, now() - interval '10 days'),
  (12, '더블 익스포저', 'MV-0012', 'THR', 5, array['시네마틱', '프리미엄', 'thr'], 'B+', 'https://www.youtube.com/watch?v=demo12', '더블 익스포저은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-12-더블 익스포저/600/900', 'https://picsum.photos/seed/capture-12/1400/760', 'https://picsum.photos/seed/snapshot-12/1400/760', '2020-01', 'Studio Red', 89, now() - interval '11 days'),
  (13, '제로 컷', 'MV-0013', 'ACT', 1, array['시네마틱', '프리미엄', 'act'], 'A', 'https://www.youtube.com/watch?v=demo13', '제로 컷은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-13-제로 컷/600/900', 'https://picsum.photos/seed/capture-13/1400/760', 'https://picsum.photos/seed/snapshot-13/1400/760', '2021-02', 'CineWorks', 88, now() - interval '12 days'),
  (14, '세컨드 문', 'MV-0014', 'SCI', 3, array['시네마틱', '프리미엄', 'sci'], 'B', 'https://www.youtube.com/watch?v=demo14', '세컨드 문은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-14-세컨드 문/600/900', 'https://picsum.photos/seed/capture-14/1400/760', 'https://picsum.photos/seed/snapshot-14/1400/760', '2022-03', 'Frame Lab', 87, now() - interval '13 days'),
  (15, '라이트 폴', 'MV-0015', 'ROM', 2, array['시네마틱', '프리미엄', 'rom'], 'A+', 'https://www.youtube.com/watch?v=demo15', '라이트 폴은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-15-라이트 폴/600/900', 'https://picsum.photos/seed/capture-15/1400/760', 'https://picsum.photos/seed/snapshot-15/1400/760', '2023-04', 'Nova Pictures', 86, now() - interval '14 days'),
  (16, '씬 넘버 42', 'MV-0016', 'DRM', 6, array['시네마틱', '프리미엄', 'drm'], 'B+', 'https://www.youtube.com/watch?v=demo16', '씬 넘버 42은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-16-씬 넘버 42/600/900', 'https://picsum.photos/seed/capture-16/1400/760', 'https://picsum.photos/seed/snapshot-16/1400/760', '2024-05', 'Studio Red', 85, now() - interval '15 days'),
  (17, '플래시백 코드', 'MV-0017', 'SCI', 4, array['시네마틱', '프리미엄', 'sci'], 'A', 'https://www.youtube.com/watch?v=demo17', '플래시백 코드은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-17-플래시백 코드/600/900', 'https://picsum.photos/seed/capture-17/1400/760', 'https://picsum.photos/seed/snapshot-17/1400/760', '2025-06', 'CineWorks', 84, now() - interval '16 days'),
  (18, '블랙 테이프', 'MV-0018', 'THR', 1, array['시네마틱', '프리미엄', 'thr'], 'B', 'https://www.youtube.com/watch?v=demo18', '블랙 테이프은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-18-블랙 테이프/600/900', 'https://picsum.photos/seed/capture-18/1400/760', 'https://picsum.photos/seed/snapshot-18/1400/760', '2020-07', 'Frame Lab', 83, now() - interval '17 days'),
  (19, '시네마 노트', 'MV-0019', 'DOC', 5, array['시네마틱', '프리미엄', 'doc'], 'A', 'https://www.youtube.com/watch?v=demo19', '시네마 노트은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-19-시네마 노트/600/900', 'https://picsum.photos/seed/capture-19/1400/760', 'https://picsum.photos/seed/snapshot-19/1400/760', '2021-08', 'Nova Pictures', 82, now() - interval '18 days'),
  (20, '네온 러너', 'MV-0020', 'ACT', 6, array['시네마틱', '프리미엄', 'act'], 'A+', 'https://www.youtube.com/watch?v=demo20', '네온 러너은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-20-네온 러너/600/900', 'https://picsum.photos/seed/capture-20/1400/760', 'https://picsum.photos/seed/snapshot-20/1400/760', '2022-09', 'Studio Red', 81, now() - interval '19 days'),
  (21, '딥 포커스', 'MV-0021', 'DRM', 2, array['시네마틱', '프리미엄', 'drm'], 'B+', 'https://www.youtube.com/watch?v=demo21', '딥 포커스은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-21-딥 포커스/600/900', 'https://picsum.photos/seed/capture-21/1400/760', 'https://picsum.photos/seed/snapshot-21/1400/760', '2023-10', 'CineWorks', 80, now() - interval '20 days'),
  (22, '엔딩 크레딧', 'MV-0022', 'ROM', 3, array['시네마틱', '프리미엄', 'rom'], 'B', 'https://www.youtube.com/watch?v=demo22', '엔딩 크레딧은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-22-엔딩 크레딧/600/900', 'https://picsum.photos/seed/capture-22/1400/760', 'https://picsum.photos/seed/snapshot-22/1400/760', '2024-11', 'Frame Lab', 79, now() - interval '21 days'),
  (23, '스냅샷 1999', 'MV-0023', 'DOC', 4, array['시네마틱', '프리미엄', 'doc'], 'C', 'https://www.youtube.com/watch?v=demo23', '스냅샷 1999은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-23-스냅샷 1999/600/900', 'https://picsum.photos/seed/capture-23/1400/760', 'https://picsum.photos/seed/snapshot-23/1400/760', '2025-12', 'Nova Pictures', 78, now() - interval '22 days'),
  (24, '페일 블루 씬', 'MV-0024', 'SCI', 5, array['시네마틱', '프리미엄', 'sci'], 'A', 'https://www.youtube.com/watch?v=demo24', '페일 블루 씬은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.', 'https://picsum.photos/seed/movie-24-페일 블루 씬/600/900', 'https://picsum.photos/seed/capture-24/1400/760', 'https://picsum.photos/seed/snapshot-24/1400/760', '2020-01', 'Studio Red', 77, now() - interval '23 days')
on conflict (id) do update set
  title = excluded.title,
  movie_code = excluded.movie_code,
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
  created_at = excluded.created_at;

-- Adjust the auto-increment identity sequence for movies so subsequent UI creations start at ID 25
select setval(pg_get_serial_sequence('public.movies', 'id'), coalesce(max(id), 1)) from public.movies;
