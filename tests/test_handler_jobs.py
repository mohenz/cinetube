"""비동기 실행 옵트인과 작업 상태 API의 HTTP 계약 테스트.

기존 동기 응답 계약이 그대로 유지되는지도 함께 확인한다.
"""

import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from unittest import mock
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from cinetube_api import handler as handler_module
from cinetube_api.handler import Handler

QUEUED_JOB = {
    "id": 77,
    "job_type": "movie_import",
    "status": "queued",
    "payload": {"value": "SSIS-456", "site": "auto"},
    "result": None,
    "error": None,
    "attempts": 0,
    "max_attempts": 3,
}


class QuietHandler(Handler):
    def log_message(self, *args):
        pass


class JobApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
        cls.base = "http://127.0.0.1:%d" % cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def request(self, path, method="GET", payload=None, headers=None):
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = Request(self.base + path, data=data, method=method)
        if data:
            req.add_header("Content-Type", "application/json")
        for key, value in (headers or {}).items():
            req.add_header(key, value)
        try:
            with urlopen(req, timeout=10) as response:
                body = response.read().decode("utf-8")
                return response.status, json.loads(body) if body else None
        except HTTPError as error:
            body = error.read().decode("utf-8")
            return error.code, json.loads(body) if body else None


class SyncContractUnchangedTest(JobApiTestCase):
    def test_import_without_async_stays_synchronous(self):
        with mock.patch.object(
            handler_module.importers, "build_movie_import", return_value={"movie_code": "SSIS-456"}
        ), mock.patch.object(handler_module.jobs, "enqueue", side_effect=AssertionError("must not enqueue")):
            status, body = self.request("/metadata/import?q=SSIS-456")
        self.assertEqual(status, 200)
        self.assertEqual(body["movie_code"], "SSIS-456")

    def test_media_upload_without_async_stays_synchronous(self):
        with mock.patch.object(
            handler_module.media, "save_local_media", return_value=[{"id": "asset-1"}]
        ), mock.patch.object(handler_module.jobs, "enqueue", side_effect=AssertionError("must not enqueue")):
            status, body = self.request("/media/upload", "POST", {"data_url": "data:image/png;base64,AA=="})
        self.assertEqual(status, 200)
        self.assertEqual(body[0]["id"], "asset-1")

    def test_async_false_is_synchronous(self):
        with mock.patch.object(
            handler_module.importers, "build_movie_import", return_value={"movie_code": "X"}
        ), mock.patch.object(handler_module.jobs, "enqueue", side_effect=AssertionError("must not enqueue")):
            status, body = self.request("/metadata/import?q=SSIS-456&async=0")
        self.assertEqual(status, 200)
        self.assertEqual(body["movie_code"], "X")


