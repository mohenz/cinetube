-- Update CineTube actor profile: Koumura Izuki
-- Profile references:
-- - https://mines-pro.jp/model/11011
-- - https://avmix.net/%E5%B9%B8%E6%9D%91%E6%B3%89%E5%B8%8C/
-- Representative image source:
-- - https://javtiful.com/kr/actress/koumura-izuki

update public.actors
set
  age = 25,
  height_cm = 156,
  body_size = 'B83(D)-W58-H85',
  debut_year = 2025,
  representative_image_url = 'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/23d0a6710da8fe43fc3ec6237b0e5b2b.jpg'
where name = 'Koumura Izuki';
