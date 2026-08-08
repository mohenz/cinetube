"""배우 정보 파서 (AVDBS)."""

import re
from urllib.parse import urlparse

from .. import http_client
from .common import (
    clean_text,
    extract_image_candidates,
    first_match,
    int_or_zero,
    meta_content,
    strip_scripts,
)


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
        html = http_client.fetch_remote_text(url)
    except Exception as exc:
        return build_actor_import_fallback(actor_name, url, str(exc))

    text = strip_scripts(html)
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
