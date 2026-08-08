# CineTube 로컬 API 실행·장애 대응 문서

- 기준일: 2026-08-08
- 대상: `scripts/local_api.py` + `scripts/cinetube_api/`
- 함께 볼 문서: `docs/local_api_contract.md`(API 계약), `docs/local_api_feature_improvement_work_plan.md`(작업계획서)

## 1. 모듈 구조

```text
scripts/
├─ local_api.py                  호환성 진입점 (Handler 재노출 + 서버 실행)
├─ local_worker.py               백그라운드 작업 Worker (독립 프로세스)
├─ check_module_layers.py        계층·순환·미사용 import 정적 검증
└─ cinetube_api/
   ├─ config.py                  환경변수, 경로, timeout, 풀 크기, 로깅 임계값
   ├─ tables.py                  CRUD 화이트리스트, 검색 컬럼, 이미지 필드, 지원 사이트
   ├─ database.py                연결 생성·풀 대여/반납/폐기, run_sql, 컬럼 메타 캐시
   ├─ http_client.py             호스트 프로파일, SSL, 쿠키, timeout, 크기 제한, 오류 표준화
   ├─ queries.py                 필터·검색·정렬·페이지네이션·건수·row_json
   ├─ repository.py              목록/단건/등록/수정/삭제, DB 통계
   ├─ media.py                   data URL, 안전 경로, 썸네일, 외부 이미지 로컬화, 보상 처리
   ├─ jobs.py                    장시간 작업 경계 + background_jobs 작업 큐
   ├─ handler.py                 라우팅, CORS, JSON 응답, 처리시간 로그
   └─ importers/
      ├─ common.py               HTML 정리, OG/JSON-LD, 링크·이미지, URL/작품번호 정규화
      ├─ movie.py                Javtiful, Supjav, ProjectJAV, 123AV/MissAV
      ├─ tmdb.py                 TMDB API + 공개 페이지 fallback
      ├─ actor.py                AVDBS
      └─ webtoon.py              MangaDistrict, MangaDNA, Hentai18, IMHentai
```

### 1.1 의존 방향

```text
config / tables  →  database / http_client  →  queries  →  repository / media / importers  →  jobs  →  handler  →  local_api.py
```

하위 계층은 상위 계층을 import 하지 않는다. 같은 계층에서 허용하는 예외는
`media → repository`(조정 계층)와 `importers.*  → importers.common` 뿐이며,
`scripts/check_module_layers.py`가 이 규칙을 강제한다.

## 2. 실행

```powershell
# DB 기동 (기존 스크립트 그대로)
powershell -File scripts\start_local_db.ps1

# API 단독 실행
python scripts\local_api.py

# 종료
powershell -File scripts\stop_local_db.ps1
```

Vercel은 `api/index.py`가 `from scripts.local_api import Handler`로 진입한다.
`scripts/local_api.py`는 두 경로를 모두 지원한다.

1. 프로젝트 루트가 sys.path에 있으면 `scripts.cinetube_api.handler`
2. 스크립트로 직접 실행되면 `scripts/`를 sys.path에 넣고 `cinetube_api.handler`

## 3. 검증 명령

```powershell
python -m compileall -q scripts\local_api.py scripts\cinetube_api tests   # 정적 컴파일
python scripts\check_module_layers.py                                     # 계층·순환·미사용 import
python -m unittest discover -s tests -t .                                 # 단위 + 통합 + 동시성
```

테스트는 운영 DB와 `local/media`를 사용하지 않는다.
DB는 가짜 연결 객체로, 외부 사이트는 `tests/fixtures/*.html`로 대체한다.

| 테스트 파일 | 범위 |
|---|---|
| `tests/test_common.py` | HTML/메타/JSON-LD/URL·작품번호 정규화 |
| `tests/test_queries.py` | 필터·검색·정렬·페이지네이션·select·SQL 조립 |
| `tests/test_media.py` | data URL, 확장자, 안전 경로, 보상 처리, 로컬화 |
| `tests/test_http_client.py` | 호스트 프로파일, timeout, 크기 제한, 오류 표준화 |
| `tests/test_database_pool.py` | 풀 재사용·고갈 timeout·손상 연결 폐기·컬럼 캐시 |
| `tests/test_importers_movie.py` | Javtiful/Supjav/123AV 정상·차단·불완전 HTML |
| `tests/test_importers_actor_tmdb.py` | AVDBS, TMDB API·페이지 fallback |
| `tests/test_importers_webtoon.py` | 4개 웹툰 사이트 정상·차단 |
| `tests/test_handler_api.py` | URL·상태코드·JSON 형식·CORS 계약 |
| `tests/test_concurrency.py` | 동시 조회, 가져오기 중 조회, 풀 부하·복구 |
| `tests/test_jobs.py` | 큐 SQL 조립, 재시도 backoff, 핸들러 레지스트리 |
| `tests/test_handler_jobs.py` | 비동기 옵트인 202, 작업 상태 API, 동기 계약 유지 |
| `tests/test_jobs_live.py` | 실제 DB 선점·중복 방지·Worker 프로세스 (DB 없으면 skip) |

