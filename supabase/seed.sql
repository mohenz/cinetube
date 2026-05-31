-- CineTube Database Seed Script (Real Cinematic Masterpieces)
-- Copy and run this script in your Supabase SQL Editor to populate the database with premium initial data.
-- Ensure you have run schema.sql first before executing this seed file.

-- 1. Seed Categories
insert into public.categories (category_code, name, representative_image_url, is_visible) values
  ('ACT', '액션', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1400&q=80', true),
  ('DRM', '드라마', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1400&q=80', true),
  ('SCI', 'SF', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1400&q=80', true),
  ('THR', '스릴러', 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=1400&q=80', true),
  ('ROM', '로맨스', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1400&q=80', true),
  ('DOC', '다큐멘터리', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1400&q=80', true)
on conflict (category_code) do update set
  name = excluded.name,
  representative_image_url = excluded.representative_image_url,
  is_visible = excluded.is_visible;

-- 2. Seed Real Actors (Use OVERRIDING SYSTEM VALUE to preserve explicitly defined IDs)
insert into public.actors (id, name, age, height_cm, body_size, debut_year, representative_image_url, image_urls) overriding system value values
  (1, '송강호', 59, 180, '42-34-40', 1996, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80', array['https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&q=80', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&q=80']),
  (2, '레오나르도 디카프리오', 51, 183, '40-32-38', 1989, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80', array['https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80']),
  (3, '최민식', 64, 172, '44-36-42', 1989, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80', array['https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80']),
  (4, '티모시 샬라메', 30, 178, '36-28-34', 2008, 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80', array['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80']),
  (5, '손예진', 44, 165, '34-24-35', 2000, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80', array['https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&q=80', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80']),
  (6, '양자경', 63, 163, '33-23-34', 1983, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80', array['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&q=80', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80'])
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

-- 4. Seed Real Masterpiece Movies (Use OVERRIDING SYSTEM VALUE to preserve explicitly defined IDs)
insert into public.movies (id, title, movie_code, category_code, actor_id, keywords, rating_grade, video_url, description, poster_url, capture_url, snapshot_url, release_month, production_company, recommendation_score, created_at) overriding system value values
  -- 송강호 (Actor 1)
  (1, '기생충', 'MV-0001', 'DRM', 1, array['봉준호', '칸영화제', '아카데미', '명작'], 'A+', 'https://www.youtube.com/watch?v=5xH0HfJHsaY', '전원백수로 살아가던 기택 일가의 장남 기우가 고액 과외 면접을 위해 박사장네 집으로 발을 들이면서 시작되는 두 가족의 걷잡을 수 없는 톱니바퀴 소동.', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80', '2019-05', '바른손이앤에이', 100, now() - interval '0 days'),
  (2, '살인의 추억', 'MV-0002', 'THR', 1, array['봉준호', '스릴러', '실화', '인생작'], 'A+', 'https://www.youtube.com/watch?v=FqE2w0vjC6Y', '1986년 경기도 일대에서 연이어 벌어지는 의문의 부녀자 연쇄살인 사건을 해결하기 위해 시골 형사 박두만과 서울 형사 서태윤이 맞서며 형언할 수 없는 시대의 공기를 추적하는 이야기.', 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&q=80', 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=80', 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80', '2003-04', 'CJ Entertainment', 99, now() - interval '1 days'),
  (3, '괴물', 'MV-0003', 'SCI', 1, array['봉준호', '괴수', '한강', '천만영화'], 'A', 'https://www.youtube.com/watch?v=ZfF2a36H0Zk', '한강 한복판에 갑자기 출현한 변종 괴물이 시민들을 습격하고, 매점 청년 강두와 그의 가족들이 괴물에게 납치당한 딸 현서를 구하기 위해 고군분투하며 벌이는 사투.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80', 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&q=80', 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=1200&q=80', '2006-07', '영화사 청어람', 98, now() - interval '2 days'),
  (4, '택시운전사', 'MV-0004', 'DRM', 1, array['장훈', '광주', '역사', '천만'], 'A', 'https://www.youtube.com/watch?v=B5eD6G8j90U', '1980년 5월, 서울의 택시운전사 만섭이 통금시간 전까지 광주에 다녀오면 거금을 준다는 독일 기자 피터를 태우고 아무것도 모른 채 광주로 향하는 감동 실화 극화.', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80', 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80', 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=1200&q=80', '2017-08', '더램프', 97, now() - interval '3 days'),

  -- 레오나르도 디카프리오 (Actor 2)
  (5, '인셉션', 'MV-0005', 'SCI', 2, array['크리스토퍼놀란', 'Surreal', '꿈', '액션'], 'A+', 'https://www.youtube.com/watch?v=YoHD9XEInc0', '타인의 무의식에 들어가 생각을 훔치는 기밀 도둑 코브가 이번엔 생각을 주입하는 난공불락의 역발상 임무 "인셉션"을 제안받고 천재 팀원들을 모아 꿈의 심연으로 다이빙한다.', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80', 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&q=80', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80', '2010-07', 'Warner Bros. Pictures', 96, now() - interval '4 days'),
  (6, '타이타닉', 'MV-0006', 'ROM', 2, array['제임스카메론', '멜로', '아카데미', '역대최고'], 'A+', 'https://www.youtube.com/watch?v=I7c1etV7D7g', '1912년 초대형 여객선 타이타닉호에 탑승한 상류층 여인 로즈와 자유로운 영혼의 청년 잭이 서로의 운명을 구원하며 피워내는 애절하고 불멸하는 사랑 이야기.', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80', 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80', 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=1200&q=80', '1997-12', '20th Century Fox', 95, now() - interval '5 days'),
  (7, '캐치 미 이프 유 캔', 'MV-0007', 'DRM', 2, array['스티븐스필버그', '천재', '실화', '유쾌함'], 'A', 'https://www.youtube.com/watch?v=s-7pyIbtf1Q', '10대 천재 사기꾼 프랭크가 조종사, 외과의사, 변호사로 신분을 위장하며 수백만 달러를 횡령하자, 집요한 FBI 베테랑 요원 칼 핸러티가 그를 잡기 위한 끈질긴 추격전을 벌인다.', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&q=80', 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=1200&q=80', 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=1200&q=80', '2002-12', 'DreamWorks Pictures', 94, now() - interval '6 days'),
  (8, '셔터 아일랜드', 'MV-0008', 'THR', 2, array['마틴스콜세지', '반전', '정신병원', '미스터리'], 'A', 'https://www.youtube.com/watch?v=5iaYLCip5Qk', '연방보안관 테디 대니얼스가 탈출이 절대 불가능한 정신병원이 있는 셔터 아일랜드로 파견되어 환자 실종 사건을 수사하던 도중 마주하게 되는 거대하고 어두운 미궁.', 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&q=80', 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=80', 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80', '2010-02', 'Paramount Pictures', 93, now() - interval '7 days'),

  -- 최민식 (Actor 3)
  (9, '올드보이', 'MV-0009', 'THR', 3, array['박찬욱', '칸영화제', '복수', '걸작'], 'A+', 'https://www.youtube.com/watch?v=07hLdWe47tE', '이유도 모른 채 15년 동안 감금당했던 평범한 남자 오대수가 풀려난 뒤, 자신을 가둔 베일에 가려진 인물 우진에게 도달하여 진실을 밝히기 위해 벌이는 5일간의 파멸적 추적.', 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=600&q=80', 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1200&q=80', 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=80', '2003-11', '쇼이스트', 92, now() - interval '8 days'),
  (10, '범죄와의 전쟁', 'MV-0010', 'ACT', 3, array['윤종빈', '부산', '느와르', '연기력'], 'A', 'https://www.youtube.com/watch?v=O15oWnUv1R0', '1980년대 부산, 해고 위기에 몰린 비리 세관 공무원 최익현이 조폭 두목 최형배를 만나 의기투합하며 나쁜 놈들의 전성시대를 맞이하고 그 속에서 벌이는 배신과 음모의 느와르 드라마.', 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&q=80', 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=80', 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1200&q=80', '2012-02', '팔레트픽처스', 91, now() - interval '9 days'),
  (11, '명량', 'MV-0011', 'ACT', 3, array['김한민', '이순신', '역대최고', '천만영화'], 'A', 'https://www.youtube.com/watch?v=F_S6w77Lg_w', '1597년 임진왜란 6년, 누명으로 옥살이 후 복직된 삼도수군통제사 이순신 장군이 단 12척의 배를 이끌고 330척에 달하는 왜군 함대에 맞서 전설적인 승리를 거둔 불멸의 전투 극화.', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80', '2014-07', '빅스톤픽쳐스', 90, now() - interval '10 days'),
  (12, '악마를 보았다', 'MV-0012', 'THR', 3, array['김지운', '복수', '고어', '광기'], 'B+', 'https://www.youtube.com/watch?v=vV1p8gP6g3E', '자신의 약혼녀가 살인마 경철에게 무참히 살해당하자, 국정원 경호원 수현이 가장 고통스러운 복수를 행하기 위해 악마보다 더한 지옥의 집요한 악마가 되는 핏빛 복수극.', 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&q=80', 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=80', 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=1200&q=80', '2010-08', '페퍼민트앤컴퍼니', 89, now() - interval '11 days'),

  -- 티모시 샬라메 (Actor 4)
  (13, '듄', 'MV-0013', 'SCI', 4, array['드니빌뇌브', 'Desert', '대서사시', '스펙터클'], 'A', 'https://www.youtube.com/watch?v=8g18jFHCLhs', '생명유지의 핵심 자원이 풍부한 모래행성 아라키스의 후계자 폴 아토레이데스가 우주 거대 가문들의 배신과 음모 속에서 메시아적 해방자가 되기 위한 위대한 여정의 서막을 여는 스펙터클 대작.', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&q=80', 'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200&q=80', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80', '2021-10', 'Legendary Pictures', 88, now() - interval '12 days'),
  (14, '인터스텔라', 'MV-0014', 'SCI', 4, array['크리스토퍼놀란', '우주', '아인슈타인', '감동'], 'A+', 'https://www.youtube.com/watch?v=wz77yLgI62k', '지구가 점차 황폐화되며 멸망해 가자, 인류를 구하기 위해 웜홀을 통해 시공간 너머 미지의 은하계로 기약 없는 우주 항해를 떠난 아버지와 남겨진 딸 사이의 압도적인 SF 러브스토리.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80', 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&q=80', 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=1200&q=80', '2014-11', 'Paramount Pictures', 87, now() - interval '13 days'),
  (15, '콜 미 바이 유어 네임', 'MV-0015', 'ROM', 4, array['루카구아다니노', '퀴어', '첫사랑', '이탈리아'], 'A', 'https://www.youtube.com/watch?v=7uRzLszZszs', '1983년 이탈리아 북부의 눈부신 햇살 속에서 만난 17세 소년 엘리오와 24세 청년 올리버가 서로의 이름을 바꾸어 부르며 평생 지워지지 않을 생애 첫 아련한 멜로 러브스토리.', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80', 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80', 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=1200&q=80', '2017-11', 'Sony Pictures Classics', 86, now() - interval '14 days'),
  (16, '웡카', 'MV-0016', 'DRM', 4, array['폴킹', '찰리와초콜릿공장', '뮤지컬', '동화'], 'B+', 'https://www.youtube.com/watch?v=otNh9bTjXWg', '세계에서 가장 뛰어난 초콜릿 제작자 윌리 웡카가 자신의 놀라운 마법 초콜릿 레시피를 들고 아무것도 가진 것 없이 세계 최고의 초콜릿 성에 입성하며 펼쳐지는 환상적인 동화 모험.', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80', 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80', 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=1200&q=80', '2024-01', 'Warner Bros. Pictures', 85, now() - interval '15 days'),

  -- 손예진 (Actor 5)
  (17, '클래식', 'MV-0017', 'ROM', 5, array['곽재용', '첫사랑', '감성', '멜로최고'], 'A+', 'https://www.youtube.com/watch?v=3-7Y963k0nQ', '우연히 편지 상자를 발견한 지혜가 어머니 주희의 일기를 읽으며 깨닫게 되는, 1960년대 순수했던 시절의 첫사랑인 준하와의 아름답고 운명처럼 연이어 이어지는 멜로 로맨스.', 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600&q=80', 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=1200&q=80', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80', '2003-01', '에그필름', 84, now() - interval '16 days'),
  (18, '내 머리 속의 지우개', 'MV-0018', 'ROM', 5, array['이재한', '알츠하이머', '눈물샘', '애절함'], 'A', 'https://www.youtube.com/watch?v=uK4H68u3t38', '기억을 잃어가는 알츠하이머병에 걸린 상류층 건축가 수진과 그녀를 위해 지독하고 영원한 사랑을 맹세하고 끝까지 지켜내려는 부두 노동자 출신 남편 철수의 가슴 아픈 러브스토리.', 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600&q=80', 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=1200&q=80', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80', '2004-11', '싸이더스', 83, now() - interval '17 days'),
  (19, '덕혜옹주', 'MV-0019', 'DRM', 5, array['허진호', '조선', '일제강점기', '비극'], 'A', 'https://www.youtube.com/watch?v=XWp7ZlS9wzo', '일제강점기, 대한제국의 마지막 공주로 일본으로 강제 유학을 떠나 평생 조국으로 돌아오고자 애썼던 덕혜옹주의 굴곡진 삶과 그녀를 평생 지켜주려 했던 독립투사 한택수의 이야기.', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80', '2016-08', '호필름', 82, now() - interval '18 days'),
  (20, '해적: 바다로 간 산적', 'MV-0020', 'ACT', 5, array['이석훈', '코믹', '어드벤처', '조선'], 'B+', 'https://www.youtube.com/watch?v=q6gO6kH3-k0', '조선 건국 전야, 국새를 삼켜버린 거대 귀신고래를 찾아 모여든 산적 장사정과 여자 해적 여월이 격동하는 거친 파도 속에서 국새를 되찾기 위해 합심하여 벌이는 해상 액션 어드벤처.', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1200&q=80', '2014-08', '하리마오픽쳐스', 81, now() - interval '19 days'),

  -- 양자경 (Actor 6)
  (21, '에브리씽 에브리웨어 올 앳 원스', 'MV-0021', 'SCI', 6, array['다니엘스', 'Multiverse', '가족', '아카데미'], 'A+', 'https://www.youtube.com/watch?v=hZJc8Uu_6wU', '세탁소를 운영하며 고단한 미국 이민자의 일상을 살아가던 에블린이 갑자기 세무국 감사 도중 다른 다중우주(Multiverse)의 남편을 만나 우주 멸망을 막아야 하는 파란만장한 액션 대서사시.', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&q=80', 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=1200&q=80', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80', '2022-10', 'A24', 80, now() - interval '20 days'),
  (22, '와호장룡', 'MV-0022', 'ACT', 6, array['이안', '무협', '예술영화', '청강검'], 'A+', 'https://www.youtube.com/watch?v=tI9o6C6xLks', '강호 명검 청강검의 분실을 둘러싸고 벌어지는 무림 고수 이무백과 그를 사랑하는 여협 수련, 그리고 베일에 싸인 용옥교 사이의 무림 철학적이고 유려한 와이어 무협 대서사시.', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80', '2000-07', 'Columbia Pictures', 79, now() - interval '21 days'),
  (23, '샹치와 텐 링즈의 전설', 'MV-0023', 'ACT', 6, array['데스틴크레이튼', '마블', '히어로', '링즈'], 'B', 'https://www.youtube.com/watch?v=S30cZf0E6a0', '과거를 숨기고 평범하게 살아가던 샹치가 마블 시네마틱 유니버스 최고의 링즈 무기 권력자인 아버지를 마주하고, 마음의 평화를 되찾고 텐 링즈의 진정한 주인으로 거듭나며 싸우는 이야기.', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80', '2021-09', 'Marvel Studios', 78, now() - interval '22 days'),
  (24, '예스 마담', 'MV-0024', 'ACT', 6, array['원규', '홍콩영화', '여형사', '고전'], 'B+', 'https://www.youtube.com/watch?v=jW93Zl6151c', '1980년대 전성기를 풍미한 홍콩 누와르 액션 활극. 카리스마와 엄청난 격투 능력을 갖춘 여경정 아령과 오요한 콤비가 거대 범죄 신디케이트를 일망타진하기 위해 가동하는 레전드 액션.', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1200&q=80', '1985-11', 'D&B Films', 77, now() - interval '23 days')
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
