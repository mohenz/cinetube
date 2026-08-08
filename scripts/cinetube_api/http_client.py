"""외부 사이트 HTTP 요청 계층.

User-Agent/Referer 프로파일, SSL 설정, 쿠키 처리, timeout, 응답 크기 제한,
네트워크 오류 표준화를 담당한다. DB와 HTTP Handler를 참조하지 않는다.
"""

import json
import logging
import ssl
import time
from http.cookiejar import CookieJar
from urllib.parse import urlparse
from urllib.request import HTTPCookieProcessor, Request, build_opener, urlopen

from . import config

logger = logging.getLogger("cinetube.http")

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125 Safari/537.36"
)
IMPORTER_UA = "CineTube Local Importer"

DEFAULT_PROFILE = {
    "headers": {
        "User-Agent": IMPORTER_UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
    "insecure_ssl": False,
}

# (host 판별자, 프로파일) — 등록 순서대로 첫 매치를 사용한다.
HOST_PROFILES = (
    ("imhentai.xxx", {
        "headers": {
            "User-Agent": BROWSER_UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
            "Referer": "https://imhentai.xxx/",
        },
        "insecure_ssl": True,
    }),
    ("mangadna.com", {
        "headers": {
            "User-Agent": BROWSER_UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
            "Referer": "https://mangadna.com/",
        },
        "insecure_ssl": True,
    }),
    ("missav", {
        "headers": {
            "User-Agent": BROWSER_UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
            "Referer": "https://123av.com/",
        },
        "insecure_ssl": True,
    }),
    ("123av.com", {
        "headers": {
            "User-Agent": BROWSER_UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
            "Referer": "https://123av.com/",
        },
        "insecure_ssl": True,
    }),
)


class RemoteFetchError(RuntimeError):
    """외부 사이트 요청 실패. DB 장애와 구분해 기록하기 위한 예외 타입."""

    def __init__(self, message, url=""):
        super().__init__(message)
        self.url = url


class RemoteResponseTooLarge(RemoteFetchError):
    """응답 크기 제한 초과."""


def profile_for(url):
    host = urlparse(url or "").netloc.lower()
    for marker, profile in HOST_PROFILES:
        if marker == "123av.com":
            if host.endswith("123av.com"):
                return profile
        elif marker in host:
            return profile
    return DEFAULT_PROFILE


def _ssl_context(profile):
    return ssl._create_unverified_context() if profile.get("insecure_ssl") else None


def _read_limited(response, limit, url):
    data = response.read(limit + 1)
    if len(data) > limit:
        raise RemoteResponseTooLarge(
            f"원격 응답이 허용 크기({limit} bytes)를 초과했습니다", url
        )
    return data


def _log_remote(url, started, ok):
    elapsed_ms = (time.perf_counter() - started) * 1000
    if not config.REQUEST_TIMING_LOG:
        return
    level = logging.INFO if ok else logging.WARNING
    if ok and elapsed_ms < config.SLOW_REQUEST_MS:
        return
    logger.log(level, "remote %s %.1fms %s", "ok" if ok else "fail", elapsed_ms, url)


def fetch_bytes(url, timeout=None, max_bytes=None, headers=None, profile=None):
    """외부 URL을 (본문 bytes, Content-Type)으로 가져온다."""
    profile = profile or profile_for(url)
    request_headers = dict(profile["headers"])
    if headers:
        request_headers.update(headers)
    started = time.perf_counter()
    try:
        with urlopen(
            Request(url, headers=request_headers),
            timeout=timeout if timeout is not None else config.HTTP_TIMEOUT,
            context=_ssl_context(profile),
        ) as response:
            content = _read_limited(
                response,
                max_bytes if max_bytes is not None else config.MAX_REMOTE_TEXT_BYTES,
                url,
            )
            mime_type = response.headers.get_content_type() or "application/octet-stream"
    except RemoteFetchError:
        _log_remote(url, started, False)
        raise
    except Exception as exc:
        _log_remote(url, started, False)
        raise RemoteFetchError(str(exc), url) from exc
    _log_remote(url, started, True)
    return content, mime_type


def fetch_text(url, timeout=None, max_bytes=None, headers=None):
    content, _ = fetch_bytes(url, timeout=timeout, max_bytes=max_bytes, headers=headers)
    return content.decode("utf-8", errors="replace")


def fetch_json(url, timeout=None, headers=None):
    merged = {"User-Agent": IMPORTER_UA, "Accept": "application/json"}
    if headers:
        merged.update(headers)
    started = time.perf_counter()
    try:
        with urlopen(
            Request(url, headers=merged),
            timeout=timeout if timeout is not None else config.HTTP_TIMEOUT,
        ) as response:
            content = _read_limited(response, config.MAX_REMOTE_TEXT_BYTES, url)
        payload = json.loads(content.decode("utf-8"))
    except RemoteFetchError:
        _log_remote(url, started, False)
        raise
    except Exception as exc:
        _log_remote(url, started, False)
        raise RemoteFetchError(str(exc), url) from exc
    _log_remote(url, started, True)
    return payload


def fetch_avdbs_text(url, timeout=None):
    """AVDBS는 성인인증 쿠키를 먼저 발급받아야 본문을 반환한다."""
    parsed = urlparse(url)
    timeout = timeout if timeout is not None else config.HTTP_TIMEOUT
    headers = {
        "User-Agent": BROWSER_UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    }
    check_url = f"{parsed.scheme}://{parsed.netloc}/check_cookie.php?cb_url={parsed.path}"
    if parsed.query:
        check_url += "%3F" + parsed.query.replace("&", "%26")
    started = time.perf_counter()
    try:
        opener = build_opener(HTTPCookieProcessor(CookieJar()))
        opener.open(Request(check_url, headers=headers), timeout=timeout).read()
        with opener.open(Request(url, headers=headers), timeout=timeout) as response:
            content = _read_limited(response, config.MAX_REMOTE_TEXT_BYTES, url)
    except RemoteFetchError:
        _log_remote(url, started, False)
        raise
    except Exception as exc:
        _log_remote(url, started, False)
        raise RemoteFetchError(str(exc), url) from exc
    _log_remote(url, started, True)
    return content.decode("utf-8", errors="replace")


def fetch_remote_text(url):
    """호스트별 프로파일을 적용해 외부 HTML을 가져온다."""
    host = urlparse(url).netloc.lower()
    if "avdbs.com" in host:
        return fetch_avdbs_text(url)
    return fetch_text(url)


def fetch_remote_image(url, timeout=None):
    """이미지 URL을 (본문 bytes, mime_type)으로 가져온다."""
    parsed = urlparse(url)
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": f"{parsed.scheme}://{parsed.netloc}/",
    }
    return fetch_bytes(
        url,
        timeout=timeout if timeout is not None else config.MEDIA_DOWNLOAD_TIMEOUT,
        max_bytes=config.MAX_REMOTE_IMAGE_BYTES,
        headers=headers,
        profile={"headers": {}, "insecure_ssl": False},
    )
