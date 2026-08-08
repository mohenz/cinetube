"""CRUD 허용 테이블과 컬럼 화이트리스트 정의.

값 정의만 담당하며 다른 모듈을 import 하지 않는다.
"""

TABLES = {
    "media_assets": {
        "pk": "id",
        "insert": ["bucket_id", "object_path", "public_url", "thumb_url", "original_name", "mime_type", "size_bytes", "owner_table", "owner_field", "owner_id", "sort_order"],
        "update": ["bucket_id", "object_path", "public_url", "thumb_url", "original_name", "mime_type", "size_bytes", "owner_table", "owner_field", "owner_id", "sort_order"],
    },
    "categories": {
        "pk": "category_code",
        "insert": ["category_code", "name", "representative_image_url", "representative_image_asset_id", "is_visible"],
        "update": ["name", "representative_image_url", "representative_image_asset_id", "is_visible"],
    },
    "actors": {
        "pk": "id",
        "insert": ["name", "age", "height_cm", "body_size", "debut_year", "representative_image_url", "representative_image_asset_id", "image_urls", "image_asset_ids"],
        "update": ["name", "age", "height_cm", "body_size", "debut_year", "representative_image_url", "representative_image_asset_id", "image_urls", "image_asset_ids"],
    },
    "rating_grades": {
        "pk": "grade",
        "insert": ["grade", "display_order"],
        "update": ["display_order"],
    },
    "common_codes": {
        "pk": "id",
        "insert": ["code_group", "code_value", "code_label", "display_order", "is_enabled", "extra"],
        "update": ["code_group", "code_value", "code_label", "display_order", "is_enabled", "extra"],
    },
    "favorite_movies": {
        "pk": "id",
        "insert": ["user_key", "content_type", "content_id", "note", "metadata"],
        "update": ["user_key", "content_type", "content_id", "note", "metadata"],
    },
    "gallery_images": {
        "pk": "id",
        "insert": ["gallery_image_id", "title", "description", "image_url", "image_asset_id", "source", "tags", "is_visible"],
        "update": ["gallery_image_id", "title", "description", "image_url", "image_asset_id", "source", "tags", "is_visible"],
    },
    "webtoons": {
        "pk": "id",
        "insert": ["webtoon_id", "title", "rating", "alternative", "artist", "genre", "type", "tage", "poster_image", "poster_image_asset_id", "url", "webtoon_images", "webtoon_image_asset_ids"],
        "update": ["webtoon_id", "title", "rating", "alternative", "artist", "genre", "type", "tage", "poster_image", "poster_image_asset_id", "url", "webtoon_images", "webtoon_image_asset_ids"],
    },
    "webtoon_chapters": {
        "pk": "id",
        "insert": ["webtoon_chapter_id", "webtoon_id", "chapter_number", "chapter_url", "chapter_poster", "chapter_poster_asset_id"],
        "update": ["webtoon_chapter_id", "webtoon_id", "chapter_number", "chapter_url", "chapter_poster", "chapter_poster_asset_id"],
    },
    "movies": {
        "pk": "id",
        "insert": ["title", "movie_code", "category_code", "actor_id", "actor_ids", "director_names", "source_url", "keywords", "rating_grade", "video_url", "description", "poster_url", "poster_asset_id", "capture_url", "capture_asset_id", "snapshot_url", "snapshot_asset_id", "release_month", "production_company", "recommendation_score", "rotten_tomatoes_score", "ranking_score", "click_count", "is_main"],
        "update": ["title", "movie_code", "category_code", "actor_id", "actor_ids", "director_names", "source_url", "keywords", "rating_grade", "video_url", "description", "poster_url", "poster_asset_id", "capture_url", "capture_asset_id", "snapshot_url", "snapshot_asset_id", "release_month", "production_company", "recommendation_score", "rotten_tomatoes_score", "ranking_score", "click_count", "is_main"],
    },
}

READ_CONTROL_PARAMS = {"select", "order", "limit", "offset", "page", "page_size", "count", "search"}

SEARCH_COLUMNS = {
    "movies": ["title", "movie_code", "category_code", "description", "production_company", "keywords"],
    "gallery_images": ["gallery_image_id", "title", "description", "source", "tags"],
    "actors": ["name", "body_size", "debut_year", "age", "height_cm"],
    "categories": ["category_code", "name"],
    "webtoons": ["webtoon_id", "title", "alternative", "artist", "genre", "type", "tage"],
}

MAX_PAGE_SIZE = 200
DEFAULT_ORDER = "created_at.desc"

# 테이블별 (URL 컬럼, asset id 컬럼, media owner_field) 목록
IMAGE_FIELDS = {
    "movies": [
        ("poster_url", "poster_asset_id", "poster"),
        ("capture_url", "capture_asset_id", "capture"),
        ("snapshot_url", "snapshot_asset_id", "snapshot"),
    ],
    "categories": [("representative_image_url", "representative_image_asset_id", "representative")],
    "actors": [("representative_image_url", "representative_image_asset_id", "representative")],
    "gallery_images": [("image_url", "image_asset_id", "image")],
    "webtoons": [("poster_image", "poster_image_asset_id", "poster")],
    "webtoon_chapters": [("chapter_poster", "chapter_poster_asset_id", "poster")],
}

# 지원하는 외부 가져오기 사이트
IMPORT_SITES = ("tmdb", "javtiful", "supjav", "missav")
WEBTOON_SITES = ("mangadistrict", "mangadna", "hentai18", "imhentai")
ACTOR_SITES = ("avdbs",)
