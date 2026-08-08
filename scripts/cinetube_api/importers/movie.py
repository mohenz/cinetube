"""영화 계열 외부 사이트 파서 (Javtiful, Supjav, ProjectJAV, 123AV/MissAV).

각 함수는 표준화된 dict만 반환하며 DB 저장을 수행하지 않는다.
"""

import re
from html import unescape
from urllib.parse import parse_qs, unquote, urlparse

from .. import http_client
from ..tables import IMPORT_SITES
from .common import (
    absolute_url,
    best_poster_url,
    clean_av_title,
    clean_text,
    code_slug,
    extract_colon_value,
    extract_image_candidates,
    extract_label_value,
    extract_movie_code,
    first_match,
    html_text_lines,
    link_texts,
    meta_content,
    meta_contents,
    strip_scripts,
    title_from_url_slug,
)
from .tmdb import build_tmdb_import


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


def build_external_import(url, site):
    if site == "projectjav":
        return build_projectjav_import(url)
    if site == "missav":
        return build_missav_import(url)
    try:
        html = http_client.fetch_remote_text(url)
    except Exception as exc:
        return build_external_import_fallback(url, site, str(exc))
    title = meta_content(html, "og:title") or first_match([r"<title[^>]*>(.*?)</title>"], html) or ""
    description = meta_content(html, "description") or meta_content(html, "og:description") or ""
    text = strip_scripts(html)
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
        html = http_client.fetch_remote_text(url)
    except Exception as exc:
        return projectjav_fallback_from_url(url, str(exc))
    text = strip_scripts(html)
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


def normalize_missav_url(value):
    value = (value or "").strip()
    if not value.startswith(("http://", "https://")):
        return value
    parsed = urlparse(value)
    host = parsed.netloc.lower()
    if "missav" not in host and not host.endswith("123av.com"):
        return value
    path = parsed.path or "/"
    query = f"?{parsed.query}" if parsed.query else ""
    fragment = f"#{parsed.fragment}" if parsed.fragment else ""
    return f"https://123av.com{path}{query}{fragment}"


def build_missav_fallback(url, error_message=""):
    normalized_url = normalize_missav_url(url)
    movie_code = extract_movie_code(normalized_url)
    title = title_from_url_slug(normalized_url, movie_code) or movie_code or "123AV Movie"
    description = "123AV 페이지 직접 조회가 차단되어 URL 구조 기준 최소 정보를 가져왔습니다."
    if error_message:
        description = f"{description} {clean_text(error_message)}"
    description = description.strip()
    return {
        "title": title,
        "movie_code": movie_code or code_slug(normalized_url).upper(),
        "category_code": "missav",
        "category_name": "123AV",
        "actor_names": [],
        "actor_profiles": [],
        "director_names": [],
        "keywords": [item for item in ["123AV", movie_code] if item],
        "rating_grade": "B+",
        "video_url": normalized_url,
        "source_url": normalized_url,
        "description": description,
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


def build_missav_import(url):
    url = normalize_missav_url(url)
    try:
        html = http_client.fetch_remote_text(url)
    except Exception as exc:
        return build_missav_fallback(url, str(exc))
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
        "category_name": "123AV",
        "actor_names": actor_names[:4],
        "actor_profiles": [{"name": name, "profile_url": None} for name in actor_names[:4]],
        "director_names": [],
        "keywords": [item for item in ["123AV", movie_code, *actor_names[:2], *genres[:4], *tags[:2]] if item],
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
    html = http_client.fetch_remote_text(search_url)
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
    if site == "missav":
        value = normalize_missav_url(value)
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
        return f"https://123av.com/ko/v/{code.lower()}"
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
        raise ValueError("ProjectJAV는 가져오기 자동인식 대상에서 제외되었습니다. 123AV 등 다른 참조주소를 사용해 주세요.")
    if "missav" in host or host.endswith("123av.com"):
        return "missav"
    if extract_movie_code(raw):
        return "javtiful"
    raise ValueError("지원하는 URL은 TMDB, Javtiful, Supjav, 123AV입니다")


def build_movie_import(value, site="auto"):
    site = site if site in IMPORT_SITES else detect_import_site(value)
    if site == "tmdb":
        return build_tmdb_import(value)
    url = resolve_external_input(value, site)
    return build_external_import(url, site)
