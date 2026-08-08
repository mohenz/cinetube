"""jobs.py 작업 큐 단위테스트 (DB 미접속, run_sql 대체)."""

import json
import unittest
from unittest import mock

from cinetube_api import jobs


def sql_returning(rows):
    """run_sql이 반환하는 json_agg 문자열."""
    return json.dumps(rows, ensure_ascii=False)


class HandlerRegistryTest(unittest.TestCase):
    def test_long_running_jobs_match_handlers(self):
        self.assertEqual(set(jobs.LONG_RUNNING_JOBS), set(jobs.JOB_HANDLERS))

    def test_expected_job_types_are_registered(self):
        for job_type in (
            "movie_import", "actor_import", "webtoon_import",
            "media_import_url", "media_upload", "media_localize",
        ):
            self.assertIn(job_type, jobs.JOB_HANDLERS, job_type)

    def test_is_long_running(self):
        self.assertTrue(jobs.is_long_running("movie_import"))
        self.assertFalse(jobs.is_long_running("select_rows"))

    def test_run_handler_dispatches(self):
        with mock.patch.dict(jobs.JOB_HANDLERS, {"movie_import": lambda payload: {"got": payload}}):
            self.assertEqual(jobs.run_handler("movie_import", {"value": "x"}), {"got": {"value": "x"}})

    def test_run_handler_unknown_type(self):
        with self.assertRaises(jobs.UnknownJobTypeError):
            jobs.run_handler("nope", {})

    def test_movie_import_handler_passes_site(self):
        with mock.patch.object(jobs, "build_movie_import", return_value={"ok": 1}) as builder:
            jobs.JOB_HANDLERS["movie_import"]({"value": "SSIS-456", "site": "javtiful"})
        builder.assert_called_once_with("SSIS-456", "javtiful")

    def test_actor_import_handler_passes_name(self):
        with mock.patch.object(jobs, "build_actor_import", return_value={"ok": 1}) as builder:
            jobs.JOB_HANDLERS["actor_import"]({"actor_name": "미유키", "value": "https://x"})
        builder.assert_called_once_with("미유키", "https://x")

    def test_media_localize_handler_forwards_table_and_rows(self):
        with mock.patch.object(jobs.media, "localize_remote_images", return_value=["row"]) as localize:
            jobs.JOB_HANDLERS["media_localize"]({"table": "movies", "rows": [{"id": 1}]})
        localize.assert_called_once_with("movies", [{"id": 1}])


class InlineModeTest(unittest.TestCase):
    def test_run_job_returns_inline_mode(self):
        mode, result = jobs.run_job("movie_import", lambda: 7)
        self.assertEqual(mode, jobs.INLINE)
        self.assertEqual(result, 7)

    def test_run_returns_value_only(self):
        self.assertEqual(jobs.run("movie_import", lambda x: x * 2, 4), 8)

    def test_run_job_propagates_errors(self):
        with self.assertRaises(ValueError):
            jobs.run_job("movie_import", lambda: (_ for _ in ()).throw(ValueError("boom")))


class EnqueueTest(unittest.TestCase):
    def test_rejects_unknown_job_type(self):
        with self.assertRaises(jobs.UnknownJobTypeError):
            jobs.enqueue("nope", {})

    def test_insert_sql_shape(self):
        row = {"id": 12, "job_type": "movie_import", "status": "queued"}
        with mock.patch.object(jobs, "run_sql", return_value=sql_returning([row])) as run_sql:
            job = jobs.enqueue("movie_import", {"value": "SSIS-456"}, max_attempts=5)
        sql = run_sql.call_args[0][0]
        self.assertIn("insert into public.background_jobs", sql)
        self.assertIn("'movie_import'", sql)
        self.assertIn("::jsonb", sql)
        self.assertIn("5", sql)
        self.assertEqual(job, row)

    def test_payload_quotes_are_escaped(self):
        with mock.patch.object(jobs, "run_sql", return_value=sql_returning([{"id": 1}])) as run_sql:
            jobs.enqueue("movie_import", {"value": "o'brien"})
        self.assertIn("o''brien", run_sql.call_args[0][0])

    def test_default_payload_is_empty_object(self):
        with mock.patch.object(jobs, "run_sql", return_value=sql_returning([{"id": 1}])) as run_sql:
            jobs.enqueue("media_upload")
        self.assertIn("'{}'::jsonb", run_sql.call_args[0][0])


