"""media.py 저장 경로·확장자·보상 처리 단위테스트."""

import base64
import unittest
from pathlib import Path
from unittest import mock

from cinetube_api import config, media

PNG_1PX = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


class DataUrlTest(unittest.TestCase):
    def test_parse_data_url(self):
        mime, content = media.parse_data_url("data:image/png;base64," + base64.b64encode(PNG_1PX).decode())
        self.assertEqual(mime, "image/png")
        self.assertEqual(content, PNG_1PX)

    def test_parse_data_url_default_mime(self):
        mime, _ = media.parse_data_url("data:;base64,QUJD")
        self.assertEqual(mime, "application/octet-stream")

    def test_parse_data_url_rejects_plain_url(self):
        with self.assertRaises(ValueError):
            media.parse_data_url("https://example.com/a.png")


class SafePartTest(unittest.TestCase):
    def test_safe_media_part_normalizes(self):
        self.assertEqual(media.safe_media_part("Gallery Images!"), "gallery-images")

    def test_safe_media_part_fallback(self):
        self.assertEqual(media.safe_media_part("...", "media"), "media")

    def test_extension_from_original_name(self):
        self.assertEqual(media.extension_for_media("image/png", "photo.JPG"), "jpg")

    def test_extension_from_mime(self):
        self.assertEqual(media.extension_for_media("image/png", "noext"), "png")

    def test_extension_unknown_mime(self):
        self.assertEqual(media.extension_for_media("application/x-unknown-zzz", ""), "bin")

    def test_public_media_url_uses_forward_slash(self):
        self.assertEqual(media.public_media_url("local\\media\\a\\b.png"), "/local/media/a/b.png")


class SafePathTest(unittest.TestCase):
    def test_allows_path_inside_media_root(self):
        path = media.resolve_media_path("local/media/movies/poster/a.png")
        self.assertTrue(str(Path(path).resolve()).startswith(str(config.LOCAL_MEDIA_ROOT.resolve())))

    def test_rejects_traversal(self):
        with self.assertRaises(ValueError):
            media.resolve_media_path("local/media/../../secrets.txt")

    def test_rejects_outside_root(self):
        with self.assertRaises(ValueError):
            media.resolve_media_path("assets/js/app.js")


class SaveLocalMediaTest(unittest.TestCase):
    def setUp(self):
        self.written = {}
        self.removed = []
        self.addCleanup(mock.patch.stopall)
        mock.patch.object(
            media, "write_local_media_file",
            side_effect=lambda path, content: self.written.__setitem__(path, content),
        ).start()
        mock.patch.object(
            media, "remove_local_media_file",
            side_effect=self.removed.append,
        ).start()

    def test_saves_original_and_thumbnail_and_inserts_asset(self):
        inserted = {}

        def fake_insert(table, payload):
            inserted["table"] = table
            inserted["payload"] = payload
            return [{"id": "asset-1", **payload}]

        with mock.patch.object(media.repository, "insert_row_for_table", side_effect=fake_insert):
            rows = media.save_local_media({
                "data_url": "data:image/png;base64," + base64.b64encode(PNG_1PX).decode(),
                "thumb_data_url": "data:image/webp;base64,UklGRg==",
                "owner_table": "movies",
                "owner_field": "poster",
                "owner_id": "42",
                "original_name": "poster.png",
            })

        self.assertEqual(inserted["table"], "media_assets")
        payload = inserted["payload"]
        self.assertEqual(payload["bucket_id"], "local-file")
        self.assertTrue(payload["object_path"].startswith("local/media/movies/poster/"))
        self.assertTrue(payload["object_path"].endswith(".png"))
        self.assertTrue(payload["public_url"].startswith("/local/media/movies/poster/"))
        self.assertIn(".thumb.webp", payload["thumb_url"])
        self.assertEqual(payload["size_bytes"], len(PNG_1PX))
        self.assertEqual(payload["owner_id"], "42")
        self.assertEqual(len(self.written), 2)
        self.assertEqual(rows[0]["id"], "asset-1")

    def test_thumb_url_defaults_to_original(self):
        with mock.patch.object(media.repository, "insert_row_for_table", side_effect=lambda t, p: [p]):
            rows = media.save_local_media({
                "data_url": "data:image/png;base64," + base64.b64encode(PNG_1PX).decode(),
                "owner_table": "gallery_images",
                "owner_field": "image",
            })
        self.assertEqual(rows[0]["thumb_url"], rows[0]["public_url"])

    def test_db_failure_rolls_back_written_files(self):
        with mock.patch.object(media.repository, "insert_row_for_table", side_effect=RuntimeError("db down")):
            with self.assertRaises(RuntimeError):
                media.save_local_media({
                    "data_url": "data:image/png;base64," + base64.b64encode(PNG_1PX).decode(),
                    "thumb_data_url": "data:image/webp;base64,UklGRg==",
                    "owner_table": "movies",
                    "owner_field": "poster",
                })
        self.assertEqual(len(self.removed), 2)
        self.assertEqual(sorted(self.removed), sorted(self.written.keys()))