## 4. 동시 처리 안정화 (1단계 적용분)

| 항목 | 동작 | 조정 환경변수 (기본값) |
|---|---|---|
| DB 연결 풀 크기 | 프로세스당 1개 풀 | `CINETUBE_DB_POOL_SIZE` (8) |
| 풀 대여 대기 | 초과 시 `PoolTimeoutError`, 무한 대기 없음 | `CINETUBE_DB_POOL_WAIT_TIMEOUT` (15초) |
| 외부 HTTP timeout | 연결+읽기 | `CINETUBE_HTTP_TIMEOUT` (20초) |
| 이미지 다운로드 timeout | | `CINETUBE_MEDIA_TIMEOUT` (30초) |
| 외부 HTML 크기 제한 | 초과 시 `RemoteResponseTooLarge` | `CINETUBE_MAX_REMOTE_TEXT_BYTES` (8MB) |
| 외부 이미지 크기 제한 | | `CINETUBE_MAX_REMOTE_IMAGE_BYTES` (32MB) |
| 요청 본문 크기 제한 | | `CINETUBE_MAX_REQUEST_BODY_BYTES` (64MB) |
| 처리시간 로그 | 임계값 초과 요청/SQL/작업 기록 | `CINETUBE_REQUEST_TIMING_LOG` (on), `CINETUBE_SLOW_REQUEST_MS` (1000) |

로거 이름은 `cinetube.database`, `cinetube.http`, `cinetube.media`, `cinetube.jobs`,
`cinetube.handler`로 분리되어 있어 외부 사이트 장애와 DB 장애를 구분해 볼 수 있다.

## 5. 장애 대응

| 증상 | 확인 | 조치 |
|---|---|---|
| 모든 API가 500, 메시지에 `connection` | `cinetube.database` 로그 | PostgreSQL(54322) 기동 확인, `start_local_db.ps1` |
| `DB 연결 풀 대기 시간을 초과했습니다` | 동시 요청 수, 느린 SQL 로그 | 장시간 SQL 확인, `CINETUBE_DB_POOL_SIZE` 상향 |
| 특정 사이트 가져오기만 실패 | `cinetube.http`의 `remote fail` | 응답에 `import_warning: remote_fetch_blocked` → fallback 정상 동작. 사이트 차단이면 대체 URL 사용 |
| 가져오기 응답은 오는데 이미지가 원본 URL 그대로 | `cinetube.media`의 `remote image localize skipped` | 이미지 CDN 차단. 행 등록은 정상이며 `/media/import-url`로 재시도 가능 |
| `invalid media path` | 요청의 owner_table/owner_field | 경로 이탈 차단. 정상 값으로 재요청 |
| 업로드 후 고아 파일 우려 | `media.save_local_media` | DB 등록 실패 시 기록한 파일을 자동 삭제(보상 처리)하므로 잔여 파일 없음 |
| Vercel에서 `ModuleNotFoundError` | `api/index.py` | `scripts/cinetube_api/`가 배포에 포함됐는지 확인 (`vercel.json`의 `excludeFiles`) |

### 5.1 연결 풀 상태 확인

```python
from cinetube_api import database
database.pool_status()   # {'max_size': 8, 'created': n, 'idle': n, 'wait_timeout': 15.0}
```

## 6. 백그라운드 Worker (단계 7, 적용 완료)

사용자 승인 후 `background_jobs` 테이블과 Worker를 도입했다.

```powershell
# 마이그레이션 (반복 실행 안전)
psql -h 127.0.0.1 -p 54322 -U postgres -d cinetube -f local\background_jobs_migration.sql

# Worker 실행 (API와 별도 프로세스)
python scripts\local_worker.py
```

- 기본 요청은 여전히 동기 실행이며 응답 형식이 바뀌지 않는다.
- `?async=1` 또는 `Prefer: respond-async`를 붙인 요청만 `202 Accepted` + 작업 ID를 받는다.
- 상태 조회: `GET /jobs/<id>`, `GET /jobs`, `GET /jobs/stats`

자세한 운영 방법, 중복 실행 방지 구조, 재시도 정책, 분산 실행 전제 조건은
`docs/local_api_worker.md` 참고.

## 7. 남은 승인 대상

작업계획서 14절 승인지점 6 — 공용 Storage 전환.
현재 `media.py`가 `local/media` 로컬 디스크에 직접 쓰므로 여러 서버에서
API/Worker를 나눠 실행하려면 Storage 인터페이스 도입이 선행되어야 한다.