class ClaimTest(unittest.TestCase):
    def test_claim_uses_for_update_skip_locked(self):
        with mock.patch.object(jobs, "run_sql", return_value=sql_returning([{"id": 3}])) as run_sql:
            job = jobs.claim_job("worker-1")
        sql = run_sql.call_args[0][0]
        self.assertIn("for update skip locked", sql)
        self.assertIn("limit 1", sql)
        self.assertIn("'queued'", sql)
        self.assertIn("'running'", sql)
        self.assertIn("attempts = j.attempts + 1", sql)
        self.assertIn("'worker-1'", sql)
        self.assertIn("run_after <= now()", sql)
        self.assertEqual(job, {"id": 3})

    def test_claim_returns_none_when_queue_empty(self):
        with mock.patch.object(jobs, "run_sql", return_value="[]"):
            self.assertIsNone(jobs.claim_job("worker-1"))


class CompleteAndFailTest(unittest.TestCase):
    def test_complete_sets_succeeded_and_result(self):
        with mock.patch.object(jobs, "run_sql", return_value=sql_returning([{"id": 4}])) as run_sql:
            jobs.complete_job(4, {"movie_code": "SSIS-456"})
        sql = run_sql.call_args[0][0]
        self.assertIn("'succeeded'", sql)
        self.assertIn("SSIS-456", sql)
        self.assertIn("error = null", sql)
        self.assertIn("finished_at = now()", sql)

    def test_fail_requeues_when_attempts_remain(self):
        with mock.patch.object(jobs, "run_sql", return_value=sql_returning([{"id": 5}])) as run_sql:
            jobs.fail_job(5, "HTTP Error 403", attempts=1, max_attempts=3)
        sql = run_sql.call_args[0][0]
        self.assertIn("'queued'", sql)
        self.assertIn("run_after = now() + interval '30 seconds'", sql)
        self.assertIn("HTTP Error 403", sql)
        self.assertNotIn("'failed'", sql)

    def test_fail_marks_failed_on_last_attempt(self):
        with mock.patch.object(jobs, "run_sql", return_value=sql_returning([{"id": 6}])) as run_sql:
            jobs.fail_job(6, "boom", attempts=3, max_attempts=3)
        sql = run_sql.call_args[0][0]
        self.assertIn("'failed'", sql)
        self.assertIn("finished_at = now()", sql)
        self.assertNotIn("run_after = ", sql)  # 재시도 예약 없음

    def test_retry_backoff_grows_then_caps(self):
        self.assertEqual(jobs.retry_delay_seconds(1), 30)
        self.assertEqual(jobs.retry_delay_seconds(2), 120)
        self.assertEqual(jobs.retry_delay_seconds(3), 600)
        self.assertEqual(jobs.retry_delay_seconds(99), 600)

    def test_error_message_quotes_escaped(self):
        with mock.patch.object(jobs, "run_sql", return_value=sql_returning([{"id": 7}])) as run_sql:
            jobs.fail_job(7, "it's broken", attempts=9, max_attempts=1)
        self.assertIn("it''s broken", run_sql.call_args[0][0])


