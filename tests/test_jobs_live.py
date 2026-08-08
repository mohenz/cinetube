"""실제 PostgreSQL 기준 작업 큐/Worker 통합테스트.

DB에 접속할 수 없거나 background_jobs 테이블이 없으면 건너뛴다.
`media_localize`(이미지 필드가 없는 테이블 -> 네트워크·파일 접근 없음)와
잘못된 URL의 `media_import_url`(즉시 ValueError)만 사용하므로
운영 데이터와 local/media 파일을 건드리지 않는다.
테스트가 만든 background_jobs 행은 종료 시 모두 삭제한다.
"""

import os
import subprocess
import sys
import threading
import unittest

from cinetube_api import database, jobs

from . import PROJECT_ROOT, SCRIPTS_DIR

WORKER = os.path.join(SCRIPTS_DIR, "local_worker.py")


def queue_available():
    try:
        jobs.assert_queue_available()
        return True
    except Exception:
        return False


AVAILABLE = queue_available()


def fetch_job(job_id):
    return jobs.get_job(job_id)


def delete_jobs(job_ids):
    if not job_ids:
        return
    ids = ",".join(str(int(job_id)) for job_id in job_ids)
    database.run_sql(f"delete from public.background_jobs where id in ({ids});")


def run_worker(args, timeout=90):
    env = dict(os.environ)
    env.setdefault("PGHOST", "127.0.0.1")
    env.setdefault("PGPORT", "54322")
    env.setdefault("PGUSER", "postgres")
    env.setdefault("PGDATABASE", "cinetube")
    env["PYTHONIOENCODING"] = "utf-8"
    return subprocess.run(
        [sys.executable, WORKER, *args],
        cwd=PROJECT_ROOT, env=env, timeout=timeout,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace",
    )


@unittest.skipUnless(AVAILABLE, "background_jobs 테이블에 접속할 수 없어 건너뜁니다")
class QueueRoundTripTest(unittest.TestCase):
    def setUp(self):
        self.created = []
        self.addCleanup(lambda: delete_jobs(self.created))

    def enqueue(self, job_type, payload, max_attempts=jobs.DEFAULT_MAX_ATTEMPTS):
        job = jobs.enqueue(job_type, payload, max_attempts=max_attempts)
        self.created.append(job["id"])
        return job

    def test_enqueue_returns_queued_row(self):
        job = self.enqueue("media_localize", {"table": "rating_grades", "rows": [{"grade": "A"}]})
        self.assertEqual(job["status"], jobs.STATUS_QUEUED)
        self.assertEqual(job["job_type"], "media_localize")
        self.assertEqual(job["attempts"], 0)
        self.assertEqual(job["max_attempts"], 3)
        self.assertEqual(job["payload"]["table"], "rating_grades")
        self.assertIsNone(job["result"])

    def test_get_job_reads_back(self):
        job = self.enqueue("media_localize", {"table": "rating_grades", "rows": []})
        fetched = fetch_job(job["id"])
        self.assertEqual(fetched["id"], job["id"])
        self.assertEqual(fetched["status"], jobs.STATUS_QUEUED)

    def test_claim_marks_running_and_increments_attempts(self):
        job = self.enqueue("media_localize", {"table": "rating_grades", "rows": []})
        claimed = None
        for _ in range(50):  # 큐에 남아 있던 다른 작업을 건너뛰기 위해 반복
            candidate = jobs.claim_job("test-worker")
            if candidate is None:
                break
            if candidate["id"] == job["id"]:
                claimed = candidate
                break
            self.created.append(candidate["id"])
        self.assertIsNotNone(claimed, "등록한 작업을 선점하지 못했습니다")
        self.assertEqual(claimed["status"], jobs.STATUS_RUNNING)
        self.assertEqual(claimed["attempts"], 1)
        self.assertEqual(claimed["locked_by"], "test-worker")
        self.assertIsNotNone(claimed["locked_at"])

        jobs.complete_job(job["id"], {"done": True})
        finished = fetch_job(job["id"])
        self.assertEqual(finished["status"], jobs.STATUS_SUCCEEDED)
        self.assertEqual(finished["result"], {"done": True})
        self.assertIsNone(finished["locked_by"])

    def test_claim_does_not_hand_same_job_twice(self):
        job = self.enqueue("media_localize", {"table": "rating_grades", "rows": []})
        seen = []
        lock = threading.Lock()

        def claim():
            for _ in range(20):
                candidate = jobs.claim_job("race-worker")
                if candidate is None:
                    return
                with lock:
                    if candidate["id"] not in self.created:
                        self.created.append(candidate["id"])
                    seen.append(candidate["id"])
                if candidate["id"] == job["id"]:
                    return

        threads = [threading.Thread(target=claim) for _ in range(4)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)

        self.assertEqual(seen.count(job["id"]), 1, "같은 작업이 두 번 선점되었습니다")
        self.assertEqual(len(seen), len(set(seen)), "중복 선점된 작업이 있습니다")

    def test_fail_then_retry_then_terminal(self):
        job = self.enqueue("media_localize", {"table": "rating_grades", "rows": []}, max_attempts=2)
        retried = jobs.fail_job(job["id"], "일시적 오류", attempts=1, max_attempts=2)
        self.assertEqual(retried["status"], jobs.STATUS_QUEUED)
        self.assertEqual(retried["error"], "일시적 오류")
        self.assertIsNone(retried["locked_by"])

        terminal = jobs.fail_job(job["id"], "최종 실패", attempts=2, max_attempts=2)
        self.assertEqual(terminal["status"], jobs.STATUS_FAILED)
        self.assertEqual(terminal["error"], "최종 실패")
        self.assertIsNotNone(terminal["finished_at"])

    def test_queue_stats_returns_counts(self):
        self.enqueue("media_localize", {"table": "rating_grades", "rows": []})
        stats = jobs.queue_stats()
        self.assertIn(jobs.STATUS_QUEUED, stats)
        self.assertGreaterEqual(stats[jobs.STATUS_QUEUED], 1)


