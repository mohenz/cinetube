"""장시간 작업 경계 정의.

현재 단계에서는 모든 작업을 요청 스레드에서 그대로 실행(inline)한다.
`background_jobs` 테이블과 Worker 프로세스는 DB 스키마 변경 승인 이후
`run_job` 구현만 교체하면 되도록 호출부를 이 모듈로 모아 둔다.

즉시 처리: 상태 확인, 목록·상세 조회, 일반 CRUD, DB 통계
장시간 후보: 외부 가져오기, 외부 이미지 다운로드, 이미지 변환, 대량 등록
"""

import logging
import time

from . import config

logger = logging.getLogger("cinetube.jobs")

# 백그라운드 Worker로 이전할 후보 작업 이름
LONG_RUNNING_JOBS = frozenset({
    "movie_import",
    "actor_import",
    "webtoon_import",
    "media_import_url",
    "media_upload",
    "media_localize",
})

INLINE = "inline"


def is_long_running(name):
    return name in LONG_RUNNING_JOBS


def run_job(name, func, *args, **kwargs):
    """작업 실행 경계.

    반환값은 (mode, result)이며 현재는 항상 ("inline", 결과)다.
    Worker 도입 후에는 장시간 작업에 한해 ("queued", {"job_id": ...})를
    반환하도록 이 함수만 교체한다.
    """
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
