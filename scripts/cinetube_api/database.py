"""PostgreSQL 연결 풀과 SQL 실행 계층.

DB 연결 풀은 프로세스당 이 모듈에서만 생성한다.
"""

import json
import logging
import queue
import threading
import time
from functools import lru_cache

import psycopg

from . import config

logger = logging.getLogger("cinetube.database")


class DatabaseError(RuntimeError):
    """DB 연결·실행 계층에서 발생한 오류."""


class PoolTimeoutError(DatabaseError):
    """연결 풀 대여 대기 timeout."""


_POOL = queue.LifoQueue(maxsize=config.DB_POOL_MAX_SIZE)
_POOL_LOCK = threading.Lock()
_POOL_SIZE = 0


def create_connection():
    if config.ENV["DATABASE_URL"]:
        return psycopg.connect(config.ENV["DATABASE_URL"], autocommit=True)
    kwargs = {
        "host": config.ENV["PGHOST"],
        "port": config.ENV["PGPORT"],
        "user": config.ENV["PGUSER"],
        "dbname": config.ENV["PGDATABASE"],
        "autocommit": True,
    }
    if config.ENV["PGPASSWORD"]:
        kwargs["password"] = config.ENV["PGPASSWORD"]
    if config.ENV["PGSSLMODE"]:
        kwargs["sslmode"] = config.ENV["PGSSLMODE"]
    return psycopg.connect(**kwargs)


def acquire_connection():
    """풀에서 연결을 대여한다. 대기 timeout을 초과하면 PoolTimeoutError."""
    global _POOL_SIZE
    try:
        return _POOL.get_nowait()
    except queue.Empty:
        pass
    with _POOL_LOCK:
        if _POOL_SIZE < config.DB_POOL_MAX_SIZE:
            _POOL_SIZE += 1
            created = False
            try:
                conn = create_connection()
                created = True
                return conn
            finally:
                if not created:
                    _POOL_SIZE -= 1
    try:
        return _POOL.get(timeout=config.DB_POOL_WAIT_TIMEOUT)
    except queue.Empty:
        raise PoolTimeoutError(
            f"DB 연결 풀 대기 시간을 초과했습니다 (max={config.DB_POOL_MAX_SIZE}, "
            f"wait={config.DB_POOL_WAIT_TIMEOUT}s)"
        ) from None


def release_connection(conn):
    global _POOL_SIZE
    if conn is None or conn.closed:
        return
    try:
        _POOL.put_nowait(conn)
    except queue.Full:
        conn.close()
        with _POOL_LOCK:
            _POOL_SIZE = max(0, _POOL_SIZE - 1)


def discard_connection(conn):
    """손상된 연결을 폐기하고 풀 카운터를 되돌린다."""
    global _POOL_SIZE
    if conn is not None:
        try:
            conn.close()
        except Exception:
            pass
    with _POOL_LOCK:
        _POOL_SIZE = max(0, _POOL_SIZE - 1)


def reset_pool():
    """유휴 연결을 모두 닫고 풀 카운터를 초기화한다."""
    global _POOL_SIZE
    while True:
        try:
            conn = _POOL.get_nowait()
        except queue.Empty:
            break
        try:
            conn.close()
        except Exception:
            pass
    with _POOL_LOCK:
        _POOL_SIZE = 0


def pool_status():
    return {
        "max_size": config.DB_POOL_MAX_SIZE,
        "created": _POOL_SIZE,
        "idle": _POOL.qsize(),
        "wait_timeout": config.DB_POOL_WAIT_TIMEOUT,
    }


def sql_literal(value):
    if value is None:
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def json_literal(value):
    return sql_literal(json.dumps(value, ensure_ascii=False))


def format_sql_value(value):
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def run_sql(sql):
    """SQL 한 건을 실행하고 결과를 탭 구분 텍스트로 반환한다."""
    started = time.perf_counter()
    conn = acquire_connection()
    broken = False
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            if cur.description is None:
                output = ""
            else:
                rows = cur.fetchall()
                output = "\n".join(
                    "\t".join(format_sql_value(value) for value in row)
                    for row in rows
                ).strip()
    except Exception:
        broken = True
        discard_connection(conn)
        raise
    finally:
        if not broken:
            release_connection(conn)
        elapsed_ms = (time.perf_counter() - started) * 1000
        if config.REQUEST_TIMING_LOG and elapsed_ms >= config.SLOW_REQUEST_MS:
            logger.warning("slow sql %.1fms %s", elapsed_ms, sql[:180].replace("\n", " "))
    return output


@lru_cache(maxsize=None)
def table_columns(table):
    output = run_sql(
        "select column_name "
        "from information_schema.columns "
        f"where table_schema = 'public' and table_name = {sql_literal(table)};"
    )
    return {line.strip() for line in output.splitlines() if line.strip()}


def existing_columns(table, names):
    columns = table_columns(table)
    return [name for name in names if name in columns]


def clear_column_cache():
    table_columns.cache_clear()
