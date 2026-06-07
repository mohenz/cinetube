from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse
from urllib.request import HTTPCookieProcessor, Request, build_opener, urlopen
from http.cookiejar import CookieJar
from html import unescape
import json
import os
import re
import ssl
import subprocess
from functools import lru_cache

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
    "common_codes": {
        "pk": "id",
        "insert": ["code_group", "code_value", "code_label", "display_order", "is_enabled", "extra"],
        "update": ["code_group", "code_value", "code_label", "display_order", "is_enabled", "extra"],
    },
    "favorite_movies": {
        "pk": "id",
        "insert": ["user_key", "content_type", "content_id", "note", "metadata"],
        "update": ["user_key", "content_type", "content_id", "note", "metadata"],
    },
    "gallery_images": {
        "pk": "id",
        "insert": ["gallery_image_id", "title", "description", "image_url", "image_asset_id", "source", "tags", "is_visible"],
        "update": ["gallery_image_id", "title", "description", "image_url", "image_asset_id", "source", "tags", "is_visible"],
    },
    "webtoons": {
        "pk": "id",
        "insert": ["webtoon_id", "title", "rating", "alternative", "artist", "genre", "type", "tage", "poster_image", "poster_image_asset_id", "url", "webtoon_images", "webtoon_image_asset_ids"],
        "update": ["webtoon_id", "title", "rating", "alternative", "artist", "genre", "type", "tage", "poster_image", "poster_image_asset_id", "url", "webtoon_images", "webtoon_image_asset_ids"],
    },
    "webtoon_chapters": {
        "pk": "id",
        "insert": ["webtoon_chapter_id", "webtoon_id", "chapter_number", "chapter_url", "chapter_poster", "chapter_poster_asset_id"],
        "update": ["webtoon_chapter_id", "webtoon_id", "chapter_number", "chapter_url", "chapter_poster", "chapter_poster_asset_id"],
    },
    "movies": {
        "pk": "id",
        "insert": ["title", "movie_code", "category_code", "actor_id", "actor_ids", "director_names", "source_url", "keywords", "rating_grade", "video_url", "description", "poster_url", "poster_asset_id", "capture_url", "capture_asset_id", "snapshot_url", "snapshot_asset_id", "release_month", "production_company", "recommendation_score", "rotten_tomatoes_score", "ranking_score", "click_count", "is_main"],
        "update": ["title", "movie_code", "category_code", "actor_id", "actor_ids", "director_names", "source_url", "keywords", "rating_grade", "video_url", "description", "poster_url", "poster_asset_id", "capture_url", "capture_asset_id", "snapshot_url", "snapshot_asset_id", "release_month", "production_company", "recommendation_score", "rotten_tomatoes_score", "ranking_score", "click_count", "is_main"],
    },
}


TMDB_IMAGE_BASE = "https://media.themoviedb.org/t/p"
IMPORT_SITES = ("tmdb", "javtiful", "supjav", "missav")


def clean_text(value):
    if value is None:
        return ""
    value = re.sub(r"<[^>]+>", " ", value)
    value = unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def html_text_lines(html):
    value = re.sub(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", " ", html or "", flags=re.I | re.S)
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"</(p|div|section|article|li|dt|dd|tr|h[1-6])>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]+>", " ", value)
    value = unescape(value)
    lines = [re.sub(r"\s+", " ", line).strip() for line in value.splitlines()]
    return "\n".join(line for line in lines if line)


def absolute_url(base_url, value):
    if not value:
        return None
    value = unescape(value).strip()
    if value.startswith("//"):
        return "https:" + value
    if value.startswith("http://") or value.startswith("https://"):
        return value
    parsed = urlparse(base_url)
    if value.startswith("/"):
        return f"{parsed.scheme}://{parsed.netloc}{value}"
    root = base_url.rsplit("/", 1)[0]
    return f"{root}/{value}"


def extract_movie_code(value):
    match = re.search(r"\b([A-Z]{2,10}-\d{2,6})\b", value or "", re.I)
    return match.group(1).upper() if match else ""


def code_slug(value):
    code = extract_movie_code(value)
    return code.lower() if code else re.sub(r"[^a-z0-9-]+", "-", (value or "").lower()).strip("-")


def meta_content(html, key):
    values = meta_contents(html, key)
    return values[0] if values else ""


def first_match(patterns, text, flags=re.I | re.S):
    for pattern in patterns:
        match = re.search(pattern, text or "", flags)
        if match:
            return clean_text(match.group(1))
    return ""


def find_json_ld(html):
    blocks = []
    for match in re.finditer(r"<script[^>]+type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>", html or "", re.I | re.S):
        raw = clean_text(match.group(1))
        try:
            blocks.append(json.loads(raw))
        except Exception:
            continue
    return blocks


def link_texts(html, href_keywords):
    items = []
    pattern = re.compile(r"<a\b([^>]*)>(.*?)</a>", re.I | re.S)
    href_pattern = re.compile(r"href=[\"']([^\"']+)[\"']", re.I)
    for match in pattern.finditer(html or ""):
        attrs, body = match.groups()
        href_match = href_pattern.search(attrs)
        href = href_match.group(1) if href_match else ""
        if not any(keyword in href.lower() for keyword in href_keywords):
            continue
        text = clean_text(body)
        if not text or len(text) > 80:
            continue
        if text.lower() in {"home", "movies", "javtiful", "supjav"}:
            continue
        if text not in items:
            items.append(text)
    return items


