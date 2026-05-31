-- Fix CineTube Javtiful metadata for imported Yatsugake Umi movies.
-- These are confirmed Javtiful per-video pages from:
-- https://javtiful.com/kr/actress/yatsugake-umi?q=<movie_code>

update public.movies
set
  title = values_table.title,
  video_url = values_table.video_url,
  description = values_table.description,
  poster_url = values_table.poster_url
from (
  values
    ('ABF-270', 'ABF-270 성욕에 지배된 미대생 커플의 동거 질 내 사정 성교록. 하치카케 우미', 'https://javtiful.com/kr/video/94468/abf-270', 'Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2025/09/25/87f051985acae6ad87451ad544a1cd2c.jpg'),
    ('ABF-260', 'ABF-260 신 테크 단지 10 분간 참을 수 있다면 ... 보상 나마 질 내 사정', 'https://javtiful.com/kr/video/91587/abf-260', 'Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2025/08/21/92b19ba9a184d47fa78eea174e1d3ba9.jpg'),
    ('ABF-251', 'ABF-251 아저씨가 좋아 깜짝 미소녀와 이챠베로 3실전', 'https://javtiful.com/kr/video/89616/abf-251', 'Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2025/07/24/aa44a435658f56522afae559b30e6221.jpg'),
    ('ABF-241', 'ABF-241 아침 발치치 ○ 포에서 일어나서 하메 걷는 토요일.', 'https://javtiful.com/kr/video/87724/abf-241', 'Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2025/06/26/2417207d15546f21d143f9f44d56473a.jpg'),
    ('ABF-231', 'ABF-231 설마의, 뒤 옵 유혹', 'https://javtiful.com/kr/video/85481/abf-231', 'Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2025/05/22/002d1d7fe76caf242b6d5015a89ce07e.jpg'),
    ('ABF-109', 'ABF-109 작은 악마 미소녀에게 이성이 망가질수록 농락당한다.', 'https://javtiful.com/kr/video/60279/abf-109', 'Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다.', 'https://javtiful.com/uploads/uploads/videos/thumbs/2024/05/30/1aa1744757655a72e6c73fe1c176ad9a.jpg')
) as values_table(movie_code, title, video_url, description, poster_url)
where public.movies.movie_code = values_table.movie_code;
