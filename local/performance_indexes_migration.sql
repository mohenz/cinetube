-- CineTube local PostgreSQL performance indexes.
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

-- GIN Indexes for fast trigram searching on text columns
create extension if not exists pg_trgm;

create index if not exists idx_movies_title_trgm
  on public.movies using gin (title gin_trgm_ops);

create index if not exists idx_movies_movie_code_trgm
  on public.movies using gin (movie_code gin_trgm_ops);

create index if not exists idx_movies_description_trgm
  on public.movies using gin (description gin_trgm_ops);

create index if not exists idx_actors_name_trgm
  on public.actors using gin (name gin_trgm_ops);

create index if not exists idx_actors_body_size_trgm
  on public.actors using gin (body_size gin_trgm_ops);

create index if not exists idx_gallery_images_title_trgm
  on public.gallery_images using gin (title gin_trgm_ops);

create index if not exists idx_gallery_images_id_trgm
  on public.gallery_images using gin (gallery_image_id gin_trgm_ops);

create index if not exists idx_gallery_images_description_trgm
  on public.gallery_images using gin (description gin_trgm_ops);

create index if not exists idx_gallery_images_source_trgm
  on public.gallery_images using gin (source gin_trgm_ops);

create index if not exists idx_categories_representative_asset
  on public.categories(representative_image_asset_id);

create index if not exists idx_actors_representative_asset
  on public.actors(representative_image_asset_id);

create index if not exists idx_webtoons_poster_asset
  on public.webtoons(poster_image_asset_id);

create index if not exists idx_webtoon_chapters_poster_asset
  on public.webtoon_chapters(chapter_poster_asset_id);

create index if not exists idx_gallery_images_asset
  on public.gallery_images(image_asset_id);

create index if not exists idx_movies_poster_asset
  on public.movies(poster_asset_id);

create index if not exists idx_movies_capture_asset
  on public.movies(capture_asset_id);

create index if not exists idx_movies_snapshot_asset
  on public.movies(snapshot_asset_id);

analyze public.movies;
analyze public.media_assets;
analyze public.common_codes;
analyze public.actors;
analyze public.categories;
analyze public.webtoons;
analyze public.gallery_images;
analyze public.favorite_movies;
