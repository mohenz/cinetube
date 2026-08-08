"""http_client.py 프로파일·크기 제한·오류 표준화 단위테스트."""

import io
import unittest
from unittest import mock

from cinetube_api import config, http_client


class FakeResponse(io.BytesIO):
    def __init__(self, content, content_type="text/html"):
        super().__init__(content)
        self._content_type = content_type

    class _Headers:
        def __init__(self, content_type):
            self._content_type = content_type

        def get_content_type(self):
            return self._content_type

    @property
    def headers(self):
        return self._Headers(self._content_type)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()
        return False


class ProfileTest(unittest.TestCase):
    def test_default_profile_uses_importer_ua(self):
        profile = http_client.profile_for("https://javtiful.com/x")
        self.assertEqual(profile["headers"]["User-Agent"], http_client.IMPORTER_UA)
        self.assertFalse(profile["insecure_ssl"])

    def test_imhentai_profile(self):
        profile = http_client.profile_for("https://imhentai.xxx/gallery/1/")
        self.assertEqual(profile["headers"]["Referer"], "https://imhentai.xxx/")
        self.assertTrue(profile["insecure_ssl"])

    def test_missav_and_123av_share_referer(self):
        self.assertEqual(
            http_client.profile_for("https://missav.com/a")["headers"]["Referer"],
            "https://123av.com/",
        )
        self.assertEqual(
            http_client.profile_for("https://123av.com/a")["headers"]["Referer"],
            "https://123av.com/",
        )

    def test_mangadna_profile(self):
        self.assertEqual(
            http_client.profile_for("https://mangadna.com/manga/x")["headers"]["Referer"],
            "https://mangadna.com/",
        )


class FetchTest(unittest.TestCase):
    def test_fetch_text_decodes_utf8(self):
        with mock.patch.object(http_client, "urlopen", return_value=FakeResponse("한글".encode("utf-8"))):
            self.assertEqual(http_client.fetch_text("https://x.example/a"), "한글")

    def test_fetch_applies_timeout_from_config(self):
        with mock.patch.object(http_client, "urlopen", return_value=FakeResponse(b"ok")) as opener:
            http_client.fetch_text("https://x.example/a")
        self.assertEqual(opener.call_args.kwargs["timeout"], config.HTTP_TIMEOUT)

    def test_fetch_sends_profile_headers(self):
        with mock.patch.object(http_client, "urlopen", return_value=FakeResponse(b"ok")) as opener:
            http_client.fetch_text("https://imhentai.xxx/gallery/1/")
        request = opener.call_args[0][0]
        self.assertEqual(request.get_header("Referer"), "https://imhentai.xxx/")

    def test_size_limit_raises(self):
        with mock.patch.object(http_client, "urlopen", return_value=FakeResponse(b"x" * 100)):
            with self.assertRaises(http_client.RemoteResponseTooLarge):
                http_client.fetch_text("https://x.example/a", max_bytes=10)

    def test_network_error_is_normalized(self):
        with mock.patch.object(http_client, "urlopen", side_effect=OSError("connection refused")):
            with self.assertRaises(http_client.RemoteFetchError) as ctx:
                http_client.fetch_text("https://x.example/a")
        self.assertIn("connection refused", str(ctx.exception))
        self.assertEqual(ctx.exception.url, "https://x.example/a")

    def test_remote_fetch_error_is_not_database_error(self):
        from cinetube_api.database import DatabaseError

        self.assertFalse(issubclass(http_client.RemoteFetchError, DatabaseError))

    def test_fetch_json_parses_payload(self):
        with mock.patch.object(http_client, "urlopen", return_value=FakeResponse(b'{"a": 1}', "application/json")):
            self.assertEqual(http_client.fetch_json("https://api.example/x"), {"a": 1})

    def test_fetch_json_error_is_normalized(self):
        with mock.patch.object(http_client, "urlopen", return_value=FakeResponse(b"not json")):
            with self.assertRaises(http_client.RemoteFetchError):
                http_client.fetch_json("https://api.example/x")

    def test_fetch_remote_image_uses_media_timeout_and_referer(self):
        with mock.patch.object(http_client, "urlopen", return_value=FakeResponse(b"\x89PNG", "image/png")) as opener:
            content, mime = http_client.fetch_remote_image("https://cdn.example/dir/a.png")
        self.assertEqual(mime, "image/png")
        self.assertEqual(content, b"\x89PNG")
        self.assertEqual(opener.call_args.kwargs["timeout"], config.MEDIA_DOWNLOAD_TIMEOUT)
        self.assertEqual(opener.call_args[0][0].get_header("Referer"), "https://cdn.example/")

    def test_fetch_remote_text_routes_avdbs_to_cookie_flow(self):
        with mock.patch.object(http_client, "fetch_avdbs_text", return_value="ok") as avdbs:
            self.assertEqual(http_client.fetch_remote_text("https://www.avdbs.com/x"), "ok")
        avdbs.assert_called_once()


if __name__ == "__main__":
    unittest.main()
