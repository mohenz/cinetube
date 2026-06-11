begin;

insert into public.webtoons (
  webtoon_id,
  title,
  rating,
  alternative,
  artist,
  genre,
  type,
  tage,
  poster_image,
  url,
  webtoon_images
) values (
  'neighbors-curse-uncensored',
  'Neighbor''s Curse (Uncensored)',
  '3.4',
  'From the very first day in his new apartment, Joon was captivated by his neighbor Mira — a girl of rare beauty. Yet she seemed indifferent to him, always teasing and never taking him seriously. But soon, Joon is about to discover something that will completely change everything he thought he knew about her and himself. Dive into Neighbor''s Curse (Uncensored), a premium Manhwa Hentai available now on Hentai18.',
  '',
  'Manhwa, Adult, Comedy, Drama, Mature, Romance, Seinen, Uncensored',
  'Manhwa',
  array['Hentai', 'Manhwa', 'Adult', 'Comedy', 'Drama', 'Mature', 'Romance', 'Seinen', 'Uncensored']::text[],
  'https://media.hentai18.net/images/thumbs/neighbors-curse-uncensored.jpg',
  'https://hentai18.net/read-hentai/neighbors-curse-uncensored',
  array['https://media.hentai18.net/images/thumbs/neighbors-curse-uncensored.jpg']::text[]
)
on conflict (webtoon_id) do update set
  title = excluded.title,
  rating = excluded.rating,
  alternative = excluded.alternative,
  artist = excluded.artist,
  genre = excluded.genre,
  type = excluded.type,
  tage = excluded.tage,
  poster_image = excluded.poster_image,
  url = excluded.url,
  webtoon_images = excluded.webtoon_images;

insert into public.webtoon_chapters (
  webtoon_chapter_id,
  webtoon_id,
  chapter_number,
  chapter_url,
  chapter_poster
) values
  ('neighbors-curse-uncensored-001', 'neighbors-curse-uncensored', 1, 'https://hentai18.net/read-hentai/neighbors-curse-uncensored-chapter-1-ch123669', 'https://media.hentai18.net/images/thumbs/neighbors-curse-uncensored.jpg'),
  ('neighbors-curse-uncensored-002', 'neighbors-curse-uncensored', 2, 'https://hentai18.net/read-hentai/neighbors-curse-uncensored-chapter-2-ch123670', 'https://media.hentai18.net/images/thumbs/neighbors-curse-uncensored.jpg'),
  ('neighbors-curse-uncensored-003', 'neighbors-curse-uncensored', 3, 'https://hentai18.net/read-hentai/neighbors-curse-uncensored-chapter-3-ch123671', 'https://media.hentai18.net/images/thumbs/neighbors-curse-uncensored.jpg'),
  ('neighbors-curse-uncensored-004', 'neighbors-curse-uncensored', 4, 'https://hentai18.net/read-hentai/neighbors-curse-uncensored-chapter-4-ch123672', 'https://media.hentai18.net/images/thumbs/neighbors-curse-uncensored.jpg'),
  ('neighbors-curse-uncensored-005', 'neighbors-curse-uncensored', 5, 'https://hentai18.net/read-hentai/neighbors-curse-uncensored-chapter-5-ch123673', 'https://media.hentai18.net/images/thumbs/neighbors-curse-uncensored.jpg'),
  ('neighbors-curse-uncensored-006', 'neighbors-curse-uncensored', 6, 'https://hentai18.net/read-hentai/neighbors-curse-uncensored-chapter-6-ch125644', 'https://media.hentai18.net/images/thumbs/neighbors-curse-uncensored.jpg'),
  ('neighbors-curse-uncensored-007', 'neighbors-curse-uncensored', 7, 'https://hentai18.net/read-hentai/neighbors-curse-uncensored-chapter-7-ch128360', 'https://media.hentai18.net/images/thumbs/neighbors-curse-uncensored.jpg'),
  ('neighbors-curse-uncensored-008', 'neighbors-curse-uncensored', 8, 'https://hentai18.net/read-hentai/neighbors-curse-uncensored-chapter-8-ch130807', 'https://media.hentai18.net/images/thumbs/neighbors-curse-uncensored.jpg')
on conflict (webtoon_chapter_id) do update set
  webtoon_id = excluded.webtoon_id,
  chapter_number = excluded.chapter_number,
  chapter_url = excluded.chapter_url,
  chapter_poster = excluded.chapter_poster;

commit;
