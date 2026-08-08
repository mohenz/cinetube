# CineTube 백그라운드 Worker 운영 문서

- 기준일: 2026-08-08
- 대상: `scripts/local_worker.py`, `scripts/cinetube_api/jobs.py`, `public.background_jobs`
- 근거: `docs/local_api_feature_improvement_work_plan.md` 7.3 / 단계 7
- 함께 볼 문서: `docs/local_api_contract.md`(§6 작업 API), `docs/local_api_operations.md`

## 1. 무엇이 달라지는가

장시간 작업(외부 사이트 가져오기, 외부 이미지 다운로드, 이미지 변환)을
API 요청 스레드가 아니라 **별도 Worker 프로세스**에서 실행할 수 있다.

**기존 동작은 그대로다.** 요청이 명시적으로 비동기를 요청하지 않으면
지금까지와 똑같이 동기 실행되고 같은 JSON을 반환한다. 관리자 화면을 포함한
기존 호출부는 수정할 필요가 없다.

```text
[동기 - 기본값]
브라우저 → API → 외부 사이트 → 응답(dict)

[비동기 - async=1 또는 Prefer: respond-async]
브라우저 → API → background_jobs INSERT → 202 {job_id}
                      ↑                          ↓
                 Worker 프로세스  ← FOR UPDATE SKIP LOCKED
                      ↓
                 결과/오류 기록 → 브라우저가 GET /jobs/<id>로 확인
```

## 2. DB 마이그레이션

| 파일 | 용도 |
|---|---|
| `local/background_jobs_migration.sql` | 로컬 PostgreSQL 적용 |
| `supabase/background_jobs_migration.sql` | Supabase 적용 (동일 내용) |
| `local/schema.sql`, `supabase/schema.sql` | 신규 클러스터 초기화 시 포함 |

- 새 테이블 `public.background_jobs`와 인덱스 4개만 추가한다.
- 기존 테이블/컬럼/데이터를 변경하지 않는다. `ALTER`/`DROP`/`TRUNCATE` 없음.
- `create table if not exists` / `create index if not exists`라 반복 실행해도 안전하다.

적용:

```powershell
psql -h 127.0.0.1 -p 54322 -U postgres -d cinetube -v ON_ERROR_STOP=1 -f local\background_jobs_migration.sql
```

롤백이 필요하면 `drop table public.background_jobs;` 한 줄이며, 이 테이블은
다른 테이블에서 참조하지 않으므로 기존 데이터에 영향이 없다.
(스키마 삭제 작업이므로 사용자가 직접 수행한다.)

### 2.1 테이블 구조

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | bigserial | 작업 ID |
| `job_type` | text | `jobs.JOB_HANDLERS`에 등록된 유형만 허용 |
| `status` | text | `queued` / `running` / `succeeded` / `failed` / `canceled` (check 제약) |
| `payload` | jsonb | 작업 입력 |
| `result` | jsonb | 성공 결과 |
| `error` | text | 마지막 오류 메시지 |
| `attempts` / `max_attempts` | int | 시도 횟수 / 최대 시도 (기본 3) |
| `run_after` | timestamptz | 재시도 backoff 예약 시각 |
| `locked_by` / `locked_at` | text / timestamptz | 선점 Worker 식별자와 시각 |
| `started_at` / `finished_at` | timestamptz | 최초 실행 / 종료 |
| `created_at` / `updated_at` | timestamptz | 등록 / 최종 갱신 |

## 3. Worker 실행

```powershell
# 상시 실행 (기본: 스레드 1개, 2초 폴링)
python scripts\local_worker.py

# 큐가 빌 때까지만 처리하고 종료
python scripts\local_worker.py --once

# 동시 처리 2개
python scripts\local_worker.py --concurrency 2

# 최대 10건만 처리
python scripts\local_worker.py --drain-limit 10
```

| 옵션 | 환경변수 | 기본값 |
|---|---|---|
| `--worker-id` | `CINETUBE_WORKER_ID` | `hostname:pid` |
| `--poll-interval` | `CINETUBE_WORKER_POLL_INTERVAL` | 2.0초 |
| `--concurrency` | `CINETUBE_WORKER_CONCURRENCY` | 1 |
| `--recover-stale` | — | 900초 |
| `--log-level` | `CINETUBE_WORKER_LOG_LEVEL` | INFO |

