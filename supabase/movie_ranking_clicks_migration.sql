-- Add CineTube home-ranking fields for existing CineHub databases.
-- matched recommendations: click_count desc
-- category/rating top list: ranking_score desc

alter table public.movies
add column if not exists ranking_score integer not null default 0;

alter table public.movies
add column if not exists click_count integer not null default 0;

create index if not exists idx_movies_ranking_score on public.movies(ranking_score desc);
create index if not exists idx_movies_click_count on public.movies(click_count desc);










