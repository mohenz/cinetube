"""HTTP API 계약 통합테스트.

실제 서버를 임시 포트로 띄우고 repository/media/importers 계층만 대체해
URL, 상태코드, JSON 응답 형식, CORS 헤더가 기존 계약과 같은지 확인한다.
운영 DB와 local/media 파일은 사용하지 않는다.
"""

import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from unittest import mock
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from cinetube_api import handler as handler_module
from cinetube_api.handler import Handler


class QuietHandler(Handler):
    def log_message(self, *args):
        pass


class ApiServerTestCase(unittest.TestCase):
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

    def request(self, path, method="GET", payload=None):
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = Request(self.base + path, data=data, method=method)
        if data:
            req.add_header("Content-Type", "application/json")
        try:
            with urlopen(req, timeout=10) as response:
                body = response.read().decode("utf-8")
                return response.status, dict(response.headers), body
        except HTTPError as error:
            return error.code, dict(error.headers), error.read().decode("utf-8")


class HealthAndCorsTest(ApiServerTestCase):
    def test_health(self):
        status, headers, body = self.request("/health")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"ok": True, "service": "cinetube-api"})
        self.assertEqual(headers["Content-Type"], "application/json; charset=utf-8")

    def test_root_is_health(self):
        status, _, body = self.request("/")
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(body)["ok"])

    def test_cors_headers_present(self):
        _, headers, _ = self.request("/health")
        self.assertEqual(headers["Access-Control-Allow-Origin"], "*")
        self.assertIn("PATCH", headers["Access-Control-Allow-Methods"])
        self.assertIn("Prefer", headers["Access-Control-Allow-Headers"])

    def test_options_preflight(self):
        status, headers, _ = self.request("/movies", method="OPTIONS")
        self.assertEqual(status, 204)
        self.assertEqual(headers["Access-Control-Allow-Origin"], "*")


class DatabaseStatsTest(ApiServerTestCase):
    def test_metadata_database(self):
        stats = {"database_name": "cinetube", "size_bytes": 123, "size_pretty": "123 bytes"}
        with mock.patch.object(handler_module.repository, "database_metadata", return_value=stats):
            status, _, body = self.request("/metadata/database")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), stats)

    def test_database_stats_alias(self):
        with mock.patch.object(handler_module.repository, "database_metadata", return_value={"a": 1}):
            status, _, body = self.request("/database/stats")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"a": 1})


class ReadTest(ApiServerTestCase):
    rows = [{"id": 1, "title": "A"}, {"id": 2, "title": "B"}]

    def select_result(self, count_exact=False):
        return {
            "items": self.rows,
            "total": 42 if count_exact else None,
            "limit": 20,
            "offset": 0,
            "page": 1,
            "count_exact": count_exact,
        }

    def test_plain_list_returns_array(self):
        with mock.patch.object(handler_module.repository, "select_rows", return_value=self.select_result()):
            status, _, body = self.request("/movies?order=created_at.desc")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), self.rows)

    def test_count_exact_returns_envelope(self):
        with mock.patch.object(handler_module.repository, "select_rows", return_value=self.select_result(True)):
            status, _, body = self.request("/movies?count=exact&page_size=20")
        payload = json.loads(body)
        self.assertEqual(status, 200)
        self.assertEqual(payload["items"], self.rows)
        self.assertEqual(payload["total"], 42)
        self.assertEqual(payload["limit"], 20)
        self.assertEqual(payload["offset"], 0)
        self.assertEqual(payload["page"], 1)

    def test_query_is_forwarded_to_repository(self):
        with mock.patch.object(
            handler_module.repository, "select_rows", return_value=self.select_result()
        ) as select_rows:
            self.request("/movies?category_code=eq.action&search=hero&page=2")
        table, query = select_rows.call_args[0]
        self.assertEqual(table, "movies")
        self.assertEqual(query["category_code"], ["eq.action"])
        self.assertEqual(query["search"], ["hero"])
        self.assertEqual(query["page"], ["2"])

    def test_unknown_table_returns_error_json(self):
        status, _, body = self.request("/not_a_table")
        self.assertEqual(status, 500)
        self.assertEqual(json.loads(body), {"message": "unknown table"})

    def test_repository_error_is_json(self):
        with mock.patch.object(
            handler_module.repository, "select_rows", side_effect=ValueError("invalid order column: nope")
        ):
            status, _, body = self.request("/movies?order=nope.asc")
        self.assertEqual(status, 500)
        self.assertIn("invalid order column", json.loads(body)["message"])


