"""웹툰 파서 (MangaDistrict, MangaDNA, Hentai18, IMHentai)."""

import re
from html import unescape
from urllib.parse import urlparse

from .. import http_client
from .common import (
    absolute_url,
    best_poster_url,
    clean_text,
    extract_image_candidates,
    first_match,
    html_text_lines,
    meta_content,
    slug_from_url,
    split_terms,
)

WEBTOON_LABELS = [
    "Rank", "Alternative", "Alternative(s)", "Author(s)", "Artist(s)", "Genre(s)", "Type", "Tag(s)",
    "Release", "Status", "SUMMARY", "LATEST MANGA RELEASES", "MANGA DISCUSSION",
]


def split_webtoon_terms(value):
    return split_terms(value)


def extract_webtoon_label(text, label):
    labels = WEBTOON_LABELS

    def normalize_label(value):
        return re.sub(r"[\s:]+", " ", value or "").strip().lower()

    target_labels = [label]
    if label == "Alternative":
        target_labels.append("Alternative(s)")
    target_names = {normalize_label(item) for item in target_labels}
    stop_names = {normalize_label(item) for item in labels}
    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]

    def collect_value(start_index, initial_value=""):
        values = [clean_text(initial_value)] if clean_text(initial_value) else []
        for next_line in lines[start_index:]:
            if normalize_label(next_line) in stop_names:
                break
            values.append(clean_text(next_line))
        return clean_text(" ".join(item for item in values if item))

    for index, line in enumerate(lines):
        normalized = normalize_label(line)
        for target in target_labels:
            prefix = target + ":"
            if line.lower().startswith(prefix.lower()):
                return collect_value(index + 1, line[len(prefix):])
        if normalized not in target_names:
            continue
        return collect_value(index + 1)

    label_pattern = r"Alternative(?:\(s\))?" if label == "Alternative" else re.escape(label)
    pattern = re.compile(
        rf"{label_pattern}\s*:?\s+(.+?)(?=\s+(?:{'|'.join(re.escape(item) for item in labels if item != label)})(?:\s|:|$)|$)",
        re.I | re.S,
    )
    match = pattern.search(text or "")
    return clean_text(match.group(1)) if match else ""


# --- MangaDistrict ---------------------------------------------------------

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


def build_mangadistrict_webtoon_import(url):
    html = http_client.fetch_remote_text(url)
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


# --- MangaDNA --------------------------------------------------------------

def extract_mangadna_title(html):
    title = first_match([r"<h1[^>]*>(.*?)</h1>"], html)
    if title:
        return title
    title_meta = meta_content(html, "og:title") or meta_content(html, "twitter:title") or first_match([r"<title[^>]*>(.*?)</title>"], html)
    title_meta = re.sub(r"^\s*Read\s+", "", title_meta or "", flags=re.I)
    title_meta = re.sub(r"\s+(?:Manhwa\s+)?at\s+MangaDNA.*$", "", title_meta, flags=re.I)
    return clean_text(title_meta)


def extract_mangadna_chapters(html, webtoon_id, base_url):
    chapters = []
    seen = set()
    escaped_id = re.escape(webtoon_id)
    pattern = re.compile(
        rf"<a\b[^>]*href=[\"']([^\"']*/manga/{escaped_id}/chapter-(\d+(?:\.\d+)?)/?)[\"'][^>]*>(.*?)</a>",
        re.I | re.S,
    )
    for match in pattern.finditer(html or ""):
        href = absolute_url(base_url, match.group(1))
        raw_number = match.group(2)
        label = clean_text(match.group(3)) or f"Chapter {raw_number}"
        if not href or href in seen:
            continue
        seen.add(href)
        number = int(float(raw_number))
        chapter_id = raw_number.replace(".", "-")
        chapters.append({
            "webtoon_chapter_id": f"{webtoon_id}-{chapter_id.zfill(3)}",
            "webtoon_id": webtoon_id,
            "chapter_number": number,
            "chapter_url": href,
            "chapter_poster": None,
            "title": label,
        })
    return sorted(chapters, key=lambda item: item["chapter_number"])


def build_mangadna_webtoon_import(url):
    html = http_client.fetch_remote_text(url)
    text = html_text_lines(html)
    title = extract_mangadna_title(html)
    webtoon_id = slug_from_url(url) or re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    poster = meta_content(html, "og:image") or meta_content(html, "twitter:image") or best_poster_url(extract_image_candidates(html, url))
    rating_match = re.search(r"Average\s+([0-9.]+)\s*/\s*5", text, re.I)
    rating = rating_match.group(1) if rating_match else first_match([r"\b([0-5](?:\.\d)?)\s+Rating\b"], text)
    alternative = extract_webtoon_label(text, "Alternative")
    author = extract_webtoon_label(text, "Author(s)")
    artist = extract_webtoon_label(text, "Artist(s)") or author
    genre_items = split_webtoon_terms(extract_webtoon_label(text, "Genre(s)"))
    type_items = split_webtoon_terms(extract_webtoon_label(text, "Type"))
    tag_items = split_webtoon_terms(extract_webtoon_label(text, "Tag(s)"))
    summary = meta_content(html, "description")
    summary_match = re.search(r"SUMMARY\s+(.+?)\s+LATEST MANGA RELEASES", text, re.I | re.S)
    if summary_match:
        summary = clean_text(summary_match.group(1))
    release = extract_webtoon_label(text, "Release")
    chapters = extract_mangadna_chapters(html, webtoon_id, url)
    return {
        "site": "mangadna",
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


# --- Hentai18 --------------------------------------------------------------

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
    html = http_client.fetch_remote_text(url)
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


# --- IMHentai --------------------------------------------------------------

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
        html = http_client.fetch_remote_text(url)
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


SITE_BUILDERS = (
    ("mangadistrict", "mangadistrict.com", build_mangadistrict_webtoon_import),
    ("mangadna", "mangadna.com", build_mangadna_webtoon_import),
    ("hentai18", "hentai18.net", build_hentai18_webtoon_import),
    ("imhentai", "imhentai.xxx", build_imhentai_webtoon_import),
)


def build_webtoon_import(value, site="auto"):
    url = value.strip()
    if not url.startswith(("http://", "https://")):
        raise ValueError("Webtoon 가져오기는 참조사이트 URL이 필요합니다")
    host = urlparse(url).netloc.lower()
    for name, domain, builder in SITE_BUILDERS:
        if site in {"auto", name} and domain in host:
            return builder(url)
    raise ValueError("현재 Webtoon 가져오기는 mangadistrict, mangadna, hentai18, imhentai URL을 지원합니다")
