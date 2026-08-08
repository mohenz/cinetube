"""환경변수, 경로, 타임아웃 등 실행 설정.

최하위 계층이므로 패키지 내 다른 모듈을 import 하지 않는다.
"""

import os
from pathlib import Path


def _int_env(name, default):
    raw = os.getenv(name, "")
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default


def _float_env(name, default):
    raw = os.getenv(name, "")
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default


def _bool_env(name, default):
    raw = (os.getenv(name, "") or "").strip().lower()
    if not raw:
        return default
    return raw not in {"0", "false", "no", "off"}


ENV = {
    "DATABASE_URL": os.getenv("DATABASE_URL", ""),
    "PGHOST": os.getenv("PGHOST", "127.0.0.1"),
    "PGPORT": os.getenv("PGPORT", "54322"),
    "PGUSER": os.getenv("PGUSER", "postgres"),
    "PGPASSWORD": os.getenv("PGPASSWORD", ""),
    "PGDATABASE": os.getenv("PGDATABASE", "cinetube"),
    "PGSSLMODE": os.getenv("PGSSLMODE", ""),
}

API_HOST = os.getenv("CINETUBE_API_HOST", "0.0.0.0")
API_PORT = _int_env("CINETUBE_API_PORT", 3001)

# scripts/cinetube_api/config.py -> scripts/cinetube_api -> scripts -> 프로젝트 루트
PROJECT_ROOT = Path(__file__).resolve().parents[2]
LOCAL_MEDIA_ROOT = PROJECT_ROOT / "local" / "media"
LOCAL_MEDIA_RELATIVE_ROOT = "local/media"

# DB 연결 풀
DB_POOL_MAX_SIZE = _int_env("CINETUBE_DB_POOL_SIZE", 8)
DB_POOL_WAIT_TIMEOUT = _float_env("CINETUBE_DB_POOL_WAIT_TIMEOUT", 15.0)

# 외부 HTTP 요청
HTTP_TIMEOUT = _float_env("CINETUBE_HTTP_TIMEOUT", 20.0)
MEDIA_DOWNLOAD_TIMEOUT = _float_env("CINETUBE_MEDIA_TIMEOUT", 30.0)
MAX_REMOTE_TEXT_BYTES = _int_env("CINETUBE_MAX_REMOTE_TEXT_BYTES", 8 * 1024 * 1024)
MAX_REMOTE_IMAGE_BYTES = _int_env("CINETUBE_MAX_REMOTE_IMAGE_BYTES", 32 * 1024 * 1024)
MAX_REQUEST_BODY_BYTES = _int_env("CINETUBE_MAX_REQUEST_BODY_BYTES", 64 * 1024 * 1024)

# 미디어 처리
THUMBNAIL_MAX_SIZE = (300, 300)
THUMBNAIL_QUALITY = 78

# 로깅
REQUEST_TIMING_LOG = _bool_env("CINETUBE_REQUEST_TIMING_LOG", True)
SLOW_REQUEST_MS = _float_env("CINETUBE_SLOW_REQUEST_MS", 1000.0)
