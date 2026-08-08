"""테이블 CRUD와 DB 통계 저장소 계층.

테이블·컬럼 화이트리스트를 적용하며 미디어·외부 파서 모듈을 참조하지 않는다.
"""

from . import config, queries, tables
from .database import existing_columns, run_sql, sql_literal


def assert_known_table(table):
    if table not in tables.TABLES:
        raise ValueError("unknown table")
    return table


def primary_key(table):
    return tables.TABLES[assert_known_table(table)]["pk"]


def select_rows(table, query):
    """목록 조회. count=exact 인 경우 total을 함께 계산한다."""
    assert_known_table(table)
    select_sql = queries.select_clause(table, query)
    where_sql = queries.where_clause(table, query)
    order_sql = queries.order_clause(table, query)
    page_sql, limit, offset, page = queries.pagination_clause(query)
    rows = queries.row_json(
        f"select {select_sql} from public.{table}{where_sql}{order_sql}{page_sql}"
    )
    count_exact = query.get("count", [""])[0] == "exact"
    return {
        "items": rows,
        "total": queries.total_count(table, where_sql) if count_exact else None,
        "limit": limit,
        "offset": offset,
        "page": page,
        "count_exact": count_exact,
    }


def insert_row_for_table(table, payload):
    assert_known_table(table)
    columns = existing_columns(table, [c for c in tables.TABLES[table]["insert"] if c in payload])
    if not columns:
        raise ValueError("empty insert payload")
    values = queries.record_columns_sql(table, columns, payload)
    sql = (
        f"insert into public.{table} ({','.join(columns)}) "
        f"values ({','.join(values)}) returning *"
    )
    return queries.row_json(sql, mutable=True)


def update_row_for_table(table, payload, where_sql):
    assert_known_table(table)
    columns = existing_columns(table, [c for c in tables.TABLES[table]["update"] if c in payload])
    if not columns:
        raise ValueError("empty update payload")
    values = queries.record_columns_sql(table, columns, payload)
    sets = [f"{column} = {value}" for column, value in zip(columns, values)]
    sql = f"update public.{table} set {','.join(sets)} where {where_sql} returning *"
    return queries.row_json(sql, mutable=True)


def delete_row_for_table(table, where_sql):
    assert_known_table(table)
    run_sql(f"delete from public.{table} where {where_sql};")


def update_columns(table, pk_value, updates):
    """단일 행의 지정 컬럼만 갱신한다 (미디어 로컬화 등 후처리용)."""
    assert_known_table(table)
    if not updates:
        return
    pk = primary_key(table)
    sets = ", ".join(f"{name} = {sql_literal(value)}" for name, value in updates.items())
    run_sql(f"update public.{table} set {sets} where {pk} = {sql_literal(pk_value)};")


def database_metadata():
    rows = queries.row_json(
        "select current_database() as database_name, "
        "pg_database_size(current_database()) as size_bytes, "
        "pg_size_pretty(pg_database_size(current_database())) as size_pretty"
    )
    if rows:
        return rows[0]
    return {
        "database_name": config.ENV["PGDATABASE"],
        "size_bytes": 0,
        "size_pretty": "0 bytes",
    }
