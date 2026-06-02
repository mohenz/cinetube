-- CineTube migration: support up to 4 actors, up to 2 directors, and a source URL per movie.

alter table public.movies
  add column if not exists actor_ids bigint[] not null default '{}';

alter table public.movies
  add column if not exists director_names text[] not null default '{}';

alter table public.movies
  add column if not exists source_url text;

update public.movies
set actor_ids = array[actor_id]
where actor_id is not null
  and cardinality(actor_ids) = 0;

update public.movies
set source_url = video_url
where source_url is null
  and video_url is not null;

create index if not exists idx_movies_actor_ids on public.movies using gin(actor_ids);
