from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
from html import unescape
import json
import os
import re
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
        "insert": ["title", "movie_code", "category_code", "actor_id", "actor_ids", "director_names", "source_url", "keywords", "rating_grade", "video_url", "description", "poster_url", "poster_asset_id", "capture_url", "capture_asset_id", "snapshot_url", "snapshot_asset_id", "release_month", "production_company", "recommendation_score", "rotten_tomatoes_score", "ranking_score", "click_count", "is_main"],
        "update": ["title", "movie_code", "category_code", "actor_id", "actor_ids", "director_names", "source_url", "keywords", "rating_grade", "video_url", "description", "poster_url", "poster_asset_id", "capture_url", "capture_asset_id", "snapshot_url", "snapshot_asset_id", "release_month", "production_company", "recommendation_score", "rotten_tomatoes_score", "ranking_score", "click_count", "is_main"],
    },
}


TMDB_IMAGE_BASE = "https://media.themoviedb.org/t/p"


def clean_text(value):
    if value is None:
        return ""
    value = re.sub(r"<[^>]+>", " ", value)
    value = unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def tmdb_image_url(path, size):
    if not path:
        return None
    if path.startswith("http"):
        return path
    return f"{TMDB_IMAGE_BASE}/{size}{path}"


def extract_tmdb_id(url):
    match = re.search(r"/movie/(\d+)", url or "")
    if not match:
        raise ValueError("TMDB movie URL이 아닙니다")
    return match.group(1)


def fetch_tmdb_json(movie_id, language="ko-KR"):
    api_url = (
        f"https://api.themoviedb.org/3/movie/{movie_id}"
        f"?api_key=1ec5e91d2958623b1d6346bec69ab4a8"
        f"&language={language}&append_to_response=credits,images"
        f"&include_image_language=ko,en,null"
    )
    req = Request(api_url, headers={
        "User-Agent": "CineTube Local Importer",
        "Accept": "application/json",
    })
    with urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_remote_text(url):
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 CineTube Local Importer",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    })
    with urlopen(req, timeout=20) as response:
        return response.read().decode("utf-8", errors="replace")


def meta_contents(html, key):
    pattern = re.compile(
        rf"<meta[^>]+(?:property|name)=[\"']{re.escape(key)}[\"'][^>]+content=[\"']([^\"']*)[\"'][^>]*>",
        re.I,
    )
    return [unescape(match.group(1)) for match in pattern.finditer(html)]


def extract_tmdb_images_from_html(html, title):
    images = []
    img_pattern = re.compile(r"<img[^>]+>", re.I)
    attr_pattern = re.compile(r"(src|data-src|alt)=[\"']([^\"']*)[\"']", re.I)
    for tag in img_pattern.finditer(html):
        attrs = {match.group(1).lower(): unescape(match.group(2)) for match in attr_pattern.finditer(tag.group(0))}
        src = attrs.get("src") or attrs.get("data-src")
        alt = clean_text(attrs.get("alt"))
        if not src or not src.startswith("https://media.themoviedb.org/"):
            continue
        images.append({"src": src, "alt": alt})
    poster = next((item["src"] for item in images if item["alt"] == title and "h900" in item["src"]), None)
    backdrop = next((item["src"] for item in images if item["alt"] == title and "h600" in item["src"]), None)
    cast = []
    for item in images:
        alt = item["alt"]
        if "w138_and_h175_face" not in item["src"] and "w276_and_h350_face" not in item["src"]:
            continue
        if not alt or alt == title or alt in {"The Movie Database (TMDB)", "회사 로고"}:
            continue
        if alt not in [person["name"] for person in cast]:
            cast.append({"name": alt, "profile_url": item["src"]})
        if len(cast) == 4:
            break
    return poster, backdrop, cast


def category_code_from_name(name):
    mapping = {
        "SF": "sf",
        "Science Fiction": "sf",
        "드라마": "drama",
        "Drama": "drama",
        "전쟁": "war",
        "War": "war",
        "스릴러": "thriller",
        "Thriller": "thriller",
        "액션": "action",
        "Action": "action",
        "범죄": "crime",
        "Crime": "crime",
        "모험": "adventure",
        "Adventure": "adventure",
    }
    if name in mapping:
        return mapping[name]
    return re.sub(r"[^a-z0-9가-힣]+", "-", (name or "movie").lower()).strip("-") or "movie"