@unittest.skipUnless(AVAILABLE, "background_jobs 테이블에 접속할 수 없어 건너뜁니다")
class WorkerProcessTest(unittest.TestCase):
    def setUp(self):
        self.created = []
        self.addCleanup(lambda: delete_jobs(self.created))

    def enqueue(self, job_type, payload, max_attempts=jobs.DEFAULT_MAX_ATTEMPTS):
        job = jobs.enqueue(job_type, payload, max_attempts=max_attempts)
        self.created.append(job["id"])
        return job

    def test_worker_process_executes_queued_job(self):
        job = self.enqueue("media_localize", {
            "table": "rating_grades",
            "rows": [{"grade": "A", "display_order": 2}],
        })
        result = run_worker(["--once", "--recover-stale", "0", "--log-level", "WARNING"])
        self.assertEqual(result.returncode, 0, result.stdout)

        finished = fetch_job(job["id"])
        self.assertEqual(finished["status"], jobs.STATUS_SUCCEEDED, finished.get("error"))
        self.assertEqual(finished["attempts"], 1)
        self.assertEqual(finished["result"], [{"grade": "A", "display_order": 2}])
        self.assertIsNotNone(finished["started_at"])
        self.assertIsNotNone(finished["finished_at"])
        self.assertIsNone(finished["locked_by"])

    def test_worker_records_failure_without_retry_when_attempts_exhausted(self):
        job = self.enqueue("media_import_url", {"url": "not-a-url"}, max_attempts=1)
        result = run_worker(["--once", "--recover-stale", "0", "--log-level", "WARNING"])
        self.assertEqual(result.returncode, 0, result.stdout)

        finished = fetch_job(job["id"])
        self.assertEqual(finished["status"], jobs.STATUS_FAILED)
        self.assertEqual(finished["attempts"], 1)
        self.assertIn("http", finished["error"].lower())
        self.assertIsNone(finished["result"])

    def test_two_workers_do_not_run_the_same_job_twice(self):
        job_ids = [
            self.enqueue("media_localize", {"table": "rating_grades", "rows": [{"n": index}]})["id"]
            for index in range(6)
        ]
        outputs = {}

        def launch(name):
            outputs[name] = run_worker(["--once", "--recover-stale", "0", "--log-level", "WARNING"])

        threads = [threading.Thread(target=launch, args=(name,)) for name in ("a", "b")]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=120)

        for name, result in outputs.items():
            self.assertEqual(result.returncode, 0, f"{name}: {result.stdout}")

        for index, job_id in enumerate(job_ids):
            finished = fetch_job(job_id)
            self.assertEqual(finished["status"], jobs.STATUS_SUCCEEDED, finished.get("error"))
            self.assertEqual(finished["attempts"], 1, f"job {job_id} 가 두 번 실행되었습니다")
            self.assertEqual(finished["result"], [{"n": index}])

    def test_worker_drain_limit_stops_early(self):
        for index in range(3):
            self.enqueue("media_localize", {"table": "rating_grades", "rows": [{"i": index}]})
        result = run_worker(["--once", "--drain-limit", "1", "--recover-stale", "0", "--log-level", "INFO"])
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertIn("stopped after 1 job", result.stdout)

    def test_worker_reports_missing_queue_clearly(self):
        env = dict(os.environ)
        env["PGDATABASE"] = "postgres"
        env["PYTHONIOENCODING"] = "utf-8"
        result = subprocess.run(
            [sys.executable, WORKER, "--once"],
            cwd=PROJECT_ROOT, env=env, timeout=60,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace",
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("background_jobs", result.stdout)


@unittest.skipUnless(AVAILABLE, "background_jobs 테이블에 접속할 수 없어 건너뜁니다")
class StaleRecoveryTest(unittest.TestCase):
    def setUp(self):
        self.created = []
        self.addCleanup(lambda: delete_jobs(self.created))

    def test_stale_running_job_is_requeued(self):
        job = jobs.enqueue("media_localize", {"table": "rating_grades", "rows": []})
        self.created.append(job["id"])
        database.run_sql(
            "update public.background_jobs set status = 'running', locked_by = 'dead-worker', "
            f"locked_at = now() - interval '2 hours' where id = {job['id']};"
        )
        recovered = jobs.recover_stale_jobs(3600)
        self.assertIn(job["id"], recovered)

        requeued = fetch_job(job["id"])
        self.assertEqual(requeued["status"], jobs.STATUS_QUEUED)
        self.assertIsNone(requeued["locked_by"])


if __name__ == "__main__":
    unittest.main()