class AsyncOptInTest(JobApiTestCase):
    def test_movie_import_async_returns_202(self):
        with mock.patch.object(handler_module.jobs, "enqueue", return_value=QUEUED_JOB) as enqueue, \
             mock.patch.object(handler_module.importers, "build_movie_import",
                               side_effect=AssertionError("must not run inline")):
            status, body = self.request("/metadata/import?q=SSIS-456&site=javtiful&async=1")
        self.assertEqual(status, 202)
        self.assertEqual(body, {
            "job_id": 77,
            "job_type": "movie_import",
            "status": "queued",
            "status_url": "/jobs/77",
        })
        enqueue.assert_called_once_with("movie_import", {"value": "SSIS-456", "site": "javtiful"})

    def test_prefer_respond_async_header(self):
        with mock.patch.object(handler_module.jobs, "enqueue", return_value=QUEUED_JOB), \
             mock.patch.object(handler_module.importers, "build_movie_import",
                               side_effect=AssertionError("must not run inline")):
            status, body = self.request("/metadata/import?q=SSIS-456", headers={"Prefer": "respond-async"})
        self.assertEqual(status, 202)
        self.assertEqual(body["job_id"], 77)

    def test_actor_import_async(self):
        job = {**QUEUED_JOB, "job_type": "actor_import"}
        with mock.patch.object(handler_module.jobs, "enqueue", return_value=job) as enqueue:
            status, _ = self.request("/metadata/actor?url=https://www.avdbs.com/x&async=true")
        self.assertEqual(status, 202)
        enqueue.assert_called_once_with(
            "actor_import", {"actor_name": "", "value": "https://www.avdbs.com/x"}
        )

    def test_webtoon_import_async(self):
        job = {**QUEUED_JOB, "job_type": "webtoon_import"}
        with mock.patch.object(handler_module.jobs, "enqueue", return_value=job) as enqueue:
            status, _ = self.request("/webtoon/import?url=https://mangadna.com/manga/x&async=yes")
        self.assertEqual(status, 202)
        enqueue.assert_called_once_with(
            "webtoon_import", {"value": "https://mangadna.com/manga/x", "site": "auto"}
        )

    def test_media_import_url_async(self):
        job = {**QUEUED_JOB, "job_type": "media_import_url"}
        payload = {"url": "https://cdn.example/a.png", "owner_table": "movies"}
        with mock.patch.object(handler_module.jobs, "enqueue", return_value=job) as enqueue, \
             mock.patch.object(handler_module.media, "import_remote_media",
                               side_effect=AssertionError("must not run inline")):
            status, _ = self.request("/media/import-url?async=1", "POST", payload)
        self.assertEqual(status, 202)
        enqueue.assert_called_once_with("media_import_url", payload)

    def test_media_upload_async(self):
        job = {**QUEUED_JOB, "job_type": "media_upload"}
        with mock.patch.object(handler_module.jobs, "enqueue", return_value=job) as enqueue:
            status, _ = self.request("/media/upload?async=1", "POST", {"data_url": "data:image/png;base64,AA=="})
        self.assertEqual(status, 202)
        self.assertEqual(enqueue.call_args[0][0], "media_upload")

    def test_async_import_still_requires_url(self):
        status, body = self.request("/metadata/import?async=1")
        self.assertEqual(status, 500)
        self.assertIn("url 또는 q", body["message"])


class JobStatusApiTest(JobApiTestCase):
    def test_get_job_by_id(self):
        finished = {**QUEUED_JOB, "status": "succeeded", "result": {"movie_code": "SSIS-456"}}
        with mock.patch.object(handler_module.jobs, "get_job", return_value=finished) as get_job:
            status, body = self.request("/jobs/77")
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "succeeded")
        self.assertEqual(body["result"]["movie_code"], "SSIS-456")
        get_job.assert_called_once_with("77")

    def test_missing_job_returns_404(self):
        with mock.patch.object(handler_module.jobs, "get_job", return_value=None):
            status, body = self.request("/jobs/999999")
        self.assertEqual(status, 404)
        self.assertEqual(body["message"], "job not found")

    def test_invalid_job_id_returns_error_json(self):
        with mock.patch.object(handler_module.jobs, "get_job", side_effect=ValueError("invalid job id")):
            status, body = self.request("/jobs/abc")
        self.assertEqual(status, 500)
        self.assertEqual(body["message"], "invalid job id")

    def test_list_jobs(self):
        with mock.patch.object(handler_module.jobs, "list_jobs", return_value=[QUEUED_JOB]) as list_jobs:
            status, body = self.request("/jobs?status=queued&job_type=movie_import&limit=10")
        self.assertEqual(status, 200)
        self.assertEqual(len(body), 1)
        list_jobs.assert_called_once_with(status="queued", job_type="movie_import", limit="10")

    def test_list_jobs_without_filters(self):
        with mock.patch.object(handler_module.jobs, "list_jobs", return_value=[]) as list_jobs:
            status, body = self.request("/jobs")
        self.assertEqual(status, 200)
        self.assertEqual(body, [])
        list_jobs.assert_called_once_with(status=None, job_type=None, limit="50")

    def test_queue_stats(self):
        with mock.patch.object(handler_module.jobs, "queue_stats", return_value={"queued": 3}):
            status, body = self.request("/jobs/stats")
        self.assertEqual(status, 200)
        self.assertEqual(body, {"queued": 3})

    def test_jobs_route_has_cors(self):
        with mock.patch.object(handler_module.jobs, "list_jobs", return_value=[]):
            req = Request(self.base + "/jobs")
            with urlopen(req, timeout=10) as response:
                self.assertEqual(response.headers["Access-Control-Allow-Origin"], "*")


if __name__ == "__main__":
    unittest.main()
