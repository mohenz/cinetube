-- CineTube Supabase PostgreSQL performance indexes.
-- Safe to run repeatedly.

create index if not exists idx_movies_category_created_at
  on public.movies(category_code, created_at desc);

create index if not exists idx_movies_category_ranking
  on public.movies(category_code, ranking_score desc, created_at desc);

create index if not exists idx_movies_release_created_at
  on public.movies(release_month desc, created_at desc);

create index if not exists idx_movies_ranking_recommendation
  on public.movies(ranking_score desc, recommendation_score desc, created_at desc);

create index if not exists idx_movies_click_created_at
  on public.movies(click_count desc, created_at desc);

create index if not exists idx_movies_main_created_at
  on public.movies(is_main, created_at desc)
  where is_main = true;

create index if not exists idx_media_assets_owner_sort
  on public.media_assets(owner_table, owner_id, owner_field, sort_order);

create index if not exists idx_common_codes_enabled_order
  on public.common_codes(code_group, is_enabled, display_order, code_label);

create index if not exists idx_actors_name
  on public.actors(name);

create index if not exists idx_categories_visible_created_at
  on public.categories(is_visible, created_at desc);

create index if not exists idx_webtoons_regdate_created_at
  on public.webtoons(regdate desc, created_at desc);

create index if not exists idx_gallery_images_visible_regdate
  on public.gallery_images(is_visible, regdate desc, created_at desc);

create index if not exists idx_favorite_movies_content_created_at
  on public.favorite_movies(content_type, content_id, created_at desc);

analyze public.movies;
analyze public.media_assets;
analyze public.common_codes;
analyze public.actors;
analyze public.categories;
analyze public.webtoons;
analyze public.gallery_images;
analyze public.favorite_movies;
