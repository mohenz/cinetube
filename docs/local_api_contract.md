# CineTube 로컬 API 계약 목록

- 기준일: 2026-08-08
- 대상: `scripts/local_api.py` → `scripts/cinetube_api/` 모듈 분리 이후
- 이 문서는 리팩터링 전후 응답이 동일해야 하는 **기준선(baseline)** 이다.
- 검증 테스트: `tests/test_handler_api.py`

## 1. 공통 규칙

| 항목 | 값 |
|---|---|
| 로컬 진입점 | `python scripts/local_api.py` (기본 `0.0.0.0:3001`) |
| Vercel 진입점 | `api/index.py` → `from scripts.local_api import Handler` |
| Vercel 경로 정규화 | `/api/...` → `/...` (`api/index.py`가 처리) |
| 응답 Content-Type | `application/json; charset=utf-8` |
| CORS | `Access-Control-Allow-Origin: *`, `Methods: GET, POST, PATCH, DELETE, OPTIONS`, `Headers: Content-Type, Prefer` |
| 오류 응답 | HTTP `500` + `{"message": "<오류 문구>"}` |
| `OPTIONS` | 항상 `204 No Content` |

## 2. 상태 / 메타데이터

| 메서드 | 경로 | 응답 |
|---|---|---|
| GET | `/`, `/health` | `{"ok": true, "service": "cinetube-api"}` |
| GET | `/metadata/database`, `/database/stats` | `{"database_name": ..., "size_bytes": ..., "size_pretty": ...}` |

## 3. 외부 가져오기

| 메서드 | 경로 | 쿼리 | 응답 |
|---|---|---|---|
| GET | `/metadata/import`, `/tmdb/import` | `url` 또는 `q` (필수), `site` (기본 `auto`) | 영화 import dict |
| GET | `/metadata/actor`, `/actor/import` | `name`, `url` 또는 `q` (필수) | 배우 import dict |
| GET | `/metadata/webtoon`, `/webtoon/import` | `url` 또는 `q` (필수), `site` (기본 `auto`) | 웹툰 import dict |

`url`/`q`가 모두 비면 `{"message": "url 또는 q 파라미터가 필요합니다"}`.

기본은 동기 실행이며 응답은 아래 dict 그대로다. `async=1`(또는 `true`/`yes`)
쿼리나 `Prefer: respond-async` 헤더를 붙이면 백그라운드 작업으로 등록된다 (§7).

### 3.1 영화 import dict 필드

`title`, `movie_code`, `category_code`, `category_name`, `actor_names`, `actor_profiles`,
`director_names`, `keywords`, `rating_grade`, `video_url`, `source_url`, `description`,
`poster_url`, `capture_url`, `snapshot_url`, `release_month`, `production_company`,
`recommendation_score`, `ranking_score`, `rotten_tomatoes_score`, `is_main`

원격 조회가 차단되면 위 필드에 더해 `import_warning: "remote_fetch_blocked"`가 붙고
`description`에 차단 사유가 들어간다 (fallback 계약).

지원 사이트: `tmdb`, `javtiful`, `supjav`, `missav`(123AV).
`projectjav`는 자동 인식 대상에서 제외(명시 요청 시에만 파서 사용).

### 3.2 배우 import dict 필드

`name`, `age`, `height_cm`, `body_size`, `debut_year`, `representative_image_url`,
`image_urls`, `source_url`, `aliases` (+ 차단 시 `import_warning`, `description`)

지원 사이트: AVDBS.

### 3.3 웹툰 import dict 필드

`site`, `webtoon_id`, `title`, `rating`, `alternative`, `artist`, `genre`, `type`, `tage`,
`poster_image`, `url`, `webtoon_images`, `summary`, `chapters[]`
(사이트별 추가: `release`(mangadistrict/mangadna), `status`(hentai18))

`chapters[]` 항목: `webtoon_chapter_id`, `webtoon_id`, `chapter_number`, `chapter_url`,
`chapter_poster`, `title`

지원 사이트: `mangadistrict`, `mangadna`, `hentai18`, `imhentai`.

## 4. 테이블 CRUD

