-- Run only after local migration has been verified.
-- This resets the cloud CineHub tables and leaves only the default rating grades.

truncate table public.movies restart identity cascade;
truncate table public.categories cascade;
truncate table public.actors restart identity cascade;
truncate table public.media_assets cascade;
truncate table public.rating_grades cascade;

insert into public.rating_grades (grade, display_order)
values ('A+', 1), ('A', 2), ('B+', 3), ('B', 4), ('C', 5)
on conflict (grade) do update set display_order = excluded.display_order;










