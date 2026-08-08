"""장시간 작업 경계와 PostgreSQL 기반 작업 큐.

작업계획서 7.1 / 7.3 단계 7.

즉시 처리: 상태 확인, 목록·상세 조회, 일반 CRUD, DB 통계
장시간 후보: 외부 가져오기, 외부 이미지 다운로드, 이미지 변환, 대량 등록

두 가지 실행 모드를 제공한다.

- inline: 요청 스레드에서 그대로 실행한다. 기존 API 응답 계약을 유지하는 기본값이다.
- queued: `background_jobs`에 등록하고 즉시 반환한다. Worker(`scripts/local_worker.py`)가
  `FOR UPDATE SKIP LOCKED`로 선점해 API 프로세스와 독립적으로 실행한다.
"""

import json
import logging
import time

from . import config, media
from .database import json_literal, run_sql, sql_literal
from .importers import build_actor_import, build_movie_import, build_webtoon_import

logger = logging.getLogger("cinetube.jobs")

JOBS_TABLE = "public.background_jobs"

INLINE = "inline"
QUEUED = "queued"

STATUS_QUEUED = "queued"
STATUS_RUNNING = "running"
STATUS_SUCCEEDED = "succeeded"
STATUS_FAILED = "failed"
STATUS_CANCELED = "canceled"

TERMINAL_STATUSES = frozenset({STATUS_SUCCEEDED, STATUS_FAILED, STATUS_CANCELED})

DEFAULT_MAX_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = (30, 120, 600)
STALE_JOB_SECONDS = 900

# 컬럼 순서를 한 곳에서 관리해 조회 응답 형식을 고정한다.
JOB_COLUMNS = (
    "id", "job_type", "status", "payload", "result", "error",
    "attempts", "max_attempts", "run_after", "locked_by", "locked_at",
    "started_at", "finished_at", "created_at", "updated_at",
)


class UnknownJobTypeError(ValueError):
    """등록되지 않은 작업 유형."""


# --- 작업 유형 정의 ---------------------------------------------------------

def _movie_import(payload):
    return build_movie_import(payload.get("value"), payload.get("site", "auto"))


def _actor_import(payload):
    return build_actor_import(payload.get("actor_name", ""), payload.get("value"))


def _webtoon_import(payload):
    return build_webtoon_import(payload.get("value"), payload.get("site", "auto"))


def _media_import_url(payload):
    return media.import_remote_media(payload)


def _media_upload(payload):
    return media.save_local_media(payload)


def _media_localize(payload):
    table = payload.get("table")
    rows = payload.get("rows") or []
    return media.localize_remote_images(table, rows)


JOB_HANDLERS = {
    "movie_import": _movie_import,
    "actor_import": _actor_import,
    "webtoon_import": _webtoon_import,
    "media_import_url": _media_import_url,
    "media_upload": _media_upload,
    "media_localize": _media_localize,
}

# 백그라운드 Worker로 이전할 수 있는 작업 목록
LONG_RUNNING_JOBS = frozenset(JOB_HANDLERS)


def is_long_running(name):
    return name in LONG_RUNNING_JOBS


# --- inline 실행 ------------------------------------------------------------

def run_job(name, func, *args, **kwargs):
    """작업 실행 경계. 반환값은 (mode, result)."""
    started = time.perf_counter()
    try:
        result = func(*args, **kwargs)
    except Exception:
        logger.warning(
            "job failed name=%s elapsed=%.1fms",
            name,
            (time.perf_counter() - started) * 1000,
        )
        raise
    elapsed_ms = (time.perf_counter() - started) * 1000
    if config.REQUEST_TIMING_LOG and elapsed_ms >= config.SLOW_REQUEST_MS:
        logger.info("job done name=%s elapsed=%.1fms", name, elapsed_ms)
    return INLINE, result


def run(name, func, *args, **kwargs):
    """run_job의 결과값만 필요한 호출부를 위한 축약형."""
    _, result = run_job(name, func, *args, **kwargs)
    return result


def run_handler(job_type, payload):
    """등록된 작업 유형을 inline으로 실행한다 (Worker와 동일한 경로)."""
    handler = JOB_HANDLERS.get(job_type)
    if handler is None:
        raise UnknownJobTypeError(f"unknown job type: {job_type}")
    return run(job_type, handler, payload)


