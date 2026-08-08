"""웹툰 파서 단위테스트 (fixture HTML 기반)."""

import unittest
from unittest import mock

from cinetube_api import http_client
from cinetube_api.importers import webtoon

from . import load_fixture


def patch_fetch(html):
    return mock.patch.object(http_client, "fetch_remote_text", return_value=html)


class WebtoonLabelTest(unittest.TestCase):
    text = "Alternative\n대체 제목\nArtist(s)\nSome Artist\nGenre(s)\nRomance, Drama\nStatus\nOnGoing"

    def test_label_on_next_line(self):
        self.assertEqual(webtoon.extract_webtoon_label(self.text, "Alternative"), "대체 제목")

    def test_label_stops_at_next_label(self):
        self.assertEqual(webtoon.extract_webtoon_label(self.text, "Artist(s)"), "Some Artist")

    def test_inline_label(self):
        self.assertEqual(webtoon.extract_webtoon_label("Type: Manhwa\nStatus\nDone", "Type"), "Manhwa")

    def test_missing_label(self):
        self.assertEqual(webtoon.extract_webtoon_label("nothing here", "Release"), "")

    def test_split_terms(self):
        self.assertEqual(webtoon.split_webtoon_terms("Romance, Drama"), ["Romance", "Drama"])


class MangaDistrictTest(unittest.TestCase):
    url = "https://mangadistrict.com/read-scan/my-series/"

    def test_parses_fixture(self):
        with patch_fetch(load_fixture("mangadistrict_webtoon.html")):
            result = webtoon.build_mangadistrict_webtoon_import(self.url)

        self.assertEqual(result["site"], "mangadistrict")
        self.assertEqual(result["webtoon_id"], "my-series")
        self.assertEqual(result["title"], "My Series")
        self.assertEqual(result["rating"], "4.3")
        self.assertEqual(result["alternative"], "대체 제목")
        self.assertEqual(result["artist"], "Some Artist")
        self.assertEqual(result["genre"], "Romance, Drama")
        self.assertEqual(result["type"], "Manhwa")
        self.assertEqual(result["tage"], ["Adult", "Mature"])
        self.assertEqual(result["release"], "2023")
        self.assertEqual(result["summary"], "This is the summary text.")
        self.assertEqual(result["poster_image"], "https://mangadistrict.com/wp-content/uploads/my-series/cover.jpg")

    def test_chapters_are_sorted_and_deduped(self):
        with patch_fetch(load_fixture("mangadistrict_webtoon.html")):
            result = webtoon.build_mangadistrict_webtoon_import(self.url)
        numbers = [chapter["chapter_number"] for chapter in result["chapters"]]
        self.assertEqual(numbers, [1, 2, 3])
        self.assertEqual(result["chapters"][0]["webtoon_chapter_id"], "my-series-001")
        self.assertEqual(result["chapters"][0]["webtoon_id"], "my-series")


class MangaDnaTest(unittest.TestCase):
    url = "https://mangadna.com/manga/sweet-days"

    def test_parses_fixture(self):
        with patch_fetch(load_fixture("mangadna_webtoon.html")):
            result = webtoon.build_mangadna_webtoon_import(self.url)

        self.assertEqual(result["site"], "mangadna")
        self.assertEqual(result["webtoon_id"], "sweet-days")
        self.assertEqual(result["title"], "Sweet Days")
        self.assertEqual(result["rating"], "4.8")
        self.assertEqual(result["artist"], "Artist Two")
        self.assertEqual(result["genre"], "Comedy, Slice of Life")
        self.assertEqual(result["summary"], "Sweet Days description from meta tag.")

    def test_chapter_urls_are_absolute(self):
        with patch_fetch(load_fixture("mangadna_webtoon.html")):
            result = webtoon.build_mangadna_webtoon_import(self.url)
        self.assertTrue(all(c["chapter_url"].startswith("https://mangadna.com/") for c in result["chapters"]))
        self.assertEqual([c["chapter_number"] for c in result["chapters"]], [1, 2, 2])


class Hentai18Test(unittest.TestCase):
    url = "https://hentai18.net/manga/night-story"

    def test_parses_fixture(self):
        with patch_fetch(load_fixture("hentai18_webtoon.html")):
            result = webtoon.build_hentai18_webtoon_import(self.url)

        self.assertEqual(result["site"], "hentai18")
        self.assertEqual(result["webtoon_id"], "night-story")
        self.assertEqual(result["title"], "Night Story")
        self.assertEqual(result["rating"], "4.1")
        self.assertEqual(result["type"], "Manhwa")
        self.assertEqual(result["status"], "Completed")
        self.assertEqual(result["tage"], ["Romance", "Drama"])
        self.assertEqual(result["summary"], "This is the plot summary.")
        self.assertEqual(len(result["chapters"]), 2)

    def test_split_terms_without_comma(self):
        self.assertEqual(webtoon.split_hentai18_terms("Romance Drama"), ["Romance", "Drama"])
        self.assertEqual(webtoon.split_hentai18_terms(""), [])


class ImhentaiTest(unittest.TestCase):
    url = "https://imhentai.xxx/gallery/123456/"

    def test_parses_fixture(self):
        with patch_fetch(load_fixture("imhentai_gallery.html")):
            result = webtoon.build_imhentai_webtoon_import(self.url)

        self.assertEqual(result["site"], "imhentai")
        self.assertEqual(result["webtoon_id"], "123456")
        self.assertEqual(result["title"], "Sample Gallery")
        self.assertEqual(result["type"], "Gallery")
        self.assertEqual(result["artist"], "Kaneda, Studio X")
        self.assertIn("Romance", result["genre"])
        self.assertIn("English", result["tage"])
        self.assertEqual(result["poster_image"], "https://cdn.imhentai.xxx/001/abcdef/cover.jpg")
        self.assertNotIn("https://static.imhentai.xxx/images/logo.png", result["webtoon_images"])
        self.assertEqual(len(result["chapters"]), 1)
        self.assertEqual(result["chapters"][0]["webtoon_chapter_id"], "123456-001")

    def test_blocked_page_returns_fallback(self):
        with mock.patch.object(
            http_client, "fetch_remote_text",
            side_effect=http_client.RemoteFetchError("HTTP Error 403", self.url),
        ):
            result = webtoon.build_imhentai_webtoon_import(self.url)
        self.assertEqual(result["webtoon_id"], "123456")
        self.assertIn("차단", result["summary"])
        self.assertEqual(result["webtoon_images"], [])
        self.assertEqual(len(result["chapters"]), 1)


class BuildWebtoonImportTest(unittest.TestCase):
    def test_requires_url(self):
        with self.assertRaises(ValueError):
            webtoon.build_webtoon_import("sweet-days")

    def test_unsupported_host(self):
        with self.assertRaises(ValueError):
            webtoon.build_webtoon_import("https://example.com/manga/x")

    def test_auto_detects_site(self):
        with patch_fetch(load_fixture("mangadna_webtoon.html")):
            result = webtoon.build_webtoon_import("https://mangadna.com/manga/sweet-days")
        self.assertEqual(result["site"], "mangadna")

    def test_explicit_site_mismatch_raises(self):
        with self.assertRaises(ValueError):
            webtoon.build_webtoon_import("https://mangadna.com/manga/sweet-days", "imhentai")


if __name__ == "__main__":
    unittest.main()