def extract_image_candidates(html, base_url):
    images = []
    for value in meta_contents(html, "og:image"):
        url = absolute_url(base_url, value)
        if url and url not in images:
            images.append(url)

    img_pattern = re.compile(r"<img[^>]+>", re.I)
    attr_pattern = re.compile(r"(src|data-src|data-original|data-lazy-src|data-link)=[\"']([^\"']*)[\"']", re.I)
    for tag in img_pattern.finditer(html or ""):
        attrs = {match.group(1).lower(): match.group(2) for match in attr_pattern.finditer(tag.group(0))}
        for key in ("data-original", "data-lazy-src", "data-src", "data-link", "src"):
          url = absolute_url(base_url, attrs.get(key))
          if url and url not in images and not url.startswith("data:"):
              images.append(url)
    return images


def best_poster_url(images):
    if not images:
        return None
    preferred = [
        "poster", "cover", "pl.jpg", "thumb", "jacket", "package", "uploads/videos/thumbs"
    ]
    for keyword in preferred:
        match = next((url for url in images if keyword in url.lower()), None)
        if match:
            return match
    return images[0]


def clean_av_title(title, movie_code):
    title = clean_text(title)
    title = re.sub(r"\s*[-|]\s*(Javtiful|Supjav).*$", "", title, flags=re.I)
    if movie_code and movie_code.lower() not in title.lower():
        title = f"{movie_code} {title}".strip()
    return title


def title_from_url_slug(url, movie_code):
    path = urlparse(url or "").path.strip("/")
    slug = path.split("/")[-1] if path else ""
    if slug.endswith(".html"):
        slug = slug[:-5]
    slug = re.sub(r"^\d+[-_]*", "", slug)
    if movie_code:
        slug = re.sub(re.escape(movie_code).replace("\\-", "[-_]"), "", slug, flags=re.I)
    slug = re.sub(r"[-_]+", " ", slug).strip()
    words = [part.capitalize() for part in slug.split() if part]
    title = " ".join(words)
    return f"{movie_code} {title}".strip() if movie_code else title


def build_external_import_fallback(value, site, error_message=""):
    url = value if str(value or "").startswith(("http://", "https://")) else ""
    movie_code = extract_movie_code(value)
    title = title_from_url_slug(url, movie_code) if url else movie_code
    site_name = "Javtiful" if site == "javtiful" else "Supjav"
    return {
        "title": title or movie_code or value,
        "movie_code": movie_code or code_slug(value).upper(),
        "category_code": "reducing-mosaic",
        "category_name": "Reducing Mosaic",
        "actor_names": [],
        "actor_profiles": [],
        "director_names": [],
        "keywords": [item for item in [site_name, "Reducing", movie_code] if item],
        "rating_grade": "B+",
        "video_url": url or value,
        "source_url": url or value,
        "description": f"{site_name} 페이지 직접 조회가 차단되어 URL/작품번호 기준 최소 정보만 가져왔습니다. {error_message}".strip(),
        "poster_url": None,
        "capture_url": None,
        "snapshot_url": None,
        "release_month": "",
        "production_company": "",
        "recommendation_score": 80,
        "ranking_score": 80,
        "rotten_tomatoes_score": None,
        "is_main": False,
        "import_warning": "remote_fetch_blocked",
    }


def infer_actor_names(html, title, movie_code):
    names = []
    for name in link_texts(html, ["/actor", "/actors", "/star", "/stars", "/model", "/models", "/idol"]):
        if extract_movie_code(name):
            continue
        if name not in names:
            names.append(name)

    for key in ("article:tag", "keywords"):
        for raw in meta_contents(html, key):
            for token in re.split(r",|、|\|", raw):
                token = clean_text(token)
                if not token or extract_movie_code(token):
                    continue
                if re.search(r"jav|uncensored|mosaic|reducing|movie|video|hd|fhd", token, re.I):
                    continue
                if 2 <= len(token) <= 40 and token not in names:
                    names.append(token)

    if not names:
        tail = title
        if movie_code:
            tail = re.sub(re.escape(movie_code), "", tail, flags=re.I).strip(" -:")
        words = re.findall(r"[A-Z][a-z]+", tail)
        if len(words) >= 2:
            candidate = " ".join(words[-2:])
            if candidate not in names:
                names.append(candidate)

    return names[:4]