# --- 큐 조작 ----------------------------------------------------------------

def _rows(sql):
    return json.loads(run_sql(sql) or "[]")


def _one(sql):
    rows = _rows(sql)
    return rows[0] if rows else None


def _select_list():
    return ", ".join(JOB_COLUMNS)


def enqueue(job_type, payload=None, max_attempts=DEFAULT_MAX_ATTEMPTS):
    """작업을 큐에 등록하고 등록된 행을 반환한다."""
    if job_type not in JOB_HANDLERS:
        raise UnknownJobTypeError(f"unknown job type: {job_type}")
    sql = (
        f"with q as ("
        f"insert into {JOBS_TABLE} (job_type, payload, max_attempts) "
        f"values ({sql_literal(job_type)}, {json_literal(payload or {})}::jsonb, "
        f"{int(max_attempts)}) "
        f"returning {_select_list()}"
        f") select coalesce(json_agg(row_to_json(q)), '[]'::json) from q;"
    )
    job = _one(sql)
    logger.info("job queued id=%s type=%s", job.get("id") if job else None, job_type)
    return job


def get_job(job_id):
    try:
        job_id = int(job_id)
    except (TypeError, ValueError):
        raise ValueError("invalid job id") from None
    sql = (
        f"select coalesce(json_agg(row_to_json(q)), '[]'::json) from ("
        f"select {_select_list()} from {JOBS_TABLE} where id = {job_id}"
        f") q;"
    )
    return _one(sql)


def list_jobs(status=None, job_type=None, limit=50):
    limit = max(1, min(int(limit or 50), 200))
    clauses = []
    if status:
        clauses.append(f"status = {sql_literal(status)}")
    if job_type:
        clauses.append(f"job_type = {sql_literal(job_type)}")
    where = f" where {' and '.join(clauses)}" if clauses else ""
    sql = (
        f"select coalesce(json_agg(row_to_json(q)), '[]'::json) from ("
        f"select {_select_list()} from {JOBS_TABLE}{where} "
        f"order by created_at desc, id desc limit {limit}"
        f") q;"
    )
    return _rows(sql)


def queue_stats():
    sql = (
        f"select coalesce(json_agg(row_to_json(q)), '[]'::json) from ("
        f"select status, count(*)::int as count from {JOBS_TABLE} group by status"
        f") q;"
    )
    return {row["status"]: row["count"] for row in _rows(sql)}


def claim_job(worker_id):
    """queued 작업 1건을 원자적으로 선점한다.

    `FOR UPDATE SKIP LOCKED`를 단일 문장 안에서 사용하므로 Worker가 여러 개여도
    같은 작업을 중복 실행하지 않는다.
    """
    sql = (
        f"with claimed as ("
        f"  select id from {JOBS_TABLE}"
        f"  where status = {sql_literal(STATUS_QUEUED)} and run_after <= now()"
        f"  order by run_after, id"
        f"  for update skip locked"
        f"  limit 1"
        f"), updated as ("
        f"  update {JOBS_TABLE} j set"
        f"    status = {sql_literal(STATUS_RUNNING)},"
        f"    attempts = j.attempts + 1,"
        f"    locked_by = {sql_literal(worker_id)},"
        f"    locked_at = now(),"
        f"    started_at = coalesce(j.started_at, now()),"
        f"    updated_at = now()"
        f"  from claimed where j.id = claimed.id"
        f"  returning {', '.join('j.' + column for column in JOB_COLUMNS)}"
        f") select coalesce(json_agg(row_to_json(updated)), '[]'::json) from updated;"
    )
    return _one(sql)


def complete_job(job_id, result):
    sql = (
        f"with q as ("
        f"update {JOBS_TABLE} set"
        f"  status = {sql_literal(STATUS_SUCCEEDED)},"
        f"  result = {json_literal(result)}::jsonb,"
        f"  error = null,"
        f"  locked_by = null,"
        f"  locked_at = null,"
        f"  finished_at = now(),"
        f"  updated_at = now()"
        f" where id = {int(job_id)}"
        f" returning {_select_list()}"
        f") select coalesce(json_agg(row_to_json(q)), '[]'::json) from q;"
    )
    return _one(sql)