허용 테이블 (10개): `media_assets`, `categories`, `actors`, `rating_grades`, `common_codes`,
`favorite_movies`, `gallery_images`, `webtoons`, `webtoon_chapters`, `movies`

허용 목록 밖의 경로는 `{"message": "unknown table"}`.

### 4.1 조회 `GET /<table>`

| 쿼리 | 설명 |
|---|---|
| `select` | 콤마 구분 컬럼. 실제 존재하는 컬럼만 통과, 전부 무효면 `*` |
| `order` | `<column>.asc` / `<column>.desc` (기본 `created_at.desc`). 미존재 컬럼은 오류 |

| `page_size` / `limit` | 최대 200. `all`이면 제한 없음 |
| `page` | 1부터. `offset` 미지정 시 `(page-1)*limit` |
| `offset` | 지정 시 `page` 계산보다 우선 |
| `count` | `exact`이면 총 건수 포함 응답 |
| `search` | 테이블별 검색 컬럼에 `ilike '%term%'` OR 결합 |
| `<column>=eq.<value>` | 실제 존재하는 컬럼에 한해 등호 필터 |

> `rating_grades`에는 `created_at` 컬럼이 없어 기본 정렬로는 조회할 수 없고
> `{"message": "invalid order column: created_at"}`를 반환한다.
> 모듈 분리 이전과 동일한 기존 동작이며, 프론트엔드(`store.js`)는 이 테이블과
> `common_codes`를 `order=display_order.asc`로 조회하므로 화면에는 영향이 없다.

응답:

- 기본: 행 배열 `[...]`
- `count=exact`: `{"items": [...], "total": N, "limit": N, "offset": N, "page": N}`

검색 대상 컬럼:

| 테이블 | 컬럼 |
|---|---|
| `movies` | title, movie_code, category_code, description, production_company, keywords |
| `gallery_images` | gallery_image_id, title, description, source, tags |
| `actors` | name, body_size, debut_year, age, height_cm |
| `categories` | category_code, name |
| `webtoons` | webtoon_id, title, alternative, artist, genre, type, tage |

### 4.2 등록 `POST /<table>`

- 본문: JSON 객체. 테이블별 `insert` 화이트리스트 ∩ 실제 컬럼만 반영
- 응답: 등록된 행 배열 (`returning *`)
- 등록 후 외부 이미지 URL 컬럼은 자동으로 로컬 미디어로 치환된다 (4.4)
- 반영할 컬럼이 없으면 `{"message": "empty insert payload"}`

### 4.3 수정 `PATCH /<table>?<pk>=eq.<value>`

- 기본키 `eq.` 필터 필수. 없으면 `{"message": "missing primary key filter"}`
- 테이블별 `update` 화이트리스트만 반영, 응답은 수정된 행 배열
- 반영할 컬럼이 없으면 `{"message": "empty update payload"}`

### 4.4 이미지 자동 로컬화 대상

| 테이블 | (URL 컬럼, asset id 컬럼, owner_field) |
|---|---|
| `movies` | poster_url/poster_asset_id/poster, capture_url/capture_asset_id/capture, snapshot_url/snapshot_asset_id/snapshot |
| `categories` | representative_image_url/representative_image_asset_id/representative |
| `actors` | representative_image_url/representative_image_asset_id/representative |
| `gallery_images` | image_url/image_asset_id/image |
| `webtoons` | poster_image/poster_image_asset_id/poster |
| `webtoon_chapters` | chapter_poster/chapter_poster_asset_id/poster |

asset id 컬럼에 이미 값이 있거나 URL이 `http(s)`가 아니면 건너뛴다.

### 4.5 삭제 `DELETE /<table>?<pk>=eq.<value>`

- 기본키 `eq.` 필터 필수
- 성공 시 `204 No Content` (본문 없음)

### 4.6 기본키

| 테이블 | pk |
|---|---|
| `categories` | `category_code` |
| `rating_grades` | `grade` |
| 그 외 8개 | `id` |

## 5. 미디어

