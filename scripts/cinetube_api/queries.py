"""읽기 요청 쿼리스트링을 SQL 조각으로 변환하는 계층.

필터·검색·정렬·페이지네이션·건수 조회와 JSON <-> PostgreSQL 레코드 변환을 담당한다.
"""

import json

from . import tables
from .database import json_literal, run_sql, sql_literal, table_columns


def filter_clause(table, query):
    """기본키 eq. 필터만 허용한다 (PATCH/DELETE 대상 지정용)."""
    meta = tables.TABLES[table]
    pk = meta["pk"]
    raw = query.get(pk, [""])[0]
    if not raw.startswith("eq."):
        return None
    return f"{pk} = {sql_literal(raw[3:])}"


def read_filter_clauses(table, query):
    columns = table_columns(table)
    clauses = []
    for key, values in query.items():
        if key in tables.READ_CONTROL_PARAMS or key not in columns:
            continue
        raw = values[0] if values else ""
        if raw.startswith("eq."):
            clauses.append(f"{key} = {sql_literal(raw[3:])}")
    return clauses


def search_clause(table, query):
    term = (query.get("search", [""])[0] or "").strip()
    if not term:
        return None
    columns = table_columns(table)
    search_columns = [name for name in tables.SEARCH_COLUMNS.get(table, []) if name in columns]
    if not search_columns:
        return None
    pattern = sql_literal(f"%{term}%")
    parts = [f"coalesce({name}::text, '') ilike {pattern}" for name in search_columns]
    return "(" + " or ".join(parts) + ")"


def where_clause(table, query):
    clauses = read_filter_clauses(table, query)
    search = search_clause(table, query)
    if search:
        clauses.append(search)
    return f" where {' and '.join(clauses)}" if clauses else ""


def positive_int(value, default=0, maximum=None):
    try:
        number = int(value)
    except Exception:
        return default
    if number < 0:
        return default
    if maximum is not None:
        return min(number, maximum)
    return number


def pagination_clause(query):
    raw_page_size = query.get("page_size", query.get("limit", [""]))[0]
    if str(raw_page_size).lower() == "all":
        return "", 0, 0, 1
    limit = positive_int(raw_page_size, 0, tables.MAX_PAGE_SIZE)
    raw_page = query.get("page", [""])[0]
    page = max(1, positive_int(raw_page, 1))
    if "offset" in query:
        offset = positive_int(query.get("offset", ["0"])[0], 0)
    elif limit:
        offset = (page - 1) * limit
    else:
        offset = 0
    if not limit:
        return "", 0, offset, page
    return f" limit {limit} offset {offset}", limit, offset, page


def select_clause(table, query):
    raw = query.get("select", ["*"])[0]
    if raw == "*":
        return "*"
    columns = table_columns(table)
    selected = []
    for name in raw.split(","):
        name = name.strip()
        if not name:
            continue
        if name not in columns:
            continue
        selected.append(name)
    if not selected:
        return "*"
    return ", ".join(selected)


def order_clause(table, query):
    order = query.get("order", [tables.DEFAULT_ORDER])[0]
    column, _, direction = order.partition(".")
    direction = "asc" if direction.lower() == "asc" else "desc"
    if not column.replace("_", "").isalnum():
        raise ValueError(f"invalid order column: {column}")
    if column not in table_columns(table):
        raise ValueError(f"invalid order column: {column}")
    return f" order by {column} {direction}"


def total_count(table, where_sql):
    output = run_sql(f"select count(*) from public.{table}{where_sql};")
    return int(output or "0")


def row_json(sql, mutable=False):
    """SELECT/INSERT/UPDATE 결과를 dict 리스트로 반환한다."""
    inner_sql = sql.strip().rstrip(";")
    statement = inner_sql.lower()
    if mutable or statement.startswith(("insert ", "update ", "delete ")):
        output = run_sql(f"with q as ({inner_sql}) select coalesce(json_agg(row_to_json(q)), '[]'::json) from q;")
    else:
        output = run_sql(f"select coalesce(json_agg(row_to_json(q)), '[]'::json) from ({inner_sql}) q;")
    return json.loads(output or "[]")


def record_columns_sql(table, columns, payload):
    """json_populate_record 기반 컬럼 값 목록을 만든다."""
    literal = json_literal(payload)
    return [
        f"(json_populate_record(null::public.{table}, {literal}::json)).{column}"
        for column in columns
    ]