class ImportRemoteMediaTest(unittest.TestCase):
    def test_rejects_non_http_url(self):
        with self.assertRaises(ValueError):
            media.import_remote_media({"url": "ftp://x/y.png"})

    def test_rejects_non_image_response(self):
        with mock.patch.object(media.http_client, "fetch_remote_image", return_value=(b"<html>", "text/html")):
            with self.assertRaises(ValueError):
                media.import_remote_media({"url": "https://x.example/a.png"})

    def test_builds_data_url_and_original_name(self):
        captured = {}
        with mock.patch.object(media.http_client, "fetch_remote_image", return_value=(PNG_1PX, "image/png")), \
             mock.patch.object(media, "thumbnail_data_url", return_value=""), \
             mock.patch.object(media, "save_local_media", side_effect=lambda p: captured.update(p) or [p]):
            media.import_remote_media({"url": "https://x.example/dir/photo.png?size=1", "owner_table": "actors"})
        self.assertEqual(captured["original_name"], "photo.png")
        self.assertEqual(captured["mime_type"], "image/png")
        self.assertEqual(captured["size_bytes"], len(PNG_1PX))
        self.assertTrue(captured["data_url"].startswith("data:image/png;base64,"))


class LocalizeRemoteImagesTest(unittest.TestCase):
    def test_replaces_remote_url_and_persists_asset_id(self):
        updates = {}
        rows = [{"id": 7, "poster_url": "https://cdn.example/p.jpg", "poster_asset_id": None}]
        with mock.patch.object(
            media, "import_remote_media",
            return_value=[{"id": "asset-9", "public_url": "/local/media/movies/poster/x.jpg"}],
        ), mock.patch.object(
            media.repository, "update_columns",
            side_effect=lambda table, pk, values: updates.update({"table": table, "pk": pk, **values}),
        ):
            result = media.localize_remote_images("movies", rows)

        self.assertEqual(result[0]["poster_url"], "/local/media/movies/poster/x.jpg")
        self.assertEqual(result[0]["poster_asset_id"], "asset-9")
        self.assertEqual(updates["table"], "movies")
        self.assertEqual(updates["pk"], 7)

    def test_skips_already_local_and_existing_assets(self):
        rows = [{"id": 1, "poster_url": "/local/media/a.jpg", "poster_asset_id": None,
                 "capture_url": "https://cdn.example/c.jpg", "capture_asset_id": "existing"}]
        with mock.patch.object(media, "import_remote_media", side_effect=AssertionError("must not download")):
            media.localize_remote_images("movies", rows)

    def test_table_without_image_fields_is_untouched(self):
        rows = [{"id": 1}]
        self.assertIs(media.localize_remote_images("rating_grades", rows), rows)

    def test_remote_failure_keeps_original_url(self):
        rows = [{"id": 3, "image_url": "https://cdn.example/g.jpg", "image_asset_id": None}]
        with mock.patch.object(
            media, "import_remote_media",
            side_effect=media.http_client.RemoteFetchError("403 Forbidden", "https://cdn.example/g.jpg"),
        ), mock.patch.object(media.repository, "update_columns", side_effect=AssertionError("no update")):
            result = media.localize_remote_images("gallery_images", rows)
        self.assertEqual(result[0]["image_url"], "https://cdn.example/g.jpg")
        self.assertIsNone(result[0]["image_asset_id"])


if __name__ == "__main__":
    unittest.main()