def retry_delay_seconds(attempts):
    index = max(0, int(attempts) - 1)
    if index >= len(RETRY_BACKOFF_SECONDS):
        return RETRY_BACKOFF_SECONDS[-1]
    return RETRY_BACKOFF_SECONDS[index]


def fail_job(job_id, error, attempts, max_attempts):
    """실패를 기록한다. 재시도 횟수가 남아 있으면 backoff 후 다시 queued로 되돌린다."""
    retryable = int(attempts) < int(max_attempts)
    if retryable:
        delay = retry_delay_seconds(attempts)
        assignments = (
            f"status = {sql_literal(STATUS_QUEUED)},"
            f" run_after = now() + interval '{int(delay)} seconds',"
            f" locked_by = null, locked_at = null,"
            f" error = {sql_literal(error)}, updated_at = now()"
        )
    else:
        assignments = (
            f"status = {sql_literal(STATUS_FAILED)},"
            f" locked_by = null, locked_at = null, finished_at = now(),"
            f" error = {sql_literal(error)}, updated_at = now()"
        )
    sql = (
        f"with q as ("
        f"update {JOBS_TABLE} set {assignments} where id = {int(job_id)} "
        f"returning {_select_list()}"
        f") select coalesce(json_agg(row_to_json(q)), '[]'::json) from q;"
    )
    return _one(sql)


def recover_stale_jobs(older_than_seconds=STALE_JOB_SECONDS):
    """중단된 Worker가 running으로 남긴 작업을 다시 queued로 되돌린다."""
    sql = (
        f"with q as ("
        f"update {JOBS_TABLE} set"
        f"  status = {sql_literal(STATUS_QUEUED)},"
        f"  locked_by = null, locked_at = null, updated_at = now()"
        f" where status = {sql_literal(STATUS_RUNNING)}"
        f"   and locked_at < now() - interval '{int(older_than_seconds)} seconds'"
        f" returning id"
        f") select coalesce(json_agg(row_to_json(q)), '[]'::json) from q;"
    )
    recovered = [row["id"] for row in _rows(sql)]
    if recovered:
        logger.warning("recovered stale jobs: %s", recovered)
    return recovered


def execute_job(job):
    """선점한 작업을 실행하고 성공/실패를 기록한다. 반환값은 갱신된 작업 행."""
    job_id = job["id"]
    job_type = job["job_type"]
    payload = job.get("payload") or {}
    handler = JOB_HANDLERS.get(job_type)
    if handler is None:
        return fail_job(job_id, f"unknown job type: {job_type}", job["max_attempts"], job["max_attempts"])

    started = time.perf_counter()
    try:
        result = handler(payload)
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.warning("job %s (%s) failed after %.1fms: %s", job_id, job_type, elapsed_ms, exc)
        return fail_job(job_id, str(exc), job["attempts"], job["max_attempts"])

    elapsed_ms = (time.perf_counter() - started) * 1000
    logger.info("job %s (%s) succeeded in %.1fms", job_id, job_type, elapsed_ms)
    return complete_job(job_id, result)


def assert_queue_available():
    """background_jobs 테이블이 적용되어 있는지 확인한다."""
    output = run_sql(
        "select 1 from information_schema.tables "
        "where table_schema = 'public' and table_name = 'background_jobs';"
    )
    if not output.strip():
        raise RuntimeError(
            "background_jobs 테이블이 없습니다. "
            "local/background_jobs_migration.sql을 먼저 적용하세요."
        )
    return True


__all__ = [
    "INLINE", "QUEUED", "JOB_HANDLERS", "LONG_RUNNING_JOBS", "UnknownJobTypeError",
    "STATUS_QUEUED", "STATUS_RUNNING", "STATUS_SUCCEEDED", "STATUS_FAILED", "STATUS_CANCELED",
    "TERMINAL_STATUSES", "assert_queue_available", "claim_job", "complete_job", "enqueue",
    "execute_job", "fail_job", "get_job", "is_long_running", "list_jobs", "queue_stats",
    "recover_stale_jobs", "retry_delay_seconds", "run", "run_handler", "run_job",
]
