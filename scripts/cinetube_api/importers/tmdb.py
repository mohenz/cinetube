"""TMDB API 및 공개 페이지 fallback 파서."""

import os
import re
from html import unescape

from .. import http_client
from .common import clean_text, meta_contents, strip_scripts

TMDB_IMAGE_BASE = "https://media.themoviedb.org/t/p"
TMDB_API_KEY = os.getenv("TMDB_API_KEY", "1ec5e91d2958623b1d6346bec69ab4a8")


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
        f"?api_key={TMDB_API_KEY}"
        f"&language={language}&append_to_response=credits,images"
        f"&include_image_language=ko,en,null"
    )
    return http_client.fetch_json(api_url)


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


def extract_tmdb_images_from_html(html, title):
    images = []
    img_pattern = re.compile(r"<img[^>]+>", re.I)
    attr_pattern = re.compile(r"(src|data-src|alt)=[\"']([^\"']*)[\"']", re.I)
    for tag in img_pattern.finditer(html or ""):
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


def build_tmdb_import_from_page(url):
    movie_id = extract_tmdb_id(url)
    html = http_client.fetch_remote_text(url)
    title = (meta_contents(html, "og:title") or [""])[0]
    description = (meta_contents(html, "description") or meta_contents(html, "og:description") or [""])[0]
    og_images = meta_contents(html, "og:image")
    text = strip_scripts(html)
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
            re.sub(r"^and\s+", "", clean_text(item).strip(" , "), flags=re.I)
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