class ImportTest(ApiServerTestCase):
    def test_movie_import(self):
        with mock.patch.object(
            handler_module.importers, "build_movie_import", return_value={"movie_code": "SSIS-456"}
        ) as builder:
            status, _, body = self.request("/metadata/import?url=https://javtiful.com/v/x&site=javtiful")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["movie_code"], "SSIS-456")
        builder.assert_called_once_with("https://javtiful.com/v/x", "javtiful")

    def test_movie_import_legacy_path(self):
        with mock.patch.object(handler_module.importers, "build_movie_import", return_value={"ok": 1}):
            status, _, _ = self.request("/tmdb/import?q=SSIS-456")
        self.assertEqual(status, 200)

    def test_movie_import_requires_value(self):
        status, _, body = self.request("/metadata/import")
        self.assertEqual(status, 500)
        self.assertIn("url 또는 q", json.loads(body)["message"])

    def test_actor_import(self):
        with mock.patch.object(
            handler_module.importers, "build_actor_import", return_value={"name": "미유키"}
        ) as builder:
            status, _, body = self.request(
                "/metadata/actor?" + urlencode({"name": "미유키", "url": "https://www.avdbs.com/x"})
            )
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["name"], "미유키")
        builder.assert_called_once_with("미유키", "https://www.avdbs.com/x")

    def test_webtoon_import(self):
        with mock.patch.object(
            handler_module.importers, "build_webtoon_import", return_value={"site": "mangadna"}
        ) as builder:
            status, _, body = self.request("/webtoon/import?url=https://mangadna.com/manga/x")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["site"], "mangadna")
        builder.assert_called_once_with("https://mangadna.com/manga/x", "auto")

    def test_remote_failure_returns_error_json(self):
        from cinetube_api.http_client import RemoteFetchError

        with mock.patch.object(
            handler_module.importers, "build_webtoon_import",
            side_effect=RemoteFetchError("HTTP Error 403: Forbidden", "https://x"),
        ):
            status, _, body = self.request("/webtoon/import?url=https://mangadna.com/manga/x")
        self.assertEqual(status, 500)
        self.assertIn("403", json.loads(body)["message"])


class WriteTest(ApiServerTestCase):
    def test_insert_calls_repository_then_localizes(self):
        inserted = [{"id": 5, "title": "New"}]
        with mock.patch.object(
            handler_module.repository, "insert_row_for_table", return_value=inserted
        ) as insert, mock.patch.object(
            handler_module.media, "localize_remote_images", side_effect=lambda table, rows: rows
        ) as localize:
            status, _, body = self.request("/movies", "POST", {"title": "New"})
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), inserted)
        insert.assert_called_once_with("movies", {"title": "New"})
        localize.assert_called_once_with("movies", inserted)

    def test_update_requires_pk_filter(self):
        status, _, body = self.request("/movies", "PATCH", {"title": "x"})
        self.assertEqual(status, 500)
        self.assertEqual(json.loads(body)["message"], "missing primary key filter")

    def test_update_with_pk_filter(self):
        updated = [{"id": 5, "title": "Changed"}]
        with mock.patch.object(
            handler_module.repository, "update_row_for_table", return_value=updated
        ) as update, mock.patch.object(
            handler_module.media, "localize_remote_images", side_effect=lambda table, rows: rows
        ):
            status, _, body = self.request("/movies?id=eq.5", "PATCH", {"title": "Changed"})
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), updated)
        self.assertEqual(update.call_args[0][2], "id = '5'")

    def test_delete_requires_pk_filter(self):
        status, _, body = self.request("/movies", "DELETE")
        self.assertEqual(status, 500)
        self.assertEqual(json.loads(body)["message"], "missing primary key filter")

    def test_delete_returns_204(self):
        with mock.patch.object(handler_module.repository, "delete_row_for_table") as delete:
            status, _, body = self.request("/movies?id=eq.5", "DELETE")
        self.assertEqual(status, 204)
        self.assertEqual(body, "")
        delete.assert_called_once_with("movies", "id = '5'")

    def test_media_upload_route(self):
        with mock.patch.object(
            handler_module.media, "save_local_media", return_value=[{"id": "asset-1"}]
        ) as save:
            status, _, body = self.request("/media/upload", "POST", {"data_url": "data:image/png;base64,AA=="})
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)[0]["id"], "asset-1")
        save.assert_called_once()

    def test_media_import_url_route(self):
        with mock.patch.object(
            handler_module.media, "import_remote_media", return_value=[{"id": "asset-2"}]
        ) as importer:
            status, _, body = self.request("/media/import-url", "POST", {"url": "https://cdn.example/a.png"})
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)[0]["id"], "asset-2")
        importer.assert_called_once()

    def test_insert_into_unknown_table(self):
        status, _, body = self.request("/nope", "POST", {"a": 1})
        self.assertEqual(status, 500)
        self.assertEqual(json.loads(body)["message"], "unknown table")


class AllTablesReachableTest(ApiServerTestCase):
    def test_every_whitelisted_table_is_routable(self):
        from cinetube_api.tables import TABLES

        empty = {"items": [], "total": None, "limit": 0, "offset": 0, "page": 1, "count_exact": False}
        with mock.patch.object(handler_module.repository, "select_rows", return_value=empty):
            for table in TABLES:
                status, _, body = self.request(f"/{table}")
                self.assertEqual(status, 200, table)
                self.assertEqual(json.loads(body), [], table)


if __name__ == "__main__":
    unittest.main()
