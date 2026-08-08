"""로컬 미디어 저장, 썸네일 생성, 외부 이미지 로컬화 계층.

repository를 단방향으로 사용하며 repository는 media를 참조하지 않는다.
"""

import base64
import logging
import mimetypes
import re
from urllib.parse import urlparse
from uuid import uuid4

from . import config, http_client, repository, tables

logger = logging.getLogger("cinetube.media")

try:
    from PIL import Image
except Exception:  # Pillow 미설치 환경에서도 API는 동작해야 한다
    Image = None


class MediaError(RuntimeError):
    """미디어 저장·변환 계층 오류."""


def parse_data_url(value):
    match = re.match(r"^data:([^;,]+)?(?:;[^,]*)?;base64,(.*)$", value or "", re.S)
    if not match:
        raise ValueError("data URL 형식의 이미지가 필요합니다")
    mime_type = match.group(1) or "application/octet-stream"
    return mime_type, base64.b64decode(match.group(2), validate=True)


def safe_media_part(value, fallback="item"):
    value = re.sub(r"[^a-z0-9_-]+", "-", str(value or "").lower()).strip("-")
    return value or fallback


def extension_for_media(mime_type, original_name=""):
    if original_name and "." in original_name:
        ext = original_name.rsplit(".", 1)[-1].lower()
        if re.match(r"^[a-z0-9]{1,8}$", ext):
            return ext
    return (mimetypes.guess_extension(mime_type or "") or ".bin").lstrip(".")


def public_media_url(relative_path):
    return "/" + relative_path.replace("\\", "/")


def resolve_media_path(relative_path):
    """local/media 밖으로 벗어나지 않는 절대 경로를 반환한다."""
    path = config.PROJECT_ROOT / relative_path
    resolved = path.resolve()
    if not str(resolved).startswith(str(config.LOCAL_MEDIA_ROOT.resolve())):
        raise ValueError("invalid media path")
    return path


def write_local_media_file(relative_path, content):
    path = resolve_media_path(relative_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def remove_local_media_file(relative_path):
    """보상 처리용 삭제. 실패해도 원 예외를 덮지 않는다."""
    try:
        path = resolve_media_path(relative_path)
        if path.exists():
            path.unlink()
    except Exception:
        logger.warning("failed to roll back media file %s", relative_path)


def thumbnail_data_url(content):
    if Image is None:
        return ""
    try:
        from io import BytesIO

        with Image.open(BytesIO(content)) as image:
            image.thumbnail(config.THUMBNAIL_MAX_SIZE)
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGB")
            output = BytesIO()
            image.save(output, "WEBP", quality=config.THUMBNAIL_QUALITY, method=6)
            encoded = base64.b64encode(output.getvalue()).decode("ascii")
            return f"data:image/webp;base64,{encoded}"
    except Exception:
        return ""


def save_local_media(payload):
    """data URL 이미지를 local/media에 저장하고 media_assets 레코드를 만든다.

    파일 저장과 DB 등록 중 하나라도 실패하면 이미 쓴 파일을 되돌려
    고아 파일이나 고아 레코드가 남지 않게 한다.
    """
    owner_table = safe_media_part(payload.get("owner_table"), "media")
    owner_field = safe_media_part(payload.get("owner_field"), "image")
    original_name = payload.get("original_name") or "upload"
    mime_type, original_bytes = parse_data_url(payload.get("data_url"))
    extension = extension_for_media(mime_type, original_name)
    media_id = str(uuid4())
    base_dir = f"{config.LOCAL_MEDIA_RELATIVE_ROOT}/{owner_table}/{owner_field}"
    object_path = f"{base_dir}/{media_id}.{extension}"

    written = []
    try:
        write_local_media_file(object_path, original_bytes)
        written.append(object_path)

        thumb_url = None
        thumb_data_url = payload.get("thumb_data_url")
        if thumb_data_url:
            thumb_mime, thumb_bytes = parse_data_url(thumb_data_url)
            thumb_ext = extension_for_media(thumb_mime, "thumb.webp")
            thumb_path = f"{base_dir}/{media_id}.thumb.{thumb_ext}"
            write_local_media_file(thumb_path, thumb_bytes)
            written.append(thumb_path)
            thumb_url = public_media_url(thumb_path)

        asset_payload = {
            "bucket_id": "local-file",
            "object_path": object_path,
            "public_url": public_media_url(object_path),
            "thumb_url": thumb_url or public_media_url(object_path),
            "original_name": original_name,
            "mime_type": mime_type,
            "size_bytes": len(original_bytes),
            "owner_table": payload.get("owner_table") or owner_table,
            "owner_field": payload.get("owner_field") or owner_field,
            "owner_id": payload.get("owner_id"),
            "sort_order": payload.get("sort_order", 0),
        }
        return repository.insert_row_for_table("media_assets", asset_payload)
    except Exception:
        for relative_path in written:
            remove_local_media_file(relative_path)
        raise


def import_remote_media(payload):
    """외부 이미지 URL을 내려받아 로컬 미디어로 저장한다."""
    url = payload.get("url") or ""
    if not url.startswith(("http://", "https://")):
        raise ValueError("http 또는 https 이미지 URL이 필요합니다")
    content, mime_type = http_client.fetch_remote_image(url)
    if not mime_type.startswith("image/"):
        raise ValueError(f"이미지 응답이 아닙니다: {mime_type}")
    original_name = urlparse(url).path.rsplit("/", 1)[-1] or "remote-image"
    data_url = f"data:{mime_type};base64,{base64.b64encode(content).decode('ascii')}"
    next_payload = {
        **payload,
        "data_url": data_url,
        "thumb_data_url": thumbnail_data_url(content),
        "original_name": original_name,
        "mime_type": mime_type,
        "size_bytes": len(content),
    }
    return save_local_media(next_payload)


def localize_remote_images(table, rows):
    """등록·수정된 행의 외부 이미지 URL을 로컬 미디어로 치환한다."""
    fields = tables.IMAGE_FIELDS.get(table, [])
    if not fields or not rows:
        return rows
    pk = tables.TABLES[table]["pk"]
    for row in rows:
        owner_id = row.get(pk)
        updates = {}
        for url_field, asset_field, owner_field in fields:
            value = row.get(url_field)
            if not isinstance(value, str) or not value.startswith(("http://", "https://")):
                continue
            if row.get(asset_field):
                continue
            try:
                asset_rows = import_remote_media({
                    "url": value,
                    "owner_table": table,
                    "owner_field": owner_field,
                    "owner_id": str(owner_id) if owner_id is not None else None,
                    "sort_order": 0,
                })
            except http_client.RemoteFetchError as exc:
                # 외부 사이트 장애는 DB 오류와 분리해 기록하고 원본 URL을 유지한다.
                logger.warning("remote image localize skipped (%s): %s", value, exc)
                continue
            asset = asset_rows[0] if isinstance(asset_rows, list) and asset_rows else asset_rows
            if not asset:
                continue
            updates[url_field] = asset.get("public_url")
            updates[asset_field] = asset.get("id")
            row[url_field] = asset.get("public_url")
            row[asset_field] = asset.get("id")
        if updates and owner_id is not None:
            repository.update_columns(table, owner_id, updates)
    return rows
