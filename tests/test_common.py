"""importers/common.py 순수 함수 단위테스트."""

import unittest

from cinetube_api.importers import common


class CleanTextTest(unittest.TestCase):
    def test_strips_tags_entities_and_whitespace(self):
        self.assertEqual(common.clean_text("<b>A&amp;B</b>\n  C  "), "A&B C")

    def test_none_returns_empty(self):
        self.assertEqual(common.clean_text(None), "")

    def test_html_text_lines_keeps_block_boundaries(self):
        html = "<div>first</div><p>second</p><script>ignored()</script><br>third"
        self.assertEqual(common.html_text_lines(html), "first\nsecond\nthird")

    def test_strip_scripts_removes_style_and_script(self):
        html = "<style>.a{}</style><script>x()</script><p>keep</p>"
        self.assertEqual(common.strip_scripts(html), "keep")


class AbsoluteUrlTest(unittest.TestCase):
    base = "https://site.example/a/b/page.html"

    def test_protocol_relative(self):
        self.assertEqual(common.absolute_url(self.base, "//cdn.example/x.jpg"), "https://cdn.example/x.jpg")

    def test_root_relative(self):
        self.assertEqual(common.absolute_url(self.base, "/x.jpg"), "https://site.example/x.jpg")

    def test_document_relative(self):
        self.assertEqual(common.absolute_url(self.base, "x.jpg"), "https://site.example/a/b/x.jpg")

    def test_absolute_kept(self):
        self.assertEqual(common.absolute_url(self.base, "http://o.example/x.jpg"), "http://o.example/x.jpg")

    def test_data_url_rejected(self):
        self.assertIsNone(common.absolute_url(self.base, "data:image/png;base64,AAAA"))

    def test_empty_rejected(self):
        self.assertIsNone(common.absolute_url(self.base, ""))


class CodeAndSlugTest(unittest.TestCase):
    def test_extract_movie_code_uppercases(self):
        self.assertEqual(common.extract_movie_code("어떤 ssis-456 작품"), "SSIS-456")

    def test_extract_movie_code_missing(self):
        self.assertEqual(common.extract_movie_code("no code here"), "")

    def test_code_slug_prefers_movie_code(self):
        self.assertEqual(common.code_slug("SSIS-456 Title"), "ssis-456")

    def test_code_slug_falls_back_to_normalized_text(self):
        self.assertEqual(common.code_slug("Some Title!"), "some-title")

    def test_slug_from_url(self):
        self.assertEqual(common.slug_from_url("https://x.example/manga/sweet-days/"), "sweet-days")
        self.assertEqual(common.slug_from_url("https://x.example"), "")

    def test_title_from_url_slug_removes_code_and_ids(self):
        title = common.title_from_url_slug("https://x.example/1234-ssis-456-sample-title.html", "SSIS-456")
        self.assertEqual(title, "SSIS-456 Sample Title")

    def test_clean_av_title_prefixes_code(self):
        self.assertEqual(common.clean_av_title("Sample - Javtiful", "SSIS-456"), "SSIS-456 Sample")

    def test_clean_av_title_keeps_existing_code(self):
        self.assertEqual(common.clean_av_title("SSIS-456 Sample", "SSIS-456"), "SSIS-456 Sample")


class MetaAndLinkTest(unittest.TestCase):
    html = (
        '<meta property="og:title" content="Title A">'
        '<meta name="keywords" content="k1, k2">'
        '<meta property="og:image" content="https://cdn.example/a.jpg">'
        '<meta property="og:image" content="https://cdn.example/b.jpg">'
        '<a href="/actors/rin">Rin</a><a href="/tags/hd">HD</a>'
        '<img src="https://cdn.example/c.jpg"><img data-src="https://cdn.example/d.jpg">'
        '<script type="application/ld+json">{"@type":"Movie","name":"Title A"}</script>'
    )

    def test_meta_content_first_value(self):
        self.assertEqual(common.meta_content(self.html, "og:title"), "Title A")

    def test_meta_contents_all_values(self):
        self.assertEqual(
            common.meta_contents(self.html, "og:image"),
            ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
        )

    def test_meta_content_missing(self):
        self.assertEqual(common.meta_content(self.html, "og:missing"), "")

    def test_find_json_ld(self):
        blocks = common.find_json_ld(self.html)
        self.assertEqual(blocks, [{"@type": "Movie", "name": "Title A"}])

    def test_find_json_ld_ignores_broken_json(self):
        self.assertEqual(common.find_json_ld('<script type="application/ld+json">{oops</script>'), [])

    def test_link_texts_filters_by_href(self):
        self.assertEqual(common.link_texts(self.html, ["/actors"]), ["Rin"])

    def test_extract_image_candidates_prefers_og_then_img(self):
        images = common.extract_image_candidates(self.html, "https://site.example/p")
        self.assertEqual(images[:2], ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"])
        self.assertIn("https://cdn.example/c.jpg", images)
        self.assertIn("https://cdn.example/d.jpg", images)

    def test_best_poster_url_prefers_keyword(self):
        images = ["https://cdn.example/x.jpg", "https://cdn.example/cover.jpg"]
        self.assertEqual(common.best_poster_url(images), "https://cdn.example/cover.jpg")

    def test_best_poster_url_falls_back_to_first(self):
        self.assertEqual(common.best_poster_url(["https://cdn.example/x.jpg"]), "https://cdn.example/x.jpg")

    def test_best_poster_url_empty(self):
        self.assertIsNone(common.best_poster_url([]))


class LabelValueTest(unittest.TestCase):
    def test_extract_colon_value(self):
        self.assertEqual(common.extract_colon_value("출시일: 2023-05-12\n장르: 드라마", "출시일"), "2023-05-12")

    def test_extract_label_value(self):
        self.assertEqual(common.extract_label_value("Date added 05/11/2023\n", "Date added"), "05/11/2023")

    def test_int_or_zero(self):
        self.assertEqual(common.int_or_zero("158cm"), 158)
        self.assertEqual(common.int_or_zero(""), 0)

    def test_split_terms(self):
        self.assertEqual(common.split_terms("a, b、 c"), ["a", "b", "c"])
        self.assertEqual(common.split_terms(""), [])


if __name__ == "__main__":
    unittest.main()
