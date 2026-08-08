"""HTTP Handler 계층.

URL/쿼리/JSON 파싱, 서비스 호출, 상태코드·JSON 응답, CORS, 오류 변환만 담당한다.
"""

import json
import logging
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from . import config, importers, jobs, media, queries, repository
from .database import DatabaseError
from .http_client import RemoteFetchError

logger = logging.getLogger("cinetube.handler")

HEALTH_PATHS = {"", "health"}
DB_STATS_PATHS = {"metadata/database", "database/stats"}
MOVIE_IMPORT_PATHS = {"tmdb/import", "metadata/import"}
ACTOR_IMPORT_PATHS = {"metadata/actor", "actor/import"}
WEBTOON_IMPORT_PATHS = {"metadata/webtoon", "webtoon/import"}
MEDIA_UPLOAD_PATH = "media/upload"
MEDIA_IMPORT_URL_PATH = "media/import-url"


class Handler(BaseHTTPRequestHandler):
    server_version = "CineTubeAPI/2.0"

    # --- 공통 응답 --------------------------------------------------------

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Prefer")
        super().end_headers()

    def send_json(self, value, status=200):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, exc):
        if isinstance(exc, RemoteFetchError):
            logger.warning("remote fetch failed path=%s error=%s", self.path, exc)
        elif isinstance(exc, DatabaseError):
            logger.error("database error path=%s error=%s", self.path, exc)
        body = json.dumps({"message": str(exc)}, ensure_ascii=False).encode("utf-8")
        self.send_response(500)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # --- 요청 파싱 --------------------------------------------------------

    def route(self):
        parsed = urlparse(self.path)
        return parsed.path.strip("/"), parse_qs(parsed.query)

    def parse_table(self):
        route, query = self.route()
        return repository.assert_known_table(route), query

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length == 0:
            return {}
        if length > config.MAX_REQUEST_BODY_BYTES:
            raise ValueError(
                f"요청 본문이 허용 크기({config.MAX_REQUEST_BODY_BYTES} bytes)를 초과했습니다"
            )
        return json.loads(self.rfile.read(length).decode("utf-8"))

    @staticmethod
    def import_value(query):
        value = query.get("url", [""])[0] or query.get("q", [""])[0]
        if not value:
            raise ValueError("url 또는 q 파라미터가 필요합니다")
        return value

    # --- 처리시간 로그 ----------------------------------------------------

    def _timed(self, method, handle):
        started = time.perf_counter()
        try:
            handle()
        finally:
            if config.REQUEST_TIMING_LOG:
                elapsed_ms = (time.perf_counter() - started) * 1000
                if elapsed_ms >= config.SLOW_REQUEST_MS:
                    logger.info("slow request %s %s %.1fms", method, self.path, elapsed_ms)

    # --- 메서드 ----------------------------------------------------------

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        self._timed("GET", self._handle_get)

    def _handle_get(self):
        try:
            route, query = self.route()
            if route in HEALTH_PATHS:
                self.send_json({"ok": True, "service": "cinetube-api"})
                return
            if route in DB_STATS_PATHS:
                self.send_json(repository.database_metadata())
                return
            if route in MOVIE_IMPORT_PATHS:
                value = self.import_value(query)
                site = query.get("site", ["auto"])[0]
                self.send_json(jobs.run("movie_import", importers.build_movie_import, value, site))
                return
            if route in ACTOR_IMPORT_PATHS:
                actor_name = query.get("name", [""])[0]
                value = self.import_value(query)
                self.send_json(jobs.run("actor_import", importers.build_actor_import, actor_name, value))
                return
            if route in WEBTOON_IMPORT_PATHS:
                value = self.import_value(query)
                site = query.get("site", ["auto"])[0]
                self.send_json(jobs.run("webtoon_import", importers.build_webtoon_import, value, site))
                return

            table = repository.assert_known_table(route)
            result = repository.select_rows(table, query)
            if result["count_exact"]:
                self.send_json({
                    "items": result["items"],
                    "total": result["total"],
                    "limit": result["limit"],
                    "offset": result["offset"],
                    "page": result["page"],
                })
                return
            self.send_json(result["items"])
        except Exception as exc:
            self.send_error_json(exc)

    def do_POST(self):
        self._timed("POST", self._handle_post)

    def _handle_post(self):
        try:
            route, _ = self.route()
            if route == MEDIA_UPLOAD_PATH:
                payload = self.read_json()
                self.send_json(jobs.run("media_upload", media.save_local_media, payload))
                return
            if route == MEDIA_IMPORT_URL_PATH:
                payload = self.read_json()
                self.send_json(jobs.run("media_import_url", media.import_remote_media, payload))
                return
            table = repository.assert_known_table(route)
            payload = self.read_json()
            rows = repository.insert_row_for_table(table, payload)
            self.send_json(jobs.run("media_localize", media.localize_remote_images, table, rows))
        except Exception as exc:
            self.send_error_json(exc)

    def do_PATCH(self):
        self._timed("PATCH", self._handle_patch)

    def _handle_patch(self):
        try:
            table, query = self.parse_table()
            where = queries.filter_clause(table, query)
            if not where:
                raise ValueError("missing primary key filter")
            payload = self.read_json()
            rows = repository.update_row_for_table(table, payload, where)
            self.send_json(jobs.run("media_localize", media.localize_remote_images, table, rows))
        except Exception as exc:
            self.send_error_json(exc)

    def do_DELETE(self):
        self._timed("DELETE", self._handle_delete)

    def _handle_delete(self):
        try:
            table, query = self.parse_table()
            where = queries.filter_clause(table, query)
            if not where:
                raise ValueError("missing primary key filter")
            repository.delete_row_for_table(table, where)
            self.send_response(204)
            self.end_headers()
        except Exception as exc:
            self.send_error_json(exc)


def create_server(host=None, port=None, handler_class=Handler):
    return ThreadingHTTPServer(
        (host or config.API_HOST, port or config.API_PORT),
        handler_class,
    )


def serve_forever(host=None, port=None, handler_class=Handler):
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    server = create_server(host, port, handler_class)
    logger.info("cinetube api listening on %s:%s", *server.server_address[:2])
    server.serve_forever()
