"""외부 사이트 파서 모듈.

각 파서는 표준화된 dict만 반환하며 DB 저장이나 HTTP 응답을 직접 수행하지 않는다.
"""

from .actor import build_actor_import
from .movie import build_movie_import, detect_import_site
from .webtoon import build_webtoon_import

__all__ = [
    "build_actor_import",
    "build_movie_import",
    "build_webtoon_import",
    "detect_import_site",
]
