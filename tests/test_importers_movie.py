"""영화 계열 파서 단위테스트 (fixture HTML 기반, 네트워크 미사용)."""

import unittest
from unittest import mock

from cinetube_api import http_client
from cinetube_api.importers import movie

from . import load_fixture


def patch_fetch(html):
    return mock.patch.object(http_client, "fetch_remote_text", return_value=html)


def patch_fetch_error(message="HTTP Error 403: Forbidden"):
    return mock.patch.object(
        http_client, "fetch_remote_text",
        side_effect=http_client.RemoteFetchError(message, "https://x.example"),
    )


class DetectSiteTest(unittest.TestCase):
    def test_tmdb(self):
        self.assertEqual(movie.detect_import_site("https://www.themoviedb.org/movie/157336"), "tmdb")

    def test_javtiful(self):
        self.assertEqual(movie.detect_import_site("https://javtiful.com/video/abc"), "javtiful")

    def test_supjav(self):
        self.assertEqual(movie.detect_import_site("https://supjav.com/123.html"), "supjav")

    def test_missav_and_123av(self):
        self.assertEqual(movie.detect_import_site("https://missav.com/ko/abp-123"), "missav")
        self.assertEqual(movie.detect_import_site("https://123av.com/ko/v/abp-123"), "missav")

    def test_bare_movie_code_defaults_to_javtiful(self):
        self.assertEqual(movie.detect_import_site("SSIS-456"), "javtiful")

    def test_projectjav_is_rejected(self):
        with self.assertRaises(ValueError):
            movie.detect_import_site("https://projectjav.com/movie/abp-123-999")

    def test_unknown_raises(self):
        with self.assertRaises(ValueError):
            movie.detect_import_site("https://example.com/whatever")


class NormalizeMissavUrlTest(unittest.TestCase):
    def test_rewrites_missav_host(self):
        self.assertEqual(
            movie.normalize_missav_url("https://missav.com/ko/abp-123"),
            "https://123av.com/ko/abp-123",
        )

    def test_keeps_query_and_fragment(self):
        self.assertEqual(
            movie.normalize_missav_url("https://missav.ws/ko/abp-123?a=1#b"),
            "https://123av.com/ko/abp-123?a=1#b",
        )

    def test_leaves_other_hosts(self):
        self.assertEqual(movie.normalize_missav_url("https://other.com/x"), "https://other.com/x")

    def test_leaves_bare_code(self):
        self.assertEqual(movie.normalize_missav_url("ABP-123"), "ABP-123")


class ExternalImportTest(unittest.TestCase):
    url = "https://javtiful.com/video/ssis-456"

    def test_parses_javtiful_fixture(self):
        with patch_fetch(load_fixture("javtiful_movie.html")):
            result = movie.build_external_import(self.url, "javtiful")

        self.assertEqual(result["movie_code"], "SSIS-456")
        self.assertEqual(result["title"], "SSIS-456 Sample Title")
        self.assertEqual(result["category_code"], "reducing-mosaic")
        self.assertEqual(result["release_month"], "2023-04")
        self.assertEqual(result["production_company"], "S1 NO.1 STYLE")
        self.assertIn("Rin Miyazaki", result["actor_names"])
        self.assertEqual(result["source_url"], self.url)
        self.assertTrue(result["poster_url"].startswith("https://cdn.javtiful.com/"))
        self.assertNotIn("import_warning", result)

    def test_actor_profiles_match_actor_names(self):
        with patch_fetch(load_fixture("javtiful_movie.html")):
            result = movie.build_external_import(self.url, "javtiful")
        self.assertEqual(
            [profile["name"] for profile in result["actor_profiles"]],
            result["actor_names"],
        )

    def test_blocked_page_returns_fallback_contract(self):
        with patch_fetch_error():
            result = movie.build_external_import(
                "https://javtiful.com/video/1234-ssis-456-sample", "javtiful"
            )
        self.assertEqual(result["import_warning"], "remote_fetch_blocked")
        self.assertEqual(result["movie_code"], "SSIS-456")
        self.assertIn("403", result["description"])
        self.assertIsNone(result["poster_url"])
        self.assertEqual(result["rating_grade"], "B+")

    def test_incomplete_html_still_returns_full_contract(self):
        with patch_fetch("<html><head></head><body></body></html>"):
            result = movie.build_external_import(self.url, "supjav")
        for key in (
            "title", "movie_code", "category_code", "actor_names", "keywords",
            "video_url", "source_url", "description", "poster_url", "release_month",
            "recommendation_score", "ranking_score", "is_main",
        ):
            self.assertIn(key, result)
        self.assertEqual(result["movie_code"], "SSIS-456")


