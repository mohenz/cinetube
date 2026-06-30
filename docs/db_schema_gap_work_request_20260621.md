# CineTube DB 구조 차이 확인 및 작업요청서

- 작성일: 2026-06-21
- 대상 프로젝트: `D:\Workspace\cinetube`
- 비교 기준:
  - 프로그램 기준 스키마: `local/schema.sql`, `supabase/schema.sql`, `scripts/local_api.py`, `assets/js/shared/store.js`
  - 로컬 DB 백업 기준: `local/backups/cinetube_before_content_zero_20260614_204927.sql`, `local/backups/cinetube_before_media_migration_20260614_204623.sql`

## 1. 확인 결과 요약

현재 물리 로컬 DB(`local/postgres-data`)는 직접 조회하지 못했다.

- 데이터 디렉터리 버전: PostgreSQL 16
- 현재 설치된 PostgreSQL 바이너리: PostgreSQL 18
- 기동 실패 원인: `database files are incompatible with server`
- `pg_controldata`도 control file CRC 경고를 표시하므로 현재 데이터 디렉터리 신뢰성 확인이 필요하다.

다만 최신 로컬 백업 덤프 기준으로는 프로그램이 기대하는 공개 테이블과 컬럼이 모두 존재한다.
따라서 백업 기준으로는 "즉시 추가해야 하는 테이블/컬럼"은 확인되지 않았다.

## 2. 프로그램 기준 필수 테이블

프로그램과 로컬 API가 사용하는 필수 테이블은 다음 10개다.

- `media_assets`
- `categories`
- `actors`
- `rating_grades`
- `common_codes`
- `webtoons`
- `webtoon_chapters`
- `gallery_images`
- `movies`
- `favorite_movies`

최신 로컬 백업 덤프에는 위 10개 테이블이 모두 존재한다.

## 3. 프로그램 기준 필수 컬럼

### `media_assets`

- `id`, `bucket_id`, `object_path`, `public_url`, `thumb_url`, `original_name`, `mime_type`, `size_bytes`, `owner_table`, `owner_field`, `owner_id`, `sort_order`, `created_at`

### `categories`

- `category_code`, `name`, `representative_image_url`, `representative_image_asset_id`, `is_visible`, `created_at`

### `actors`

- `id`, `name`, `age`, `height_cm`, `body_size`, `debut_year`, `representative_image_url`, `representative_image_asset_id`, `image_urls`, `image_asset_ids`, `created_at`

### `rating_grades`

- `grade`, `display_order`

### `common_codes`

- `id`, `code_group`, `code_value`, `code_label`, `display_order`, `is_enabled`, `extra`, `created_at`

### `webtoons`

- `id`, `webtoon_id`, `title`, `rating`, `alternative`, `artist`, `genre`, `type`, `tage`, `poster_image`, `poster_image_asset_id`, `url`, `webtoon_images`, `webtoon_image_asset_ids`, `regdate`, `created_at`

### `webtoon_chapters`

- `id`, `webtoon_chapter_id`, `webtoon_id`, `chapter_number`, `chapter_url`, `chapter_poster`, `chapter_poster_asset_id`, `regdate`, `created_at`

### `gallery_images`

- `id`, `gallery_image_id`, `title`, `description`, `image_url`, `image_asset_id`, `source`, `tags`, `is_visible`, `regdate`, `created_at`

### `movies`

- `id`, `title`, `movie_code`, `category_code`, `actor_id`, `actor_ids`, `director_names`, `source_url`, `keywords`, `rating_grade`, `video_url`, `description`, `poster_url`, `poster_asset_id`, `capture_url`, `capture_asset_id`, `snapshot_url`, `snapshot_asset_id`, `release_month`, `production_company`, `recommendation_score`, `rotten_tomatoes_score`, `ranking_score`, `click_count`, `is_main`, `created_at`

### `favorite_movies`

- `id`, `user_key`, `content_type`, `content_id`, `note`, `metadata`, `created_at`

## 4. 추가 필요 후보

최신 백업에는 이미 반영되어 있으나, 현재 운영 DB가 과거 버전이라면 아래 항목이 누락됐을 가능성이 높다.

### 신규 테이블 후보

- `common_codes`
- `webtoons`
- `webtoon_chapters`
- `gallery_images`
- `favorite_movies`
- `media_assets`

### 신규 컬럼 후보

- `media_assets.thumb_url`
- `categories.representative_image_asset_id`
- `categories.is_visible`
- `actors.representative_image_asset_id`
- `actors.image_asset_ids`
- `movies.actor_ids`
- `movies.director_names`
- `movies.source_url`
- `movies.poster_asset_id`
- `movies.capture_asset_id`
- `movies.snapshot_asset_id`
- `movies.rotten_tomatoes_score`
- `movies.ranking_score`
- `movies.click_count`
- `movies.is_main`
- `webtoons.poster_image_asset_id`
- `webtoons.webtoon_image_asset_ids`
- `webtoon_chapters.chapter_poster_asset_id`
- `gallery_images.image_asset_id`
- `gallery_images.is_visible`
- `favorite_movies.content_type`
- `favorite_movies.content_id`
- `favorite_movies.note`
- `favorite_movies.metadata`

## 5. 요청 작업

1. PostgreSQL 16 바이너리 설치 또는 PostgreSQL 16 컨테이너/portable 환경을 준비한다.
2. 현재 `local/postgres-data`를 PostgreSQL 16으로 기동해 실제 `information_schema.columns`를 덤프한다.
3. 실제 로컬 DB 스키마를 `local/schema.sql`과 재비교한다.
4. 누락 항목이 있으면 `ADD TABLE`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` 방식의 비파괴 마이그레이션 SQL을 작성한다.
5. 마이그레이션 전 `pg_dump` 백업을 생성한다.
6. 마이그레이션 후 관리자 화면 기준 CRUD, 이미지 업로드, 관심작품, 갤러리, 웹툰 조회를 회귀 확인한다.

## 6. 권장 마이그레이션 파일

- 신규 파일명: `local/schema_sync_20260621.sql`
- 원칙:
  - 기존 데이터 삭제 금지
  - `drop table`, `truncate`, `delete` 사용 금지
  - 모든 컬럼 추가는 `alter table ... add column if not exists` 사용
  - 모든 인덱스 추가는 `create index if not exists` 사용

## 7. 현재 판단

- 코드 기준 추가 필요 테이블/컬럼: 없음
- 최신 로컬 백업 기준 추가 필요 테이블/컬럼: 없음
- 실제 물리 로컬 DB 기준 판단: PostgreSQL 16 실행환경 확보 후 재확인 필요
