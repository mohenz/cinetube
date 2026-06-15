import argparse
import base64
import hashlib
import io
import json
import mimetypes
import os
import re
from pathlib import Path

import psycopg

try:
    from PIL import Image
except Exception:
    Image = None


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MEDIA_ROOT = PROJECT_ROOT / "local" / "media"
DATA_URL_RE = re.compile(r"^data:([^;,]+)?(?:;[^,]*)?;base64,(.*)$", re.S)

SINGLE_FIELDS = {
    "movies": ("id", ["poster_url", "capture_url", "snapshot_url"]),
    "categories": ("category_code", ["representative_image_url"]),
    "actors": ("id", ["representative_image_url"]),
    "gallery_images": ("id", ["image_url"]),
    "webtoons": ("id", ["poster_image"]),
    "webtoon_chapters": ("id", ["chapter_poster"]),
    "media_assets": ("id", ["public_url"]),
}

ARRAY_FIELDS = {
    "actors": ("id", ["image_urls"]),
    "webtoons": ("id", ["webtoon_images"]),
}


def connect():
    database_url = os.getenv("DATABASE_URL", "")
    if database_url:
        return psycopg.connect(database_url, autocommit=False)
    return psycopg.connect(
        host=os.getenv("PGHOST", "127.0.0.1"),
        port=os.getenv("PGPORT", "54322"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", ""),
        dbname=os.getenv("PGDATABASE", "cinetube"),
        autocommit=False,
    )


def parse_data_url(value):
    match = DATA_URL_RE.match(value or "")
    if not match:
        return None
    mime_type = match.group(1) or "application/octet-stream"
    return mime_type, base64.b64decode(match.group(2), validate=True)


def extension_for(mime_type):
    return (mimetypes.guess_extension(mime_type or "") or ".bin").lstrip(".")


def public_url(path):
    return "/" + path.relative_to(PROJECT_ROOT).as_posix()


def thumbnail_bytes(content, max_size=300):
    if Image is None:
        return None
    with Image.open(io.BytesIO(content)) as image:
        image.thumbnail((max_size, max_size))
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGB")
        output = io.BytesIO()
        image.save(output, "WEBP", quality=78, method=6)
        return output.getvalue()


def write_image(table, field, key, value):
    parsed = parse_data_url(value)
    if not parsed:
        return None
    mime_type, content = parsed
    digest = hashlib.sha256(content).hexdigest()[:24]
    directory = MEDIA_ROOT / "migrated" / table / field
    directory.mkdir(parents=True, exist_ok=True)
    original_path = directory / f"{key}-{digest}.{extension_for(mime_type)}"
    original_path.write_bytes(content)
    thumb_path = None
    thumb = thumbnail_bytes(content)
    if thumb:
        thumb_path = directory / f"{key}-{digest}.thumb.webp"
        thumb_path.write_bytes(thumb)
    return {
        "public_url": public_url(original_path),
        "thumb_url": public_url(thumb_path) if thumb_path else public_url(original_path),
        "bytes": len(content),
    }


def scan_single(cur):
    items = []
    for table, (pk, fields) in SINGLE_FIELDS.items():
        columns = ", ".join([pk, *fields])
        cur.execute(f"select {columns} from public.{table};")
        for row in cur.fetchall():
            key = str(row[0])
            for index, field in enumerate(fields, start=1):
                value = row[index]
                if isinstance(value, str) and parse_data_url(value):
                    items.append({"kind": "single", "table": table, "pk": pk, "key": key, "field": field, "value": value})
    return items


def scan_arrays(cur):
    items = []
    for table, (pk, fields) in ARRAY_FIELDS.items():
        columns = ", ".join([pk, *fields])
        cur.execute(f"select {columns} from public.{table};")
        for row in cur.fetchall():
            key = str(row[0])
            for index, field in enumerate(fields, start=1):
                values = row[index] or []
                for array_index, value in enumerate(values):
                    if isinstance(value, str) and parse_data_url(value):
                        items.append({
                            "kind": "array",
                            "table": table,
                            "pk": pk,
                            "key": key,
                            "field": field,
                            "array_index": array_index,
                            "value": value,
                            "values": list(values),
                        })
    return items


def apply_item(cur, item):
    result = write_image(item["table"], item["field"], item["key"], item["value"])
    if not result:
        return None
    if item["kind"] == "single":
        cur.execute(
            f"update public.{item['table']} set {item['field']} = %s where {item['pk']} = %s",
            (result["public_url"], item["key"]),
        )
        if item["table"] == "media_assets" and item["field"] == "public_url":
            cur.execute(
                "update public.media_assets set thumb_url = %s where id = %s",
                (result["thumb_url"], item["key"]),
            )
    else:
        values = item["values"]
        values[item["array_index"]] = result["public_url"]
        cur.execute(
            f"update public.{item['table']} set {item['field']} = %s where {item['pk']} = %s",
            (values, item["key"]),
        )
    return result


def ensure_schema(cur):
    cur.execute("alter table public.media_assets add column if not exists thumb_url text;")


def main():
    parser = argparse.ArgumentParser(description="Migrate inline CineTube data URL images to local files.")
    parser.add_argument("--apply", action="store_true", help="Write files and update DB. Default is dry-run.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable summary.")
    args = parser.parse_args()

    with connect() as conn:
        with conn.cursor() as cur:
            items = [*scan_single(cur), *scan_arrays(cur)]
            summary = {
                "mode": "apply" if args.apply else "dry-run",
                "items": len(items),
                "by_table": {},
                "pillow_available": Image is not None,
            }
            for item in items:
                summary["by_table"][item["table"]] = summary["by_table"].get(item["table"], 0) + 1
            if args.apply:
                ensure_schema(cur)
                migrated = 0
                bytes_written = 0
                for item in items:
                    result = apply_item(cur, item)
                    if result:
                        migrated += 1
                        bytes_written += result["bytes"]
                summary["migrated"] = migrated
                summary["bytes_written"] = bytes_written
                conn.commit()
            else:
                conn.rollback()

    if args.json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    else:
        print(f"mode: {summary['mode']}")
        print(f"inline image fields: {summary['items']}")
        print(f"pillow_available: {summary['pillow_available']}")
        for table, count in sorted(summary["by_table"].items()):
            print(f"{table}: {count}")
        if args.apply:
            print(f"migrated: {summary['migrated']}")
            print(f"bytes_written: {summary['bytes_written']}")


if __name__ == "__main__":
    main()