class MissavImportTest(unittest.TestCase):
    url = "https://missav.com/ko/abp-123"

    def test_parses_fixture(self):
        with patch_fetch(load_fixture("missav_movie.html")):
            result = movie.build_missav_import(self.url)

        self.assertEqual(result["movie_code"], "ABP-123")
        self.assertEqual(result["category_code"], "missav")
        self.assertEqual(result["category_name"], "123AV")
        self.assertEqual(result["source_url"], "https://123av.com/ko/abp-123")
        self.assertEqual(result["release_month"], "2023-05")
        self.assertEqual(result["production_company"], "Prestige")
        self.assertEqual(result["actor_names"], ["사쿠라 미유", "아오이 린"])
        self.assertEqual(result["description"], "이 작품은 테스트용 상세 설명입니다.")
        self.assertEqual(result["poster_url"], "https://cdn.123av.com/covers/abp-123.jpg")

    def test_blocked_page_returns_fallback(self):
        with patch_fetch_error("timed out"):
            result = movie.build_missav_import(self.url)
        self.assertEqual(result["import_warning"], "remote_fetch_blocked")
        self.assertEqual(result["movie_code"], "ABP-123")
        self.assertEqual(result["video_url"], "https://123av.com/ko/abp-123")
        self.assertIn("timed out", result["description"])


class ResolveExternalInputTest(unittest.TestCase):
    def test_url_passthrough(self):
        self.assertEqual(
            movie.resolve_external_input("https://javtiful.com/v/x", "javtiful"),
            "https://javtiful.com/v/x",
        )

    def test_missav_code_builds_canonical_url(self):
        self.assertEqual(
            movie.resolve_external_input("ABP-123", "missav"),
            "https://123av.com/ko/v/abp-123",
        )

    def test_requires_url_or_code(self):
        with self.assertRaises(ValueError):
            movie.resolve_external_input("just text", "javtiful")

    def test_search_result_is_used(self):
        search_html = '<a href="https://javtiful.com/video/ssis-456">SSIS-456</a>'
        with patch_fetch(search_html):
            self.assertEqual(
                movie.resolve_external_input("SSIS-456", "javtiful"),
                "https://javtiful.com/video/ssis-456",
            )

    def test_search_failure_returns_original_value(self):
        with patch_fetch_error():
            self.assertEqual(movie.resolve_external_input("SSIS-456", "javtiful"), "SSIS-456")


class BuildMovieImportTest(unittest.TestCase):
    def test_dispatches_to_tmdb(self):
        with mock.patch.object(movie, "build_tmdb_import", return_value={"ok": True}) as builder:
            result = movie.build_movie_import("https://www.themoviedb.org/movie/1", "auto")
        builder.assert_called_once()
        self.assertEqual(result, {"ok": True})

    def test_explicit_site_overrides_detection(self):
        with patch_fetch(load_fixture("missav_movie.html")):
            result = movie.build_movie_import("https://123av.com/ko/abp-123", "missav")
        self.assertEqual(result["category_code"], "missav")


class ProjectjavTest(unittest.TestCase):
    def test_fallback_from_url_structure(self):
        result = movie.projectjav_fallback_from_url("https://projectjav.com/movie/abp-123-999", "blocked")
        self.assertEqual(result["movie_code"], "ABP-123")
        self.assertEqual(result["poster_url"], "https://images.projectjav.com/data/covers/999.jpg")
        self.assertEqual(result["import_warning"], "remote_fetch_blocked")


if __name__ == "__main__":
    unittest.main()
