"""파서 공통 HTML/URL 유틸리티.

네트워크와 DB에 의존하지 않는 순수 함수만 둔다.
"""

import json
import re
from html import unescape
from urllib.parse import urlparse


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


def strip_scripts(html):
    """script/style을 제거한 한 줄 텍스트."""
    return clean_text(
        re.sub(r"<script[^>]*>.*?</script>|<style[^>]*>.*?</style>", " ", html or "", flags=re.I | re.S)
    )


def absolute_url(base_url, value):
    if not value:
        return None
    value = unescape(value).strip()
    if value.lower().startswith("data:"):
        return None
    if value.startswith("//"):
        return "https:" + value
    if value.startswith("http://") or value.startswith("https://"):
        return value
    parsed = urlparse(base_url)
    if value.startswith("/"):
        return f"{parsed.scheme}://{parsed.netloc}{value}"
    root = base_url.rsplit("/", 1)[0]
    return f"{root}/{value}"


def meta_contents(html, key):
    pattern = re.compile(
        rf"<meta[^>]+(?:property|name)=[\"']{re.escape(key)}[\"'][^>]+content=[\"']([^\"']*)[\"'][^>]*>",
        re.I,
    )
    return [unescape(match.group(1)) for match in pattern.finditer(html or "")]


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


def extract_movie_code(value):
    match = re.search(r"\b([A-Z]{2,10}-\d{2,6})\b", value or "", re.I)
    return match.group(1).upper() if match else ""


def code_slug(value):
    code = extract_movie_code(value)
    return code.lower() if code else re.sub(r"[^a-z0-9-]+", "-", (value or "").lower()).strip("-")


def slug_from_url(url):
    path = urlparse(url or "").path.strip("/")
    parts = [part for part in path.split("/") if part]
    return parts[-1] if parts else ""


def clean_av_title(title, movie_code):
    title = clean_text(title)
    title = re.sub(r"\s*[-|]\s*(Javtiful|Supjav|MissAV|123AV).*$", "", title, flags=re.I)
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


def extract_label_value(text, label):
    pattern = re.compile(rf"{re.escape(label)}\s+([^\n\r]+)", re.I)
    match = pattern.search(text or "")
    return clean_text(match.group(1)) if match else ""


def extract_colon_value(text, label):
    pattern = re.compile(rf"{re.escape(label)}\s*[:：]\s*([^\n\r]+)", re.I)
    match = pattern.search(text or "")
    return clean_text(match.group(1)) if match else ""


def int_or_zero(value):
    match = re.search(r"\d+", str(value or ""))
    return int(match.group(0)) if match else 0


def split_terms(value):
    return [clean_text(item) for item in re.split(r",|、", value or "") if clean_text(item)]
