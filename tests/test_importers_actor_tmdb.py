"""배우(AVDBS)·TMDB 파서 단위테스트."""

import unittest
from unittest import mock

from cinetube_api import http_client
from cinetube_api.importers import actor, tmdb

from . import load_fixture


class AvdbsActorTest(unittest.TestCase):
    url = "https://www.avdbs.com/menu/actor.php?actor_id=12345"

    def test_parses_fixture(self):
        with mock.patch.object(http_client, "fetch_remote_text", return_value=load_fixture("avdbs_actor.html")):
            result = actor.build_avdbs_actor_import(self.url)

        self.assertEqual(result["name"], "Miyuki Arisaka")
        self.assertEqual(result["age"], 30)
        self.assertEqual(result["height_cm"], 158)
        self.assertEqual(result["body_size"], "B88(E)-W58-H86")
        self.assertEqual(result["debut_year"], 2015)
        self.assertEqual(result["representative_image_url"], "https://www.avdbs.com/img/actor/12345.jpg")
        self.assertIn("미유키 아리사카", result["aliases"])
        self.assertLessEqual(len(result["image_urls"]), 5)
        self.assertNotIn("https://www.avdbs.com/img/banner/ad.jpg", result["image_urls"])

    def test_explicit_name_wins(self):
        with mock.patch.object(http_client, "fetch_remote_text", return_value=load_fixture("avdbs_actor.html")):
            result = actor.build_avdbs_actor_import(self.url, "아리사카 미유키")
        self.assertEqual(result["name"], "아리사카 미유키")

    def test_blocked_page_returns_fallback(self):
        with mock.patch.object(
            http_client, "fetch_remote_text",
            side_effect=http_client.RemoteFetchError("HTTP Error 503", self.url),
        ):
            result = actor.build_avdbs_actor_import(self.url, "미유키")
        self.assertEqual(result["import_warning"], "remote_fetch_blocked")
        self.assertEqual(result["name"], "미유키")
        self.assertEqual(result["age"], 0)
        self.assertEqual(result["image_urls"], [])

    def test_body_size_without_cup(self):
        self.assertEqual(actor.build_body_size("B90 / W60 / H88"), "B90-W60-H88")

    def test_body_size_missing(self):
        self.assertEqual(actor.build_body_size("정보 없음"), "")

    def test_actor_name_from_heading_prefers_latin(self):
        self.assertEqual(actor.actor_name_from_heading("미유키 / Miyuki Arisaka"), "Miyuki Arisaka")

    def test_actor_name_from_heading_without_latin(self):
        self.assertEqual(actor.actor_name_from_heading("미유키"), "미유키")

    def test_build_actor_import_requires_url(self):
        with self.assertRaises(ValueError):
            actor.build_actor_import("이름", "")

    def test_build_actor_import_rejects_unsupported_host(self):
        with self.assertRaises(ValueError):
            actor.build_actor_import("이름", "https://example.com/actor/1")


class TmdbTest(unittest.TestCase):
    url = "https://www.themoviedb.org/movie/157336"

    def test_extract_tmdb_id(self):
        self.assertEqual(tmdb.extract_tmdb_id(self.url), "157336")

    def test_extract_tmdb_id_rejects_non_movie_url(self):
        with self.assertRaises(ValueError):
            tmdb.extract_tmdb_id("https://www.themoviedb.org/tv/1396")

    def test_tmdb_image_url(self):
        self.assertEqual(
            tmdb.tmdb_image_url("/abc.jpg", "w500"),
            "https://media.themoviedb.org/t/p/w500/abc.jpg",
        )
        self.assertIsNone(tmdb.tmdb_image_url(None, "w500"))
        self.assertEqual(tmdb.tmdb_image_url("http://x/y.jpg", "w500"), "http://x/y.jpg")

    def test_category_code_from_name(self):
        self.assertEqual(tmdb.category_code_from_name("Science Fiction"), "sf")
        self.assertEqual(tmdb.category_code_from_name("액션"), "action")
        self.assertEqual(tmdb.category_code_from_name("Family Movie"), "family-movie")
        self.assertEqual(tmdb.category_code_from_name(""), "movie")

    def test_api_import(self):
        payload = {
            "title": "인터스텔라",
            "overview": "설명",
            "release_date": "2014-11-06",
            "vote_average": 8.4,
            "poster_path": "/p.jpg",
            "backdrop_path": "/b.jpg",
            "genres": [{"name": "모험"}, {"name": "드라마"}],
            "production_companies": [{"name": "Legendary"}],
            "credits": {
                "cast": [{"name": "매튜 매커너히", "profile_path": "/c1.jpg"}],
                "crew": [{"job": "Director", "name": "Christopher Nolan"}],
            },
        }
        with mock.patch.object(tmdb, "fetch_tmdb_json", return_value=payload):
            result = tmdb.build_tmdb_import(self.url)

        self.assertEqual(result["movie_code"], "TMDB-157336")
        self.assertEqual(result["title"], "인터스텔라")
        self.assertEqual(result["category_name"], "모험")
        self.assertEqual(result["release_month"], "2014-11")
        self.assertEqual(result["recommendation_score"], 84)
        self.assertEqual(result["director_names"], ["Christopher Nolan"])
        self.assertEqual(result["production_company"], "Legendary")
        self.assertEqual(result["poster_url"], "https://media.themoviedb.org/t/p/w500/p.jpg")
        self.assertEqual(result["rating_grade"], "A")

    def test_api_failure_falls_back_to_page_parser(self):
        with mock.patch.object(tmdb, "fetch_tmdb_json", side_effect=http_client.RemoteFetchError("401", self.url)), \
             mock.patch.object(http_client, "fetch_remote_text", return_value=load_fixture("tmdb_movie.html")):
            result = tmdb.build_tmdb_import(self.url)

        self.assertEqual(result["movie_code"], "TMDB-157336")
        self.assertEqual(result["title"], "인터스텔라")
        self.assertEqual(result["category_name"], "모험")
        self.assertEqual(result["category_code"], "adventure")
        self.assertEqual(result["release_month"], "2014-11")
        self.assertEqual(result["recommendation_score"], 84)
        self.assertEqual(result["director_names"], ["Christopher Nolan"])
        self.assertEqual(result["poster_url"], "https://media.themoviedb.org/t/p/w600_and_h900_bestv2/poster.jpg")
        self.assertEqual(result["capture_url"], "https://media.themoviedb.org/t/p/w1066_and_h600_bestv2/backdrop.jpg")
        self.assertEqual(result["actor_names"], ["매튜 매커너히", "앤 해서웨이"])

    def test_page_parser_ignores_logo_alt(self):
        poster, backdrop, cast = tmdb.extract_tmdb_images_from_html(
            load_fixture("tmdb_movie.html"), "인터스텔라"
        )
        self.assertIsNotNone(poster)
        self.assertIsNotNone(backdrop)
        self.assertNotIn("회사 로고", [person["name"] for person in cast])


if __name__ == "__main__":
    unittest.main()