def build_external_import(url, site):
    if site == "projectjav":
        return build_projectjav_import(url)
    if site == "missav":
        return build_missav_import(url)
    try:
        html = fetch_remote_text(url)
    except Exception as exc:
        return build_external_import_fallback(url, site, str(exc))
    title = meta_content(html, "og:title") or first_match([r"<title[^>]*>(.*?)</title>"], html) or ""
    description = meta_content(html, "description") or meta_content(html, "og:description") or ""
    text = clean_text(re.sub(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", " ", html, flags=re.I | re.S))
    movie_code = extract_movie_code(title) or extract_movie_code(url) or extract_movie_code(text)
    images = extract_image_candidates(html, url)
    poster = best_poster_url(images)
    actor_names = infer_actor_names(html, title, movie_code)

    release_month = ""
    release_match = re.search(r"\b(20\d{2}|19\d{2})[-/.](0?[1-9]|1[0-2])[-/.]\d{1,2}\b", text)
    if release_match:
        release_month = f"{release_match.group(1)}-{int(release_match.group(2)):02d}"

    studio = first_match([
        r"(?:Studio|Maker|제작사|メーカー)\s*[:：]\s*([^\n\r|<]{1,80})",
        r"(?:Label|레이블)\s*[:：]\s*([^\n\r|<]{1,80})",
    ], text)

    site_name = "Javtiful" if site == "javtiful" else "Supjav"
    category_code = "reducing-mosaic"
    category_name = "Reducing Mosaic"
    keywords = [site_name, "Reducing", movie_code, *actor_names]

    return {
        "title": clean_av_title(title, movie_code),
        "movie_code": movie_code or code_slug(url).upper(),
        "category_code": category_code,
        "category_name": category_name,
        "actor_names": actor_names,
        "actor_profiles": [{"name": name, "profile_url": None} for name in actor_names],
        "director_names": [],
        "keywords": [item for item in keywords if item],
        "rating_grade": "B+",
        "video_url": url,
        "source_url": url,
        "description": clean_text(description),
        "poster_url": poster,
        "capture_url": images[1] if len(images) > 1 else poster,
        "snapshot_url": images[2] if len(images) > 2 else (images[1] if len(images) > 1 else poster),
        "release_month": release_month,
        "production_company": studio,
        "recommendation_score": 80,
        "ranking_score": 80,
        "rotten_tomatoes_score": None,
        "is_main": False,
    }


def extract_label_value(text, label):
    pattern = re.compile(rf"{re.escape(label)}\s+([^\n\r]+)", re.I)
    match = pattern.search(text or "")
    return clean_text(match.group(1)) if match else ""


def extract_colon_value(text, label):
    pattern = re.compile(rf"{re.escape(label)}\s*[:：]\s*([^\n\r]+)", re.I)
    match = pattern.search(text or "")
    return clean_text(match.group(1)) if match else ""


def extract_projectjav_download_title(html, movie_code):
    for href in re.findall(r"href=[\"'](magnet:\?[^\"']+)[\"']", html or "", re.I):
        params = parse_qs(urlparse(unescape(href)).query)
        dn = params.get("dn", [""])[0]
        title = clean_text(unquote(dn).replace("+", " "))
        if not title or movie_code.lower() not in title.lower():
            continue
        title = re.sub(r"^\+*\s*", "", title)
        title = re.sub(r"^\[[^\]]+\]\s*", "", title)
        return title
    return ""


def projectjav_fallback_from_url(url, error_message=""):
    path = urlparse(url or "").path.strip("/")
    slug_match = re.search(r"movie/(.+)-(\d+)$", path, re.I)
    slug = slug_match.group(1) if slug_match else path.split("/")[-1]
    project_id = slug_match.group(2) if slug_match else ""
    movie_code = extract_movie_code(slug) or slug.split("-")[0].upper()
    poster = f"https://images.projectjav.com/data/covers/{project_id}.jpg" if project_id else None
    screenshot = f"https://images.projectjav.com/data/screenshots/{project_id}.jpg?width=300" if project_id else poster
    return {
        "title": movie_code,
        "movie_code": movie_code,
        "category_code": "projectjav",
        "category_name": "ProjectJAV",
        "actor_names": [],
        "actor_profiles": [],
        "director_names": [],
        "keywords": [item for item in ["ProjectJAV", movie_code] if item],
        "rating_grade": "B+",
        "video_url": url,
        "source_url": url,
        "description": f"ProjectJAV 페이지 직접 조회가 차단되어 URL 구조 기준으로 최소 정보를 가져왔습니다. {error_message}".strip(),
        "poster_url": poster,
        "capture_url": screenshot,
        "snapshot_url": screenshot,
        "release_month": "",
        "production_company": "",
        "recommendation_score": 80,
        "ranking_score": 80,
        "rotten_tomatoes_score": None,
        "is_main": False,
        "import_warning": "remote_fetch_blocked",
    }


def build_projectjav_import(url):
    try:
        html = fetch_remote_text(url)
    except Exception as exc:
        return projectjav_fallback_from_url(url, str(exc))
    text = clean_text(re.sub(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", " ", html, flags=re.I | re.S))
    title_meta = meta_content(html, "description") or first_match([r"<title[^>]*>(.*?)</title>"], html)
    h1 = first_match([r"<h1[^>]*>(.*?)</h1>"], html)
    movie_code = (h1 or extract_movie_code(url) or extract_movie_code(title_meta) or code_slug(url)).upper()

    images = extract_image_candidates(html, url)
    cover = next((image for image in images if "/data/covers/" in image.lower()), None) or best_poster_url(images)
    screenshot = next((image for image in images if "/data/screenshots/" in image.lower()), None) or cover

    actor_names = []
    for name in link_texts(html, ["/actress/"]):
        if name not in actor_names:
            actor_names.append(name)
    tags = []
    for name in link_texts(html, ["/tag/"]):
        if name not in tags:
            tags.append(name)

    download_title = extract_projectjav_download_title(html, movie_code)
    fallback_actor = actor_names[0] if actor_names else ""
    title = download_title or f"{movie_code} {fallback_actor}".strip()

    date_added = extract_label_value(text, "Date added")
    release_month = ""
    date_match = re.search(r"(\d{1,2})/(\d{1,2})/(20\d{2}|19\d{2})", date_added)
    if date_match:
        release_month = f"{date_match.group(3)}-{int(date_match.group(2)):02d}"

    publisher = extract_label_value(text, "Publisher")
    if re.match(r"^(Date added|Editor Rate|Views|Downloads)\b", publisher, re.I):
        publisher = ""
    description = clean_text(title_meta) or f"ProjectJAV movie metadata imported from {url}."

    return {
        "title": title,
        "movie_code": movie_code,
        "category_code": "projectjav",
        "category_name": "ProjectJAV",
        "actor_names": actor_names[:4],
        "actor_profiles": [{"name": name, "profile_url": None} for name in actor_names[:4]],
        "director_names": [],
        "keywords": [item for item in ["ProjectJAV", movie_code, *actor_names[:2], *tags[:4]] if item],
        "rating_grade": "B+",
        "video_url": url,
        "source_url": url,
        "description": description,
        "poster_url": cover,
        "capture_url": screenshot,
        "snapshot_url": screenshot,
        "release_month": release_month,
        "production_company": publisher,
        "recommendation_score": 80,
        "ranking_score": 80,
        "rotten_tomatoes_score": None,
        "is_main": False,
    }


def build_missav_import(url):
    html = fetch_remote_text(url)
    text = html_text_lines(html)
    title = first_match([r"<h1[^>]*>(.*?)</h1>"], html) or meta_content(html, "og:title")
    movie_code = extract_movie_code(title) or extract_movie_code(url) or extract_colon_value(text, "코드").upper()
    title = clean_av_title(title, movie_code)

    poster = meta_content(html, "og:image") or meta_content(html, "twitter:image")
    images = extract_image_candidates(html, url)
    if not poster:
        poster = best_poster_url(images)

    release_month = ""
    release_date = extract_colon_value(text, "출시일")
    release_match = re.search(r"(20\d{2}|19\d{2})[-/.](0?[1-9]|1[0-2])[-/.]\d{1,2}", release_date)
    if release_match:
        release_month = f"{release_match.group(1)}-{int(release_match.group(2)):02d}"

    genre_text = extract_colon_value(text, "장르")
    genres = [clean_text(item) for item in re.split(r",|、", genre_text) if clean_text(item)]
    actor_text = extract_colon_value(text, "여배우")
    actor_names = [clean_text(item) for item in re.split(r",|、", actor_text) if clean_text(item)]
    if not actor_names:
        actor_names = link_texts(html, ["/actresses/"])[:4]
    maker = extract_colon_value(text, "제작사")
    tag_text = extract_colon_value(text, "태그")
    tags = [clean_text(item) for item in re.split(r",|、", tag_text) if clean_text(item)]

    description = meta_content(html, "description") or ""
    detail_match = re.search(r"상세\s+(.+?)\s+코드\s*:", text, re.I | re.S)
    if detail_match:
        description = clean_text(detail_match.group(1))

    return {
        "title": title,
        "movie_code": movie_code,
        "category_code": "missav",
        "category_name": "MissAV",
        "actor_names": actor_names[:4],
        "actor_profiles": [{"name": name, "profile_url": None} for name in actor_names[:4]],
        "director_names": [],
        "keywords": [item for item in ["MissAV", movie_code, *actor_names[:2], *genres[:4], *tags[:2]] if item],
        "rating_grade": "B+",
        "video_url": url,
        "source_url": url,
        "description": clean_text(description),
        "poster_url": poster,
        "capture_url": poster,
        "snapshot_url": poster,
        "release_month": release_month,
        "production_company": maker,
        "recommendation_score": 80,
        "ranking_score": 80,
        "rotten_tomatoes_score": None,
        "is_main": False,
    }


def extract_first_external_result(search_url, code, site):
    html = fetch_remote_text(search_url)
    code_pattern = re.escape(code)
    links = []
    for match in re.finditer(r"<a\b([^>]*)href=[\"']([^\"']+)[\"']([^>]*)>(.*?)</a>", html, re.I | re.S):
        href = unescape(match.group(2))
        body = clean_text(match.group(4))
        haystack = f"{href} {body}"
        if not re.search(code_pattern, haystack, re.I):
            continue
        url = absolute_url(search_url, href)
        if site == "javtiful" and "javtiful.com" not in url:
            continue
        if site == "supjav" and "supjav.com" not in url:
            continue
        if site == "projectjav" and "projectjav.com/movie/" not in url:
            continue
        if site == "missav" and "/v/" not in url:
            continue
        if url not in links:
            links.append(url)
    return links[0] if links else ""


def resolve_external_input(value, site):
    value = (value or "").strip()
    if value.startswith("http://") or value.startswith("https://"):
        return value
    code = extract_movie_code(value)
    if not code:
        raise ValueError("URL 또는 작품번호가 필요합니다")
    if site == "javtiful":
        search_urls = [
            f"https://javtiful.com/search/videos/{code}",
            f"https://javtiful.com/?s={code}",
            f"https://javtiful.com/?q={code}",
        ]
    elif site == "supjav":
        search_urls = [
            f"https://supjav.com/?s={code}",
            f"https://supjav.com/?s={code.lower()}",
        ]
    elif site == "projectjav":
        search_urls = [
            f"https://projectjav.com/?searchTerm={code.upper()}",
            f"https://projectjav.com/?searchTerm={code.lower()}",
        ]
    else:
        return f"https://missav123.to/ko/v/{code.lower()}"
    for search_url in search_urls:
        try:
            result = extract_first_external_result(search_url, code, site)
            if result:
                return result
        except Exception:
            continue
    return value


def detect_import_site(value):
    raw = (value or "").strip()
    host = urlparse(raw).netloc.lower()
    if "themoviedb.org" in host:
        return "tmdb"
    if "javtiful.com" in host:
        return "javtiful"
    if "supjav.com" in host:
        return "supjav"
    if "projectjav.com" in host:
        raise ValueError("ProjectJAV는 가져오기 자동인식 대상에서 제외되었습니다. MissAV 등 다른 참조주소를 사용해 주세요.")
    if "missav" in host or "123av.com" in host:
        return "missav"
    if extract_movie_code(raw):
        return "javtiful"
    raise ValueError("지원하는 URL은 TMDB, Javtiful, Supjav, MissAV입니다")


def build_movie_import(value, site="auto"):
    site = site if site in IMPORT_SITES else detect_import_site(value)
    if site == "tmdb":
        return build_tmdb_import(value)
    url = resolve_external_input(value, site)
    return build_external_import(url, site)


def int_or_zero(value):
    match = re.search(r"\d+", str(value or ""))
    return int(match.group(0)) if match else 0


def actor_name_from_heading(heading):
    parts = [clean_text(part) for part in re.split(r"/|\|", heading or "") if clean_text(part)]
    latin = [part for part in parts if re.search(r"[A-Za-z]", part)]
    return latin[-1] if latin else (parts[0] if parts else "")


def build_body_size(text):
    body_match = re.search(
        r"신체\s*사이즈\s*[:：]\s*B\s*([0-9]{2,3})\s*/\s*W\s*([0-9]{2,3})\s*/\s*H\s*([0-9]{2,3})",
        text,
        re.I,
    )
    if not body_match:
        body_match = re.search(r"\bB\s*([0-9]{2,3})\s*[-/]\s*W\s*([0-9]{2,3})\s*[-/]\s*H\s*([0-9]{2,3})", text, re.I)
    if not body_match:
        return ""
    bust, waist, hip = body_match.groups()
    cup_match = re.search(r"컵\s*사이즈\s*[:：]\s*([A-Z])\s*컵", text, re.I)
    cup = cup_match.group(1).upper() if cup_match else ""
    return f"B{bust}{f'({cup})' if cup else ''}-W{waist}-H{hip}"


def build_actor_import_fallback(actor_name, url, error_message=""):
    return {
        "name": actor_name or "",
        "age": 0,
        "height_cm": 0,
        "body_size": "",
        "debut_year": 0,
        "representative_image_url": None,
        "image_urls": [],
        "source_url": url or "",
        "aliases": [],
        "import_warning": "remote_fetch_blocked",
        "description": error_message,
    }


def build_avdbs_actor_import(url, actor_name=""):
    try:
        html = fetch_remote_text(url)
    except Exception as exc:
        return build_actor_import_fallback(actor_name, url, str(exc))

    text = clean_text(re.sub(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", " ", html, flags=re.I | re.S))
    heading = first_match([r"<h1[^>]*>(.*?)</h1>"], html) or meta_content(html, "og:title")
    aliases = [clean_text(part) for part in re.split(r"/|\|", heading or "") if clean_text(part)]
    parsed_name = actor_name_from_heading(heading)
    name = clean_text(actor_name) or parsed_name

    age = int_or_zero(first_match([r"생년월일\s*[:：][^\n\r(]*\((\d{1,3})\s*세\)"], text))
    height_cm = int_or_zero(first_match([r"신장\s*[:：]\s*(\d{2,3})\s*cm"], text))
    body_size = build_body_size(text)
    debut_raw = first_match([r"데뷔\s*[:：]\s*(\d{2,4})\s*년"], text)
    debut_year = int_or_zero(debut_raw)
    if 0 < debut_year < 100:
        debut_year += 2000 if debut_year < 70 else 1900

    images = []
    for image in extract_image_candidates(html, url):
        lower = image.lower()
        if "/actor/" not in lower and "og:image" not in lower:
            continue
        if image not in images:
            images.append(image)
    representative = meta_content(html, "og:image") or (images[0] if images else None)
    if representative and representative not in images:
        images.insert(0, representative)

    return {
        "name": name,
        "age": age,
        "height_cm": height_cm,
        "body_size": body_size,
        "debut_year": debut_year,
        "representative_image_url": representative,
        "image_urls": images[:5],
        "source_url": url,
        "aliases": aliases,
    }


def build_actor_import(actor_name, url):
    if not url:
        raise ValueError("배우 참고 URL이 필요합니다")
    host = urlparse(url).netloc.lower()
    if "avdbs.com" in host:
        return build_avdbs_actor_import(url, actor_name)
    raise ValueError("현재 배우 URL 조회는 AVDBS 배우 페이지를 지원합니다")


def slug_from_url(url):
    path = urlparse(url or "").path.strip("/")
    parts = [part for part in path.split("/") if part]
    return parts[-1] if parts else ""


def extract_webtoon_label(text, label):
    labels = [
        "Rank", "Alternative", "Author(s)", "Artist(s)", "Genre(s)", "Type", "Tag(s)",
        "Release", "Status", "SUMMARY", "LATEST MANGA RELEASES", "MANGA DISCUSSION"
    ]
    pattern = re.compile(
        rf"{re.escape(label)}\s+(.+?)(?=\s+(?:{'|'.join(re.escape(item) for item in labels if item != label)})(?:\s|$)|$)",
        re.I | re.S,
    )
    match = pattern.search(text or "")
    return clean_text(match.group(1)) if match else ""


def split_webtoon_terms(value):
    return [clean_text(item) for item in re.split(r",|、", value or "") if clean_text(item)]


def extract_mangadistrict_title(html, text):
    title = first_match([r"<h1[^>]*>(.*?)</h1>"], html)
    if title:
        return title
    title_meta = meta_content(html, "twitter:title") or first_match([r"<title[^>]*>(.*?)</title>"], html)
    return re.sub(r"\s*[–|-]\s*MANGA DISTRICT.*$", "", title_meta or "", flags=re.I).strip()


def extract_mangadistrict_chapters(html, webtoon_id):
    chapters = []
    seen = set()
    pattern = re.compile(
        r"<a\b[^>]*href=[\"']([^\"']*/chapter-(\d+)/?)[\"'][^>]*>(.*?)</a>",
        re.I | re.S,
    )
    for match in pattern.finditer(html or ""):
        href = unescape(match.group(1))
        number = int(match.group(2))
        label = clean_text(match.group(3)) or f"Chapter {number}"
        if href in seen:
            continue
        seen.add(href)
        chapters.append({
            "webtoon_chapter_id": f"{webtoon_id}-{number:03d}",
            "webtoon_id": webtoon_id,
            "chapter_number": number,
            "chapter_url": href,
            "chapter_poster": None,
            "title": label,
        })
    return sorted(chapters, key=lambda item: item["chapter_number"])


def extract_hentai18_title(html):
    title = first_match([r"<h1[^>]*>(.*?)</h1>"], html)
    if title:
        return title
    title_meta = meta_content(html, "og:title") or first_match([r"<title[^>]*>(.*?)</title>"], html)
    title_meta = re.sub(r"^\s*Read\s+", "", title_meta or "", flags=re.I)
    title_meta = re.sub(r"\s*\(Full Chapters\).*$", "", title_meta, flags=re.I)
    title_meta = re.sub(r"\s+English Online\s+-\s+Hentai18.*$", "", title_meta, flags=re.I)
    return clean_text(title_meta)


def extract_hentai18_value(text, label):
    pattern = re.compile(
        rf"{re.escape(label)}\s*:\s*(.+?)(?=\s+(?:Tags|Category|Status|Rank|Bookmark|Posted|Posted by|Share this manga)\s*:|$)",
        re.I | re.S,
    )
    match = pattern.search(text or "")
    return clean_text(match.group(1)) if match else ""


def split_hentai18_terms(value):
    value = clean_text(value)
    if not value:
        return []
    if "," in value or "、" in value:
        return split_webtoon_terms(value)
    return [item for item in value.split(" ") if item]


def extract_hentai18_summary(text, title):
    escaped_title = re.escape(title or "")
    patterns = [
        rf"{escaped_title}\s*:\s*MANHWA HENTAI PLOT SUMMARY & DETAILS\s+(.+?)\s+👉",
        r"MANHWA HENTAI PLOT SUMMARY & DETAILS\s+(.+?)\s+NEIGHBOR",
        r"MANHWA HENTAI PLOT SUMMARY & DETAILS\s+(.+?)\s+ALL CHAPTERS LIST",
    ]
    for pattern in patterns:
        match = re.search(pattern, text or "", re.I | re.S)
        if match:
            summary = clean_text(match.group(1))
            return summary
    description = ""
    desc_match = re.search(r"^(.*?)(?:\s+ALL CHAPTERS LIST|\s+SIMILAR MANHWA SERIES)", text or "", re.I | re.S)
    if desc_match:
        description = clean_text(desc_match.group(1))
    return description


def extract_hentai18_chapters(html, webtoon_id, base_url):
    chapters = []
    seen = set()
    pattern = re.compile(
        r"<a\b[^>]*href=[\"']([^\"']*/read-hentai/[^\"']*chapter-(\d+)[^\"']*)[\"'][^>]*>(.*?)</a>",
        re.I | re.S,
    )
    for match in pattern.finditer(html or ""):
        href = absolute_url(base_url, match.group(1))
        number = int(match.group(2))
        label = clean_text(match.group(3)) or f"Chapter {number}"
        if not href or href in seen:
            continue
        seen.add(href)
        chapters.append({
            "webtoon_chapter_id": f"{webtoon_id}-{number:03d}",
            "webtoon_id": webtoon_id,
            "chapter_number": number,
            "chapter_url": href,
            "chapter_poster": None,
            "title": label,
        })
    return sorted(chapters, key=lambda item: item["chapter_number"])


def build_hentai18_webtoon_import(url):
    html = fetch_remote_text(url)
    text = html_text_lines(html)
    title = extract_hentai18_title(html)
    webtoon_id = slug_from_url(url) or re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    poster = meta_content(html, "og:image") or meta_content(html, "twitter:image") or best_poster_url(extract_image_candidates(html, url))
    rating_match = re.search(r"Average\s+([0-9.]+)\s*/\s*5", text, re.I)
    rating = rating_match.group(1) if rating_match else first_match([r"\b([0-5](?:\.\d)?)\s+Rating\b"], text)
    tag_items = split_hentai18_terms(extract_hentai18_value(text, "Tags"))
    category = extract_hentai18_value(text, "Category")
    status = extract_hentai18_value(text, "Status")
    type_items = split_hentai18_terms(category) or ["Manhwa"]
    genre_items = [item for item in tag_items if item.lower() not in {"hentai"}]
    summary = extract_hentai18_summary(text, title)
    chapters = extract_hentai18_chapters(html, webtoon_id, url)
    return {
        "site": "hentai18",
        "webtoon_id": webtoon_id,
        "title": title,
        "rating": rating,
        "alternative": summary,
        "artist": "",
        "genre": ", ".join(genre_items),
        "type": ", ".join(type_items),
        "tage": tag_items,
        "poster_image": poster,
        "url": url,
        "webtoon_images": [poster] if poster else [],
        "summary": summary,
        "status": status,
        "chapters": chapters,
    }


def extract_imhentai_title(html):
    title = first_match([r"<h1[^>]*>(.*?)</h1>"], html)
    if not title:
        title = meta_content(html, "og:title") or meta_content(html, "twitter:title") or first_match([r"<title[^>]*>(.*?)</title>"], html)
    title = re.sub(r"\s*(?:[|-]\s*)?IMHentai.*$", "", title or "", flags=re.I)
    return clean_text(title)


def extract_imhentai_anchor_terms(html, path_name):
    terms = []
    pattern = re.compile(
        rf"<a\b[^>]*href=[\"'][^\"']*/{re.escape(path_name)}/[^\"']*[\"'][^>]*>(.*?)</a>",
        re.I | re.S,
    )
    for match in pattern.finditer(html or ""):
        term = clean_text(match.group(1))
        term = re.sub(r"\s+\d+$", "", term).strip()
        if term and term not in terms:
            terms.append(term)
    return terms


def extract_imhentai_summary(text, title):
    title = re.escape(title or "")
    patterns = [
        rf"{title}\s+(.+?)\s+(?:Tags|Category|Artist|Language|Pages)\b",
        r"(?:Description|Summary)\s+(.+?)\s+(?:Tags|Category|Artist|Language|Pages)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text or "", re.I | re.S)
        if match:
            return clean_text(match.group(1))
    return ""


def build_imhentai_fallback(url, error=None):
    webtoon_id = slug_from_url(url) or "imhentai-gallery"
    summary = "IMHentai 페이지 직접 조회가 차단되어 URL 기준 최소 정보만 가져왔습니다."
    error_text = clean_text(str(error)) if error else ""
    if error_text:
        summary = f"{summary} ({error_text})"
    return {
        "site": "imhentai",
        "webtoon_id": webtoon_id,
        "title": f"IMHentai Gallery {webtoon_id}",
        "rating": "",
        "alternative": summary,
        "artist": "",
        "genre": "Gallery",
        "type": "Gallery",
        "tage": [],
        "poster_image": "",
        "url": url,
        "webtoon_images": [],
        "summary": summary,
        "chapters": [{
            "webtoon_chapter_id": f"{webtoon_id}-001",
            "webtoon_id": webtoon_id,
            "chapter_number": 1,
            "chapter_url": url,
            "chapter_poster": "",
            "title": "Gallery",
        }],
    }


def build_imhentai_webtoon_import(url):
    try:
        html = fetch_remote_text(url)
    except Exception as error:
        return build_imhentai_fallback(url, error)

    text = html_text_lines(html)
    webtoon_id = slug_from_url(url)
    title = extract_imhentai_title(html) or f"IMHentai Gallery {webtoon_id}"
    candidate_images = [
        image for image in extract_image_candidates(html, url)
        if re.search(r"imhentai", image, re.I)
        and not re.search(r"/images/logo|chrome-extension:", image, re.I)
    ]
    poster = meta_content(html, "og:image") or meta_content(html, "twitter:image") or best_poster_url(candidate_images)
    images = [
        image for image in candidate_images
        if image != poster and not re.search(r"/cover\.", image, re.I)
    ]
    if poster and poster not in images:
        images.insert(0, poster)
    rating = first_match([
        r"(?:Average|Rating)\s*[: ]\s*([0-5](?:\.\d+)?)\s*(?:/|$)",
        r"\b([0-5](?:\.\d+)?)\s*/\s*5\b",
    ], text)
    artist_items = extract_imhentai_anchor_terms(html, "artist")
    group_items = extract_imhentai_anchor_terms(html, "group")
    category_items = extract_imhentai_anchor_terms(html, "category")
    tag_items = extract_imhentai_anchor_terms(html, "tag")
    language_items = extract_imhentai_anchor_terms(html, "language")
    genre_items = []
    for item in category_items + tag_items:
        if item not in genre_items:
            genre_items.append(item)
    summary = extract_imhentai_summary(text, title) or meta_content(html, "description")
    chapter_poster = poster or (images[0] if images else "")
    return {
        "site": "imhentai",
        "webtoon_id": webtoon_id,
        "title": title,
        "rating": rating,
        "alternative": summary,
        "artist": ", ".join(artist_items + group_items),
        "genre": ", ".join(genre_items),
        "type": "Gallery",
        "tage": tag_items + language_items,
        "poster_image": poster,
        "url": url,
        "webtoon_images": images[:6],
        "summary": summary,
        "chapters": [{
            "webtoon_chapter_id": f"{webtoon_id}-001",
            "webtoon_id": webtoon_id,
            "chapter_number": 1,
            "chapter_url": url,
            "chapter_poster": chapter_poster,
            "title": "Gallery",
        }],
    }


def build_mangadistrict_webtoon_import(url):
    html = fetch_remote_text(url)
    text = html_text_lines(html)
    title = extract_mangadistrict_title(html, text)
    webtoon_id = slug_from_url(url) or re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    poster = meta_content(html, "og:image") or meta_content(html, "twitter:image") or best_poster_url(extract_image_candidates(html, url))
    rating_match = re.search(r"Average\s+([0-9.]+)\s*/\s*5", text, re.I)
    rating = rating_match.group(1) if rating_match else first_match([r"\b([0-5](?:\.\d)?)\s+Rating\b"], text)
    alternative = extract_webtoon_label(text, "Alternative")
    artist = extract_webtoon_label(text, "Artist(s)")
    genre_items = split_webtoon_terms(extract_webtoon_label(text, "Genre(s)"))
    type_items = split_webtoon_terms(extract_webtoon_label(text, "Type"))
    tag_items = split_webtoon_terms(extract_webtoon_label(text, "Tag(s)"))
    summary = ""
    summary_match = re.search(r"SUMMARY\s+(.+?)\s+LATEST MANGA RELEASES", text, re.I | re.S)
    if summary_match:
      summary = clean_text(summary_match.group(1))
      if title and summary.lower().startswith(title.lower()):
          summary = clean_text(summary[len(title):])
    release = extract_webtoon_label(text, "Release")
    chapters = extract_mangadistrict_chapters(html, webtoon_id)
    return {
        "site": "mangadistrict",
        "webtoon_id": webtoon_id,
        "title": title,
        "rating": rating,
        "alternative": alternative,
        "artist": artist,
        "genre": ", ".join(genre_items),
        "type": ", ".join(type_items),
        "tage": tag_items,
        "poster_image": poster,
        "url": url,
        "webtoon_images": [poster] if poster else [],
        "summary": summary,
        "release": release,
        "chapters": chapters,
    }


def build_webtoon_import(value, site="auto"):
    url = value.strip()
    if not url.startswith(("http://", "https://")):
        raise ValueError("Webtoon 가져오기는 참조사이트 URL이 필요합니다")
    host = urlparse(url).netloc.lower()
    if site in {"auto", "mangadistrict"} and "mangadistrict.com" in host:
        return build_mangadistrict_webtoon_import(url)
    if site in {"auto", "hentai18"} and "hentai18.net" in host:
        return build_hentai18_webtoon_import(url)
    if site in {"auto", "imhentai"} and "imhentai.xxx" in host:
        return build_imhentai_webtoon_import(url)
    raise ValueError("현재 Webtoon 가져오기는 mangadistrict, hentai18, imhentai URL을 지원합니다")


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
    host = urlparse(url).netloc.lower()
    if "avdbs.com" in host:
        return fetch_avdbs_text(url)
    if "imhentai.xxx" in host:
        req = Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
            "Referer": "https://imhentai.xxx/",
        })
        with urlopen(req, timeout=20, context=ssl._create_unverified_context()) as response:
            return response.read().decode("utf-8", errors="replace")
    req = Request(url, headers={
        "User-Agent": "CineTube Local Importer",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    })
    with urlopen(req, timeout=20) as response:
        return response.read().decode("utf-8", errors="replace")


def fetch_avdbs_text(url):
    parsed = urlparse(url)
    opener = build_opener(HTTPCookieProcessor(CookieJar()))
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    }
    check_url = f"{parsed.scheme}://{parsed.netloc}/check_cookie.php?cb_url={parsed.path}"
    if parsed.query:
        check_url += "%3F" + parsed.query.replace("&", "%26")
    opener.open(Request(check_url, headers=headers), timeout=20).read()
    with opener.open(Request(url, headers=headers), timeout=20) as response:
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
        [PSQL, "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1"],
        env=ENV,
        input=sql,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        stderr = (proc.stderr or "").strip()
        stdout = (proc.stdout or "").strip()
        raise RuntimeError(stderr or stdout or f"psql failed with exit code {proc.returncode}")
    return (proc.stdout or "").strip()


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
            if parsed.path.strip("/") in {"tmdb/import", "metadata/import"}:
                query = parse_qs(parsed.query)
                value = query.get("url", [""])[0] or query.get("q", [""])[0]
                site = query.get("site", ["auto"])[0]
                if not value:
                    raise ValueError("url 또는 q 파라미터가 필요합니다")
                self.send_json(build_movie_import(value, site))
                return
            if parsed.path.strip("/") in {"metadata/actor", "actor/import"}:
                query = parse_qs(parsed.query)
                actor_name = query.get("name", [""])[0]
                value = query.get("url", [""])[0] or query.get("q", [""])[0]
                if not value:
                    raise ValueError("url 또는 q 파라미터가 필요합니다")
                self.send_json(build_actor_import(actor_name, value))
                return
            if parsed.path.strip("/") in {"metadata/webtoon", "webtoon/import"}:
                query = parse_qs(parsed.query)
                value = query.get("url", [""])[0] or query.get("q", [""])[0]
                site = query.get("site", ["auto"])[0]
                if not value:
                    raise ValueError("url 또는 q 파라미터가 필요합니다")
                self.send_json(build_webtoon_import(value, site))
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
        columns = existing_columns(table, [c for c in TABLES[table]["insert"] if c in payload])
        if not columns:
            raise ValueError("empty insert payload")
        values = [f"(json_populate_record(null::public.{table}, {json_literal(payload)}::json)).{c}" for c in columns]
        sql = f"insert into public.{table} ({','.join(columns)}) values ({','.join(values)}) returning *"
        return row_json(table, sql, mutable=True)

    def update_row(self, table, payload, where):
        columns = existing_columns(table, [c for c in TABLES[table]["update"] if c in payload])
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

