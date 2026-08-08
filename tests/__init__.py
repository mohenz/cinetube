"""CineTube 로컬 API 단위/통합 테스트 패키지.

실행: python -m unittest discover -s tests -t .
"""

import logging
import os
import sys

# 테스트 출력에 운영 경고 로그가 섞이지 않도록 억제한다.
logging.getLogger("cinetube").setLevel(logging.CRITICAL)
for _name in ("database", "http", "media", "jobs", "handler"):
    logging.getLogger(f"cinetube.{_name}").setLevel(logging.CRITICAL)

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(TESTS_DIR)
SCRIPTS_DIR = os.path.join(PROJECT_ROOT, "scripts")
FIXTURES_DIR = os.path.join(TESTS_DIR, "fixtures")

if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)


def load_fixture(name):
    with open(os.path.join(FIXTURES_DIR, name), encoding="utf-8") as handle:
        return handle.read()