def build_tmdb_import_from_page(url):
    movie_id = extract_tmdb_id(url)
    html = fetch_remote_text(url)
    title = (meta_contents(html, "og:title") or [""])[0]
    description = (meta_contents(html, "description") or meta_contents(html, "og:description") or [""])[0]
    og_images = meta_contents(html, "og:image")
    text = clean_text(re.sub(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", " ", html, flags=re.I | re.S))
    poster, backdrop, cast = extract_tmdb_images_from_html(html, title)
    poster = poster or (og_images[0] if og_images else None)
    backdrop = backdrop or (og_images[1] if len(og_images) > 1 else poster)

    header_text = text[:1200]
    title_pattern = re.compile(rf"{re.escape(title)}\s+\(\d{{4}}\)")
    for match in title_pattern.finditer(text):
        candidate = text[match.start():match.start() + 700]
        if re.search(r"\d+h\s+\d+m", candidate):
            header_text = candidate

    release_month = ""
    release_match = re.search(r"(\d{4})/(\d{2})/\d{2}", header_text)
    if release_match:
        release_month = f"{release_match.group(1)}-{release_match.group(2)}"

    genre_names = []
    genre_source = header_text[release_match.end():] if release_match else header_text
    genre_match = re.search(r"\([A-Z]{2}\)\s+(.+?)\s+\d+h\s+\d+m", genre_source)
    if genre_match:
        genre_names = [
            re.sub(r"^and\s+", "", clean_text(item).strip(" ,\u00a0"), flags=re.I)
            for item in re.split(r"\s+and\s+|,\s*|\s+,\s*", genre_match.group(1))
            if clean_text(item)
        ]
    category_name = genre_names[0] if genre_names else "Movie"
    category_code = category_code_from_name(category_name)

    directors = []
    director_pattern = re.compile(r"href=[\"']/person/[^\"']+[\"'][^>]*>\s*([^<]+?)\s*</a>.*?Director", re.I | re.S)
    for match in director_pattern.finditer(html):
        name = clean_text(match.group(1))
        if name and name not in directors:
            directors.append(name)
        if len(directors) == 2:
            break

    score_match = re.search(r"회원\s*점수\s*(\d{1,3})", text)
    score = int(score_match.group(1)) if score_match else 0

    return {
        "title": title,
        "movie_code": f"TMDB-{movie_id}",
        "category_code": category_code,
        "category_name": category_name,
        "actor_names": [person["name"] for person in cast],
        "actor_profiles": cast,
        "director_names": directors,
        "keywords": [*genre_names, *[person["name"] for person in cast[:2]]],
        "rating_grade": "A",
        "video_url": url,
        "source_url": url,
        "description": clean_text(description),
        "poster_url": poster,
        "capture_url": backdrop,
        "snapshot_url": backdrop,
        "release_month": release_month,
        "production_company": "",
        "recommendation_score": score,
        "ranking_score": score,
        "rotten_tomatoes_score": None,
        "is_main": False,
    }


def build_tmdb_import(url):
    movie_id = extract_tmdb_id(url)
    try:
        movie = fetch_tmdb_json(movie_id)
    except Exception:
        return build_tmdb_import_from_page(url)
    credits = movie.get("credits") or {}
    cast = (credits.get("cast") or [])[:4]
    crew = credits.get("crew") or []
    directors = []
    for person in crew:
        if person.get("job") == "Director" and person.get("name") not in directors:
            directors.append(person.get("name"))
        if len(directors) == 2:
            break

    genres = movie.get("genres") or []
    genre_names = [genre.get("name") for genre in genres if genre.get("name")]
    first_genre = genres[0] if genres else {}
    category_code = re.sub(r"[^a-z0-9]+", "-", (first_genre.get("name") or "movie").lower()).strip("-")
    companies = movie.get("production_companies") or []
    release_date = movie.get("release_date") or ""

    backdrops = movie.get("images", {}).get("backdrops") or []
    backdrop_path = (backdrops[0] or {}).get("file_path") if backdrops else movie.get("backdrop_path")

    return {
        "title": movie.get("title") or movie.get("original_title") or "",
        "movie_code": f"TMDB-{movie_id}",
        "category_code": category_code or "movie",
        "category_name": first_genre.get("name") or "Movie",
        "actor_names": [person.get("name") for person in cast if person.get("name")],
        "actor_profiles": [
            {
                "name": person.get("name"),
                "profile_url": tmdb_image_url(person.get("profile_path"), "w276_and_h350_face"),
            }
            for person in cast
            if person.get("name")
        ],
        "director_names": directors,
        "keywords": [*genre_names, *[person.get("name") for person in cast[:2] if person.get("name")]],
        "rating_grade": "A",
        "video_url": url,
        "source_url": url,
        "description": clean_text(movie.get("overview")),
        "poster_url": tmdb_image_url(movie.get("poster_path"), "w500"),
        "capture_url": tmdb_image_url(backdrop_path, "w780"),
        "snapshot_url": tmdb_image_url(backdrop_path, "w780"),
        "release_month": release_date[:7] if len(release_date) >= 7 else "",
        "production_company": companies[0].get("name") if companies else "",
        "recommendation_score": round(float(movie.get("vote_average") or 0) * 10),
        "ranking_score": round(float(movie.get("vote_average") or 0) * 10),
        "rotten_tomatoes_score": None,
        "is_main": False,
    }


def run_sql(sql):
    proc = subprocess.run(
        [PSQL, "-X", "-q", "-t", "-A"],
        env=ENV,
        input=sql,
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


def row_json(table, sql, mutable=False):
    inner_sql = sql.strip().rstrip(";")
    statement = inner_sql.lower()
    if mutable or statement.startswith(("insert ", "update ", "delete ")):
        output = run_sql(f"with q as ({inner_sql}) select coalesce(json_agg(row_to_json(q)), '[]'::json) from q;")
    else:
        output = run_sql(f"select coalesce(json_agg(row_to_json(q)), '[]'::json) from ({inner_sql}) q;")
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
            parsed = urlparse(self.path)
            if parsed.path.strip("/") == "tmdb/import":
                query = parse_qs(parsed.query)
                url = query.get("url", [""])[0]
                if not url:
                    raise ValueError("url 파라미터가 필요합니다")
                self.send_json(build_tmdb_import(url))
                return
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
        return row_json(table, sql, mutable=True)

    def update_row(self, table, payload, where):
        columns = [c for c in TABLES[table]["update"] if c in payload]
        if not columns:
            raise ValueError("empty update payload")
        sets = [f"{c} = (json_populate_record(null::public.{table}, {json_literal(payload)}::json)).{c}" for c in columns]
        sql = f"update public.{table} set {','.join(sets)} where {where} returning *"
        return row_json(table, sql, mutable=True)

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