| 메서드 | 경로 | 본문 | 응답 |
|---|---|---|---|
| POST | `/media/upload` | `data_url`(필수), `thumb_data_url`, `owner_table`, `owner_field`, `owner_id`, `original_name`, `sort_order` | `media_assets` 행 배열 |
| POST | `/media/import-url` | `url`(필수, http/https) + 위 owner 필드 | `media_assets` 행 배열 |

두 엔드포인트도 `?async=1` 또는 `Prefer: respond-async`로 백그라운드 등록이 가능하다 (§7).

저장 규칙:

- 원본: `local/media/{owner_table}/{owner_field}/{uuid}.{ext}`
- 썸네일: `local/media/{owner_table}/{owner_field}/{uuid}.thumb.{ext}` (300px WebP)
- `public_url` = `/` + 상대경로, 썸네일이 없으면 `thumb_url`은 원본 URL과 동일
- `bucket_id`는 항상 `local-file`
- `local/media` 밖 경로는 `invalid media path`로 거부

## 6. 백그라운드 작업 (선택)

작업계획서 단계 7. **기존 호출부는 영향을 받지 않는다.** 요청에 명시적으로
비동기를 요청했을 때만 동작이 달라진다.

### 6.1 비동기 옵트인

| 방법 | 예시 |
|---|---|
| 쿼리 | `?async=1` (`1`, `true`, `yes`, `async` 허용) |
| 헤더 | `Prefer: respond-async` |

지원 엔드포인트: 영화/배우/웹툰 가져오기 3종, `/media/upload`, `/media/import-url`

응답은 `202 Accepted`:

```json
{"job_id": 55, "job_type": "movie_import", "status": "queued", "status_url": "/jobs/55"}
```

파라미터 검증(예: `url`/`q` 누락)은 등록 전에 그대로 수행된다.

### 6.2 작업 상태 API

| 메서드 | 경로 | 응답 |
|---|---|---|
| GET | `/jobs/<id>` | `background_jobs` 행 1건. 없으면 `404` + `{"message": "job not found"}` |
| GET | `/jobs` | 최근 작업 목록. `status`, `job_type`, `limit`(기본 50, 최대 200) |
| GET | `/jobs/stats` | 상태별 건수 `{"queued": 2, "succeeded": 10}` |

작업 행 필드: `id`, `job_type`, `status`, `payload`, `result`, `error`,
`attempts`, `max_attempts`, `run_after`, `locked_by`, `locked_at`,
`started_at`, `finished_at`, `created_at`, `updated_at`

상태 전이: `queued → running → succeeded` / `failed`
(재시도가 남아 있으면 `running → queued`로 되돌아가며 `run_after`에 backoff가 적용된다)

### 6.3 작업 유형

| job_type | payload | 결과 |
|---|---|---|
| `movie_import` | `{"value": ..., "site": ...}` | 영화 import dict |
| `actor_import` | `{"actor_name": ..., "value": ...}` | 배우 import dict |
| `webtoon_import` | `{"value": ..., "site": ...}` | 웹툰 import dict |
| `media_upload` | `/media/upload` 본문 | `media_assets` 행 배열 |
| `media_import_url` | `/media/import-url` 본문 | `media_assets` 행 배열 |
| `media_localize` | `{"table": ..., "rows": [...]}` | 로컬화된 행 배열 |

`background_jobs`는 CRUD 화이트리스트에 없으므로 `/background_jobs` 경로로는
접근할 수 없고 위 읽기 전용 API로만 조회한다.

운영 방법은 `docs/local_api_worker.md` 참고.

## 7. 환경변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `DATABASE_URL` | (없음) | 지정 시 PG* 대신 사용 |
| `PGHOST` / `PGPORT` | `127.0.0.1` / `54322` | 로컬 PostgreSQL |
| `PGUSER` / `PGPASSWORD` / `PGDATABASE` | `postgres` / (없음) / `cinetube` | 접속 정보 |
| `PGSSLMODE` | (없음) | 지정 시 sslmode 전달 |
| `CINETUBE_API_HOST` / `CINETUBE_API_PORT` | `0.0.0.0` / `3001` | 리스닝 주소 |
| `TMDB_API_KEY` | 내장 공개 키 | TMDB API 키 |

분리 작업에서 추가된 선택 변수는 `docs/local_api_operations.md` 참고.
