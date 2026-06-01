from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
import json
import os
import subprocess

POSTGRES_ROOT = r"C:\Program Files\PostgreSQL"
versions = []
if os.path.isdir(POSTGRES_ROOT):
    versions = [
        os.path.join(POSTGRES_ROOT, name)
        for name in os.listdir(POSTGRES_ROOT)
        if name.isdigit() and os.path.isdir(os.path.join(POSTGRES_ROOT, name))
    ]
PG_BIN = os.path.join(sorted(versions, key=lambda path: int(os.path.basename(path)), reverse=True)[0], "bin") if versions else ""
PSQL = os.path.join(PG_BIN, "psql.exe")
ENV = {
    **os.environ,
    "PGHOST": "localhost",
    "PGPORT": "54322",
    "PGUSER": "postgres",
    "PGDATABASE": "cinetube",
}

TABLES = {
    "media_assets": {
        "pk": "id",
        "insert": ["bucket_id", "object_path", "public_url", "original_name", "mime_type", "size_bytes", "owner_table", "owner_field", "owner_id", "sort_order"],
        "update": ["bucket_id", "object_path", "public_url", "original_name", "mime_type", "size_bytes", "owner_table", "owner_field", "owner_id", "sort_order"],
    },
    "categories": {
        "pk": "category_code",
        "insert": ["category_code", "name", "representative_image_url", "representative_image_asset_id", "is_visible"],
        "update": ["name", "representative_image_url", "representative_image_asset_id", "is_visible"],
    },
    "actors": {
        "pk": "id",
        "insert": ["name", "age", "height_cm", "body_size", "debut_year", "representative_image_url", "representative_image_asset_id", "image_urls", "image_asset_ids"],
        "update": ["name", "age", "height_cm", "body_size", "debut_year", "representative_image_url", "representative_image_asset_id", "image_urls", "image_asset_ids"],
    },
    "rating_grades": {
        "pk": "grade",
        "insert": ["grade", "display_order"],
        "update": ["display_order"],
    },
    "movies": {
        "pk": "id",
        "insert": ["title", "movie_code", "category_code", "actor_id", "keywords", "rating_grade", "video_url", "description", "poster_url", "poster_asset_id", "capture_url", "capture_asset_id", "snapshot_url", "snapshot_asset_id", "release_month", "production_company", "recommendation_score", "ranking_score", "click_count", "is_main"],
        "update": ["title", "movie_code", "category_code", "actor_id", "keywords", "rating_grade", "video_url", "description", "poster_url", "poster_asset_id", "capture_url", "capture_asset_id", "snapshot_url", "snapshot_asset_id", "release_month", "production_company", "recommendation_score", "ranking_score", "click_count", "is_main"],
    },
}


def run_sql(sql):
    proc = subprocess.run(
        [PSQL, "-X", "-q", "-t", "-A", "-c", sql],
        env=ENV,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip())
    return proc.stdout.strip()


def sql_literal(value):
    if value is None:
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def json_literal(value):
    return sql_literal(json.dumps(value, ensure_ascii=False))


def filter_clause(table, query):
    meta = TABLES[table]
    pk = meta["pk"]
    raw = query.get(pk, [""])[0]
    if not raw.startswith("eq."):
        return None
    return f"{pk} = {sql_literal(raw[3:])}"


def row_json(table, sql):
    statement = sql.strip().lower()
    if statement.startswith(("insert ", "update ")):
        output = run_sql(f"with q as ({sql}) select coalesce(json_agg(row_to_json(q)), '[]'::json) from q;")
    else:
        output = run_sql(f"select coalesce(json_agg(row_to_json(q)), '[]'::json) from ({sql}) q;")
    return json.loads(output or "[]")


class Handler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Prefer")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        try:
            table, query = self.parse_table()
            order = query.get("order", ["created_at.desc"])[0]
            column, _, direction = order.partition(".")
            direction = "asc" if direction.lower() == "asc" else "desc"
            if not column.replace("_", "").isalnum():
                raise ValueError("invalid order column")
            rows = row_json(table, f"select * from public.{table} order by {column} {direction}")
            self.send_json(rows)
        except Exception as exc:
            self.send_error_json(exc)

    def do_POST(self):
        try:
            table, _ = self.parse_table()
            payload = self.read_json()
            rows = self.insert_row(table, payload)
            self.send_json(rows)
        except Exception as exc:
            self.send_error_json(exc)

    def do_PATCH(self):
        try:
            table, query = self.parse_table()
            where = filter_clause(table, query)
            if not where:
                raise ValueError("missing primary key filter")
            payload = self.read_json()
            rows = self.update_row(table, payload, where)
            self.send_json(rows)
        except Exception as exc:
            self.send_error_json(exc)

    def do_DELETE(self):
        try:
            table, query = self.parse_table()
            where = filter_clause(table, query)
            if not where:
                raise ValueError("missing primary key filter")
            run_sql(f"delete from public.{table} where {where};")
            self.send_response(204)
            self.end_headers()
        except Exception as exc:
            self.send_error_json(exc)

    def parse_table(self):
        parsed = urlparse(self.path)
        table = parsed.path.strip("/")
        if table not in TABLES:
            raise ValueError("unknown table")
        return table, parse_qs(parsed.query)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def insert_row(self, table, payload):
        columns = [c for c in TABLES[table]["insert"] if c in payload]
        if not columns:
            raise ValueError("empty insert payload")
        values = [f"(json_populate_record(null::public.{table}, {json_literal(payload)}::json)).{c}" for c in columns]
        sql = f"insert into public.{table} ({','.join(columns)}) values ({','.join(values)}) returning *"
        return row_json(table, sql)

    def update_row(self, table, payload, where):
        columns = [c for c in TABLES[table]["update"] if c in payload]
        if not columns:
            raise ValueError("empty update payload")
        sets = [f"{c} = (json_populate_record(null::public.{table}, {json_literal(payload)}::json)).{c}" for c in columns]
        sql = f"update public.{table} set {','.join(sets)} where {where} returning *"
        return row_json(table, sql)

    def send_json(self, value, status=200):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, exc):
        body = json.dumps({"message": str(exc)}, ensure_ascii=False).encode("utf-8")
        self.send_response(500)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 3001), Handler).serve_forever()
