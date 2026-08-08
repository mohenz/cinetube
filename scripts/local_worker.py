"""CineTube 백그라운드 작업 Worker.

작업계획서 단계 7. API 프로세스와 독립 실행되며 `background_jobs` 큐에서
`FOR UPDATE SKIP LOCKED`로 작업을 선점해 처리한다.

    python scripts/local_worker.py                  # 상시 실행
    python scripts/local_worker.py --once           # 큐가 빌 때까지만 처리하고 종료
    python scripts/local_worker.py --concurrency 2  # 스레드 2개로 처리
    python scripts/local_worker.py --drain-limit 10 # 최대 10건 처리 후 종료

Worker를 여러 개 띄워도 같은 작업이 중복 실행되지 않는다.
DB 접속 설정은 API와 동일한 환경변수(DATABASE_URL 또는 PG*)를 사용한다.
"""

import argparse
import logging
import os
import signal
import socket
import sys
import threading
import time

_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

try:  # 프로젝트 루트에서 `scripts.local_worker`로 import 되는 경우
    from scripts.cinetube_api import config, database, jobs
except ImportError:  # 스크립트로 직접 실행되는 경우
    if _SCRIPTS_DIR not in sys.path:
        sys.path.insert(0, _SCRIPTS_DIR)
    from cinetube_api import config, database, jobs

logger = logging.getLogger("cinetube.worker")

_stop = threading.Event()


def request_stop(*_args):
    if not _stop.is_set():
        logger.info("shutdown requested; finishing current job")
    _stop.set()


def default_worker_id():
    return f"{socket.gethostname()}:{os.getpid()}"


def process_one(worker_id):
    """작업 1건을 선점해 실행한다. 처리했으면 True."""
    job = jobs.claim_job(worker_id)
    if job is None:
        return False
    logger.info(
        "claimed job id=%s type=%s attempt=%s/%s",
        job["id"], job["job_type"], job["attempts"], job["max_attempts"],
    )
    updated = jobs.execute_job(job)
    if updated:
        logger.info("job id=%s -> %s", updated["id"], updated["status"])
    return True


def worker_loop(worker_id, poll_interval, once, drain_limit, counter, counter_lock):
    idle_logged = False
    while not _stop.is_set():
        if drain_limit:
            with counter_lock:
                if counter["done"] >= drain_limit:
                    return
        try:
            handled = process_one(worker_id)
        except database.DatabaseError as exc:
            logger.error("database error, retrying in %.1fs: %s", poll_interval, exc)
            _stop.wait(poll_interval)
            continue
        except Exception as exc:  # 예상 못한 오류로 Worker가 죽지 않게 한다
            logger.exception("unexpected worker error: %s", exc)
            _stop.wait(poll_interval)
            continue

        if handled:
            idle_logged = False
            with counter_lock:
                counter["done"] += 1
            continue

        if once:
            return
        if not idle_logged:
            logger.debug("queue empty; polling every %.1fs", poll_interval)
            idle_logged = True
        _stop.wait(poll_interval)


def main(argv=None):
    parser = argparse.ArgumentParser(description="CineTube background job worker")
    parser.add_argument("--worker-id", default=os.getenv("CINETUBE_WORKER_ID", ""),
                        help="Worker 식별자 (기본: hostname:pid)")
    parser.add_argument("--poll-interval", type=float,
                        default=float(os.getenv("CINETUBE_WORKER_POLL_INTERVAL", "2.0")),
                        help="큐가 비었을 때 재확인 간격(초)")
    parser.add_argument("--concurrency", type=int,
                        default=int(os.getenv("CINETUBE_WORKER_CONCURRENCY", "1")),
                        help="동시 처리 스레드 수")
    parser.add_argument("--once", action="store_true",
                        help="큐가 빌 때까지만 처리하고 종료")
    parser.add_argument("--drain-limit", type=int, default=0,
                        help="처리할 최대 작업 수 (0=무제한)")
    parser.add_argument("--recover-stale", type=int, default=jobs.STALE_JOB_SECONDS,
                        help="이 시간(초) 이상 running으로 남은 작업을 시작 시 큐로 되돌린다")
    parser.add_argument("--log-level", default=os.getenv("CINETUBE_WORKER_LOG_LEVEL", "INFO"))
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, str(args.log_level).upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    worker_id = args.worker_id or default_worker_id()
    concurrency = max(1, args.concurrency)

    if concurrency > config.DB_POOL_MAX_SIZE:
        logger.warning(
            "concurrency %s exceeds DB pool size %s; 연결 대기가 발생할 수 있습니다",
            concurrency, config.DB_POOL_MAX_SIZE,
        )

    jobs.assert_queue_available()

    signal.signal(signal.SIGINT, request_stop)
    try:
        signal.signal(signal.SIGTERM, request_stop)
    except (AttributeError, ValueError):  # 플랫폼에 따라 없을 수 있다
        pass

    if args.recover_stale > 0:
        jobs.recover_stale_jobs(args.recover_stale)

    logger.info(
        "worker %s started (concurrency=%s poll=%.1fs once=%s)",
        worker_id, concurrency, args.poll_interval, args.once,
    )

    counter = {"done": 0}
    counter_lock = threading.Lock()
    started = time.perf_counter()

    if concurrency == 1:
        worker_loop(worker_id, args.poll_interval, args.once, args.drain_limit, counter, counter_lock)
    else:
        threads = [
            threading.Thread(
                target=worker_loop,
                args=(f"{worker_id}#{index}", args.poll_interval, args.once,
                      args.drain_limit, counter, counter_lock),
                daemon=True,
            )
            for index in range(concurrency)
        ]
        for thread in threads:
            thread.start()
        try:
            while any(thread.is_alive() for thread in threads):
                for thread in threads:
                    thread.join(timeout=0.5)
        except KeyboardInterrupt:
            request_stop()
            for thread in threads:
                thread.join(timeout=10)

    logger.info(
        "worker %s stopped after %s job(s) in %.1fs",
        worker_id, counter["done"], time.perf_counter() - started,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