class ExecuteJobTest(unittest.TestCase):
    def base_job(self, **overrides):
        job = {
            "id": 10, "job_type": "movie_import", "payload": {"value": "SSIS-456"},
            "attempts": 1, "max_attempts": 3,
        }
        job.update(overrides)
        return job

    def test_success_calls_complete(self):
        with mock.patch.dict(jobs.JOB_HANDLERS, {"movie_import": lambda payload: {"ok": True}}), \
             mock.patch.object(jobs, "complete_job", return_value={"id": 10, "status": "succeeded"}) as complete, \
             mock.patch.object(jobs, "fail_job", side_effect=AssertionError("should not fail")):
            updated = jobs.execute_job(self.base_job())
        complete.assert_called_once_with(10, {"ok": True})
        self.assertEqual(updated["status"], "succeeded")

    def test_handler_error_calls_fail_with_attempts(self):
        def boom(payload):
            raise RuntimeError("remote blocked")

        with mock.patch.dict(jobs.JOB_HANDLERS, {"movie_import": boom}), \
             mock.patch.object(jobs, "fail_job", return_value={"id": 10, "status": "queued"}) as fail:
            jobs.execute_job(self.base_job(attempts=2))
        fail.assert_called_once_with(10, "remote blocked", 2, 3)

    def test_unknown_job_type_fails_terminally(self):
        with mock.patch.object(jobs, "fail_job", return_value={"id": 10, "status": "failed"}) as fail:
            jobs.execute_job(self.base_job(job_type="ghost"))
        args = fail.call_args[0]
        self.assertEqual(args[0], 10)
        self.assertIn("unknown job type", args[1])
        self.assertEqual(args[2], args[3])  # 재시도 없이 즉시 failed

    def test_missing_payload_defaults_to_empty_dict(self):
        seen = {}
        with mock.patch.dict(jobs.JOB_HANDLERS, {"movie_import": lambda payload: seen.setdefault("p", payload)}), \
             mock.patch.object(jobs, "complete_job", return_value={}):
            jobs.execute_job(self.base_job(payload=None))
        self.assertEqual(seen["p"], {})


class ReadTest(unittest.TestCase):
    def test_get_job_rejects_non_numeric_id(self):
        with self.assertRaises(ValueError):
            jobs.get_job("abc")

    def test_get_job_returns_none_when_missing(self):
        with mock.patch.object(jobs, "run_sql", return_value="[]"):
            self.assertIsNone(jobs.get_job(999))

    def test_get_job_sql_uses_id(self):
        with mock.patch.object(jobs, "run_sql", return_value=sql_returning([{"id": 42}])) as run_sql:
            jobs.get_job("42")
        self.assertIn("where id = 42", run_sql.call_args[0][0])

    def test_list_jobs_filters_and_caps_limit(self):
        with mock.patch.object(jobs, "run_sql", return_value="[]") as run_sql:
            jobs.list_jobs(status="failed", job_type="movie_import", limit=100000)
        sql = run_sql.call_args[0][0]
        self.assertIn("status = 'failed'", sql)
        self.assertIn("job_type = 'movie_import'", sql)
        self.assertIn("limit 200", sql)

    def test_list_jobs_without_filters(self):
        with mock.patch.object(jobs, "run_sql", return_value="[]") as run_sql:
            jobs.list_jobs()
        self.assertNotIn("where", run_sql.call_args[0][0])

    def test_queue_stats_maps_status_to_count(self):
        rows = [{"status": "queued", "count": 2}, {"status": "failed", "count": 1}]
        with mock.patch.object(jobs, "run_sql", return_value=sql_returning(rows)):
            self.assertEqual(jobs.queue_stats(), {"queued": 2, "failed": 1})


class MaintenanceTest(unittest.TestCase):
    def test_recover_stale_jobs_requeues(self):
        with mock.patch.object(jobs, "run_sql", return_value=sql_returning([{"id": 1}, {"id": 2}])) as run_sql:
            recovered = jobs.recover_stale_jobs(600)
        sql = run_sql.call_args[0][0]
        self.assertIn("'queued'", sql)
        self.assertIn("interval '600 seconds'", sql)
        self.assertEqual(recovered, [1, 2])

    def test_assert_queue_available_raises_when_table_missing(self):
        with mock.patch.object(jobs, "run_sql", return_value=""):
            with self.assertRaises(RuntimeError) as ctx:
                jobs.assert_queue_available()
        self.assertIn("background_jobs", str(ctx.exception))

    def test_assert_queue_available_passes(self):
        with mock.patch.object(jobs, "run_sql", return_value="1"):
            self.assertTrue(jobs.assert_queue_available())


if __name__ == "__main__":
    unittest.main()
