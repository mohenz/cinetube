"""CineTube 로컬 API 호환성 진입점.

실제 구현은 `scripts/cinetube_api/` 패키지에 기능별로 분리되어 있다.
이 파일은 서버 실행과 `Handler` 재노출만 담당한다.

- 로컬 실행:   python scripts/local_api.py
- Vercel:      from scripts.local_api import Handler   (api/index.py)
"""

import os
import sys

try:  # 프로젝트 루트에서 `scripts.local_api`로 import 되는 경우 (Vercel)
    from scripts.cinetube_api.handler import Handler, create_server, serve_forever
except ImportError:  # 스크립트로 직접 실행되는 경우
    _SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
    if _SCRIPTS_DIR not in sys.path:
        sys.path.insert(0, _SCRIPTS_DIR)
    from cinetube_api.handler import Handler, create_server, serve_forever

__all__ = ["Handler", "create_server", "serve_forever", "main"]


def main():
    serve_forever()


if __name__ == "__main__":
    main()