DB 접속 설정은 API와 동일한 환경변수(`DATABASE_URL` 또는 `PG*`)를 쓴다.
`background_jobs` 테이블이 없으면 시작 시 마이그레이션 안내 메시지와 함께 종료한다.

`Ctrl+C`(SIGINT)나 SIGTERM을 받으면 **진행 중인 작업을 끝낸 뒤** 종료한다.

## 4. 중복 실행 방지

작업 선점은 단일 SQL 문장 안에서 이뤄진다.

```sql
with claimed as (
  select id from public.background_jobs
  where status = 'queued' and run_after <= now()
  order by run_after, id
  for update skip locked
  limit 1
), updated as (
  update public.background_jobs j
  set status = 'running', attempts = j.attempts + 1,
      locked_by = ..., locked_at = now(), started_at = coalesce(j.started_at, now())
  from claimed where j.id = claimed.id
  returning j.*
) select ... from updated;
```

- `FOR UPDATE SKIP LOCKED`로 다른 Worker가 잡은 행은 건너뛴다.
- 선점과 상태 전이가 한 문장(= 하나의 트랜잭션)이라 원자적이다.
- Worker를 몇 개를 띄우든, 한 프로세스 안에서 스레드를 몇 개 쓰든 같은 작업이 두 번 실행되지 않는다.
- 검증: `tests/test_jobs_live.py`의 `test_claim_does_not_hand_same_job_twice`(스레드 4개),
  `test_two_workers_do_not_run_the_same_job_twice`(독립 프로세스 2개 × 작업 6건 → 전부 `attempts == 1`).

## 5. 실패와 재시도

- 핸들러 예외 → `attempts < max_attempts`면 `queued`로 되돌리고 `run_after`에 backoff 적용
- backoff: 30초 → 120초 → 600초 (이후 600초 고정)
- 시도를 모두 쓰면 `failed` + `error` 기록, `finished_at` 설정
- 등록되지 않은 `job_type`은 재시도 없이 즉시 `failed`
- Worker가 죽어 `running`으로 남은 작업은 다음 Worker 기동 시
  `--recover-stale` 초과분을 `queued`로 회수한다 (기본 900초)

## 6. 운영 확인

```powershell
# 큐 상태
curl http://127.0.0.1:3001/jobs/stats

# 실패한 작업만
curl "http://127.0.0.1:3001/jobs?status=failed&limit=20"

# 개별 작업
curl http://127.0.0.1:3001/jobs/55
```

```sql
-- 오래 대기 중인 작업
select id, job_type, status, attempts, run_after, error
from public.background_jobs
where status in ('queued', 'running')
order by run_after;

-- 처리 완료 작업 정리 (보존 기간은 운영 판단)
delete from public.background_jobs
where status = 'succeeded' and finished_at < now() - interval '7 days';
```

| 증상 | 원인 | 조치 |
|---|---|---|
| 작업이 `queued`에서 안 넘어감 | Worker 미기동 | `python scripts\local_worker.py` 실행 |
| `running`에 계속 머무름 | Worker 비정상 종료 | Worker 재기동 시 자동 회수(기본 900초) 또는 `--recover-stale 60` |
| 같은 작업이 반복 실패 | 외부 사이트 차단 | `error` 확인. 가져오기는 fallback으로 성공 처리되는 경우가 많음 |
| Worker가 즉시 종료 | 큐 테이블 없음 | 2절 마이그레이션 적용 |
| DB 연결 대기 경고 | `--concurrency` > 풀 크기 | `CINETUBE_DB_POOL_SIZE` 상향 또는 concurrency 축소 |

## 7. 분산 실행 (작업계획서 7.4)

- API 프로세스와 Worker 프로세스는 이미 독립적이다. Worker 수만 늘리면 처리량이 늘어난다.
- **여러 서버에서 실행하려면 이미지 저장소를 공용 Storage로 먼저 전환해야 한다.**
  현재 `media.py`는 `local/media` 로컬 디스크에 직접 쓰므로, 서버가 나뉘면
  Worker가 저장한 파일을 다른 서버의 API가 서빙하지 못한다.
  이 전환은 작업계획서 14절 승인지점 6에 해당하며 아직 진행하지 않았다.
- Vercel에서는 서버리스 함수가 상시 실행 프로세스를 유지하지 않으므로
  Worker를 함께 배포하지 않는다. Vercel 배포본은 동기 경로만 사용한다.
