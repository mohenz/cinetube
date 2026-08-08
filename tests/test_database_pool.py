"""DB 연결 풀 동작 단위테스트 (실제 PostgreSQL 미사용)."""

import threading
import unittest
from unittest import mock

from cinetube_api import config, database


class FakeCursor:
    def __init__(self, conn):
        self.conn = conn
        self.description = None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql):
        self.conn.executed.append(sql)
        if self.conn.fail:
            raise RuntimeError("server closed the connection unexpectedly")
        self.description = [("value",)]

    def fetchall(self):
        return [(self.conn.result,)]


class FakeConnection:
    def __init__(self, result="1", fail=False):
        self.closed = False
        self.fail = fail
        self.result = result
        self.executed = []

    def cursor(self):
        return FakeCursor(self)

    def close(self):
        self.closed = True


class PoolTestCase(unittest.TestCase):
    def setUp(self):
        database.reset_pool()
        database.clear_column_cache()
        self.addCleanup(database.reset_pool)
        self.addCleanup(database.clear_column_cache)


class PoolReuseTest(PoolTestCase):
    def test_connection_is_reused(self):
        created = []

        def factory():
            conn = FakeConnection()
            created.append(conn)
            return conn

        with mock.patch.object(database, "create_connection", side_effect=factory):
            database.run_sql("select 1;")
            database.run_sql("select 2;")

        self.assertEqual(len(created), 1)
        self.assertEqual(created[0].executed, ["select 1;", "select 2;"])
        self.assertEqual(database.pool_status()["idle"], 1)

    def test_run_sql_formats_rows_as_tab_separated_text(self):
        with mock.patch.object(database, "create_connection", side_effect=lambda: FakeConnection(result="abc")):
            self.assertEqual(database.run_sql("select 'abc';"), "abc")

    def test_broken_connection_is_discarded_and_pool_recovers(self):
        conns = [FakeConnection(fail=True), FakeConnection()]

        with mock.patch.object(database, "create_connection", side_effect=lambda: conns.pop(0)):
            with self.assertRaises(RuntimeError):
                database.run_sql("select 1;")
            self.assertEqual(database.pool_status()["created"], 0)
            self.assertEqual(database.pool_status()["idle"], 0)

            self.assertEqual(database.run_sql("select 2;"), "1")

        self.assertEqual(database.pool_status()["created"], 1)
        self.assertEqual(database.pool_status()["idle"], 1)

    def test_pool_exhaustion_times_out_instead_of_blocking_forever(self):
        with mock.patch.object(config, "DB_POOL_MAX_SIZE", 1), \
             mock.patch.object(config, "DB_POOL_WAIT_TIMEOUT", 0.2), \
             mock.patch.object(database, "create_connection", side_effect=FakeConnection):
            held = database.acquire_connection()
            try:
                with self.assertRaises(database.PoolTimeoutError):
                    database.acquire_connection()
            finally:
                database.release_connection(held)

    def test_waiting_thread_gets_released_connection(self):
        with mock.patch.object(config, "DB_POOL_MAX_SIZE", 1), \
             mock.patch.object(config, "DB_POOL_WAIT_TIMEOUT", 2.0), \
             mock.patch.object(database, "create_connection", side_effect=FakeConnection):
            held = database.acquire_connection()
            result = {}

            def waiter():
                try:
                    result["conn"] = database.acquire_connection()
                except Exception as exc:  # pragma: no cover - 실패 시 진단용
                    result["error"] = exc

            thread = threading.Thread(target=waiter)
            thread.start()
            database.release_connection(held)
            thread.join(timeout=3)

        self.assertNotIn("error", result)
        self.assertIs(result["conn"], held)

    def test_concurrent_queries_do_not_exceed_pool_size(self):
        peak = {"value": 0, "current": 0}
        lock = threading.Lock()

        class TrackingConnection(FakeConnection):
            def cursor(self):
                with lock:
                    peak["current"] += 1
                    peak["value"] = max(peak["value"], peak["current"])
                cursor = FakeCursor(self)
                original_execute = cursor.execute

                def execute(sql):
                    original_execute(sql)
                    with lock:
                        peak["current"] -= 1

                cursor.execute = execute
                return cursor

        with mock.patch.object(config, "DB_POOL_MAX_SIZE", 3), \
             mock.patch.object(database, "create_connection", side_effect=TrackingConnection):
            threads = [threading.Thread(target=database.run_sql, args=("select 1;",)) for _ in range(12)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=10)

        self.assertLessEqual(database.pool_status()["created"], 3)
        self.assertLessEqual(peak["value"], 3)


class SqlLiteralTest(unittest.TestCase):
    def test_none_is_null(self):
        self.assertEqual(database.sql_literal(None), "null")

    def test_escapes_single_quote(self):
        self.assertEqual(database.sql_literal("o'brien"), "'o''brien'")

    def test_json_literal(self):
        self.assertEqual(database.json_literal({"a": "b'c"}), """'{"a": "b''c"}'""")

    def test_format_sql_value(self):
        self.assertEqual(database.format_sql_value(None), "")
        self.assertEqual(database.format_sql_value(["a"]), '["a"]')
        self.assertEqual(database.format_sql_value(3), "3")


class TableColumnsCacheTest(PoolTestCase):
    def test_columns_are_cached_per_table(self):
        conn = FakeConnection(result="id")
        with mock.patch.object(database, "create_connection", return_value=conn):
            first = database.table_columns("movies")
            second = database.table_columns("movies")
        self.assertEqual(first, {"id"})
        self.assertIs(first, second)
        self.assertEqual(len(conn.executed), 1)

    def test_existing_columns_filters_unknown(self):
        with mock.patch.object(database, "table_columns", return_value={"id", "title"}):
            self.assertEqual(database.existing_columns("movies", ["title", "nope", "id"]), ["title", "id"])


if __name__ == "__main__":
    unittest.main()
