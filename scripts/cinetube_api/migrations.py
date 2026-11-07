"""API 시작 시 적용하는 멱등 스키마 보정.

배포 서버의 DB에 직접 접속하지 않아도, 새 코드로 API가 재시작되면 부족한 컬럼이 추가된다.
모든 문장은 `if not exists` 로 여러 번 실행해도 안전해야 한다.
"""

import logging

from . import database

logger = logging.getLogger(__name__)

STARTUP_MIGRATIONS = [
    # 마이웹툰 챕터 컷 이미지 (local/webtoon_chapter_pages_migration.sql 과 동일)
    """alter table public.webtoon_chapters
        add column if not exists chapter_title text,
        add column if not exists page_image_urls text[] not null default '{}',
        add column if not exists page_image_asset_ids uuid[] not null default '{}'""",
]


def apply_startup_migrations():
    """부족한 컬럼을 추가한다. 실패해도 API 기동은 막지 않는다."""
    try:
        for statement in STARTUP_MIGRATIONS:
            database.run_sql(statement)
        database.clear_column_cache()
        logger.info("startup migrations applied (%d)", len(STARTUP_MIGRATIONS))
    except Exception as exc:
        logger.error("startup migrations failed: %s", exc)
