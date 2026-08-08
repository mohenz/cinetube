"""동시 처리 검증.

외부 가져오기(느린 외부 사이트)가 진행되는 동안에도 일반 조회 API가
정상 응답하는지, 연결 풀이 고갈·교착되지 않는지 확인한다.
운영 DB 데이터는 사용하지 않는다.
"""

import json
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from http.server import ThreadingHTTPServer
from unittest import mock
from urllib.request import urlopen

from cinetube_api import config, database
from cinetube_api import handler as handler_module
from cinetube_api.handler import Handler

from .test_database_pool import FakeConnection

EMPTY_RESULT = {"items": [], "total": None, "limit": 0, "offset": 0, "page": 1, "count_exact": False}


class QuietHandler(Handler):
    def log_message(self, *args):
        pass


class ConcurrencyTest(unittest.TestCase):
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

    def get(self, path, timeout=20):
        with urlopen(self.base + path, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8")

    def test_parallel_list_requests_all_succeed(self):
        rows = [{"id": index} for index in range(5)]
        result = {**EMPTY_RESULT, "items": rows}
        with mock.patch.object(handler_module.repository, "select_rows", return_value=result):
            with ThreadPoolExecutor(max_workers=16) as pool:
                responses = list(pool.map(lambda _: self.get("/movies"), range(32)))
        self.assertTrue(all(status == 200 for status, _ in responses))
        self.assertTrue(all(json.loads(body) == rows for _, body in responses))

    def test_list_stays_responsive_during_slow_import(self):
        def slow_import(value, site):
            time.sleep(1.5)
            return {"movie_code": "SLOW"}

        with mock.patch.object(handler_module.importers, "build_movie_import", side_effect=slow_import), \
             mock.patch.object(handler_module.repository, "select_rows", return_value=EMPTY_RESULT):
            with ThreadPoolExecutor(max_workers=8) as pool:
                imports = [pool.submit(self.get, "/metadata/import?q=SSIS-456") for _ in range(3)]
                time.sleep(0.2)
                started = time.perf_counter()
                reads = [pool.submit(self.get, "/movies") for _ in range(10)]
                read_results = [future.result(timeout=20) for future in reads]
                read_elapsed = time.perf_counter() - started
                import_results = [future.result(timeout=20) for future in imports]

        self.assertTrue(all(status == 200 for status, _ in read_results))
        self.assertTrue(all(json.loads(body)["movie_code"] == "SLOW" for _, body in import_results))
        # 조회 요청이 외부 가져오기 완료(1.5초)를 기다리지 않아야 한다.
        self.assertLess(read_elapsed, 1.2)

    def test_mixed_read_and_write_requests(self):
        with mock.patch.object(handler_module.repository, "select_rows", return_value=EMPTY_RESULT), \
             mock.patch.object(handler_module.repository, "delete_row_for_table"):
            def call(index):
                if index % 3 == 0:
                    return self.get("/movies?id=eq.1")
                if index % 3 == 1:
                    return self.get("/gallery_images?count=exact")
                return self.get("/health")

            with ThreadPoolExecutor(max_workers=12) as pool:
                responses = list(pool.map(call, range(30)))
        self.assertTrue(all(status == 200 for status, _ in responses))


class PoolUnderLoadTest(unittest.TestCase):
    def setUp(self):
        database.reset_pool()
        database.clear_column_cache()
        self.addCleanup(database.reset_pool)
        self.addCleanup(database.clear_column_cache)

    def test_pool_recovers_after_errors_under_concurrency(self):
        counter = {"value": 0}
        lock = threading.Lock()

        def factory():
            with lock:
                counter["value"] += 1
                index = counter["value"]
            return FakeConnection(fail=(index % 4 == 0))

        with mock.patch.object(config, "DB_POOL_MAX_SIZE", 4), \
             mock.patch.object(config, "DB_POOL_WAIT_TIMEOUT", 5.0), \
             mock.patch.object(database, "create_connection", side_effect=factory):
            def run(_):
                try:
                    database.run_sql("select 1;")
                    return "ok"
                except RuntimeError:
                    return "error"

            with ThreadPoolExecutor(max_workers=8) as pool:
                outcomes = list(pool.map(run, range(40)))

            status = database.pool_status()
            self.assertLessEqual(status["created"], 4)
            self.assertEqual(status["created"], status["idle"])
            # 오류가 발생한 뒤에도 새 요청이 정상 처리되어야 한다.
            self.assertEqual(database.run_sql("select 2;"), "1")

        self.assertIn("ok", outcomes)


if __name__ == "__main__":
    unittest.main()
