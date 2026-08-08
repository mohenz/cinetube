"""queries.py SQL 조립 단위테스트 (DB 미접속, table_columns 대체)."""

import unittest
from unittest import mock
from urllib.parse import parse_qs

from cinetube_api import queries

MOVIE_COLUMNS = {
    "id", "title", "movie_code", "category_code", "description",
    "production_company", "keywords", "created_at", "is_main",
}


def query(qs):
    return parse_qs(qs)


class QueryClauseTest(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.object(queries, "table_columns", return_value=MOVIE_COLUMNS)
        self.addCleanup(patcher.stop)
        patcher.start()

    # --- 필터 ---------------------------------------------------------

    def test_filter_clause_requires_eq_prefix(self):
        self.assertIsNone(queries.filter_clause("movies", query("id=42")))

    def test_filter_clause_builds_pk_condition(self):
        self.assertEqual(queries.filter_clause("movies", query("id=eq.42")), "id = '42'")

    def test_filter_clause_escapes_quotes(self):
        clause = queries.filter_clause("categories", query("category_code=eq.o'brien"))
        self.assertEqual(clause, "category_code = 'o''brien'")

    def test_read_filter_ignores_control_params_and_unknown_columns(self):
        clauses = queries.read_filter_clauses(
            "movies", query("category_code=eq.action&limit=10&bogus=eq.x")
        )
        self.assertEqual(clauses, ["category_code = 'action'"])

    # --- 검색 ---------------------------------------------------------

    def test_search_clause_covers_configured_columns(self):
        clause = queries.search_clause("movies", query("search=hero"))
        self.assertTrue(clause.startswith("("))
        self.assertIn("coalesce(title::text, '') ilike '%hero%'", clause)
        self.assertIn(" or ", clause)

    def test_search_clause_empty_term(self):
        self.assertIsNone(queries.search_clause("movies", query("search=")))

    def test_search_clause_unsupported_table(self):
        self.assertIsNone(queries.search_clause("media_assets", query("search=x")))

    def test_where_clause_combines_filter_and_search(self):
        where = queries.where_clause("movies", query("category_code=eq.action&search=hero"))
        self.assertTrue(where.startswith(" where "))
        self.assertIn("category_code = 'action' and (", where)

    def test_where_clause_empty(self):
        self.assertEqual(queries.where_clause("movies", query("")), "")

    # --- 정렬 ---------------------------------------------------------

    def test_order_clause_default(self):
        self.assertEqual(queries.order_clause("movies", query("")), " order by created_at desc")

    def test_order_clause_asc(self):
        self.assertEqual(queries.order_clause("movies", query("order=title.asc")), " order by title asc")

    def test_order_clause_unknown_direction_is_desc(self):
        self.assertEqual(queries.order_clause("movies", query("order=title.sideways")), " order by title desc")

    def test_order_clause_rejects_injection(self):
        with self.assertRaises(ValueError):
            queries.order_clause("movies", query("order=title;drop.asc"))

    def test_order_clause_rejects_unknown_column(self):
        with self.assertRaises(ValueError):
            queries.order_clause("movies", query("order=nope.asc"))

    # --- 페이지네이션 ---------------------------------------------------

    def test_pagination_default_is_unbounded(self):
        self.assertEqual(queries.pagination_clause(query("")), ("", 0, 0, 1))

    def test_pagination_all_keyword(self):
        self.assertEqual(queries.pagination_clause(query("page_size=all")), ("", 0, 0, 1))

    def test_pagination_page_and_size(self):
        self.assertEqual(
            queries.pagination_clause(query("page_size=20&page=3")),
            (" limit 20 offset 40", 20, 40, 3),
        )

    def test_pagination_explicit_offset_wins(self):
        self.assertEqual(
            queries.pagination_clause(query("limit=10&page=5&offset=7")),
            (" limit 10 offset 7", 10, 7, 5),
        )

    def test_pagination_caps_page_size(self):
        page_sql, limit, _, _ = queries.pagination_clause(query("page_size=100000"))
        self.assertEqual(limit, 200)
        self.assertEqual(page_sql, " limit 200 offset 0")

    def test_pagination_rejects_negative(self):
        self.assertEqual(queries.pagination_clause(query("page_size=-5")), ("", 0, 0, 1))

    def test_positive_int_bad_input(self):
        self.assertEqual(queries.positive_int("abc", default=7), 7)

    # --- select ------------------------------------------------------

    def test_select_clause_star(self):
        self.assertEqual(queries.select_clause("movies", query("")), "*")

    def test_select_clause_filters_unknown_columns(self):
        self.assertEqual(queries.select_clause("movies", query("select=title,nope,id")), "title, id")

    def test_select_clause_all_unknown_falls_back_to_star(self):
        self.assertEqual(queries.select_clause("movies", query("select=nope")), "*")


class RecordSqlTest(unittest.TestCase):
    def test_record_columns_sql_uses_json_populate_record(self):
        values = queries.record_columns_sql("movies", ["title"], {"title": "A'B"})
        self.assertEqual(len(values), 1)
        self.assertIn("json_populate_record(null::public.movies", values[0])
        self.assertIn("A''B", values[0])
        self.assertTrue(values[0].endswith(".title"))


class RowJsonTest(unittest.TestCase):
    def test_select_is_wrapped_as_subquery(self):
        with mock.patch.object(queries, "run_sql", return_value="[]") as run_sql:
            queries.row_json("select * from public.movies")
        self.assertIn("from (select * from public.movies) q", run_sql.call_args[0][0])

    def test_insert_is_wrapped_with_cte(self):
        with mock.patch.object(queries, "run_sql", return_value="[]") as run_sql:
            queries.row_json("insert into public.movies (title) values ('a') returning *")
        self.assertTrue(run_sql.call_args[0][0].startswith("with q as ("))

    def test_empty_output_returns_empty_list(self):
        with mock.patch.object(queries, "run_sql", return_value=""):
            self.assertEqual(queries.row_json("select 1"), [])

    def test_total_count_parses_scalar(self):
        with mock.patch.object(queries, "run_sql", return_value="37"):
            self.assertEqual(queries.total_count("movies", " where id = '1'"), 37)


if __name__ == "__main__":
    unittest.main()
