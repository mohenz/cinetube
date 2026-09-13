# CineTube 신규 PC 개발 및 운영 환경 구축 가이드

이 문서는 새로운 개발자나 새로운 AI 에이전트가 신규 PC 환경에서 CineTube 프로젝트를 완벽히 재구축하고, 로컬 데이터베이스와 API 서버, 그리고 확장 프로그램을 구동하기 위해 필요한 모든 설정과 동작 원리를 설명합니다.

---

## 1. 개요 및 운영 구조
CineTube는 다음과 같은 세 가지 레이어로 구동되는 로컬 중심 미디어 데이터베이스 애플리케이션입니다:
1. **프론트엔드 (Frontend)**: Vanilla HTML, CSS, JavaScript로 제작되어 가볍고 빠르며, 정적 웹서버(포트 `8080`) 상에서 동작합니다.
2. **백엔드 API (Backend API)**: Python 내장 서버 기반의 로컬 API 서버(포트 `3001`)가 데이터베이스 통신 및 원격 이미지 다운로드/가공 등을 담당합니다.
3. **데이터베이스 (PostgreSQL DB)**: 로컬 PostgreSQL 인스턴스(포트 `54322`)가 `cinetube` 데이터베이스를 운용합니다.

---

## 2. 사전 필수 요구사항 (Prerequisites)

CineTube 로컬 구동 스크립트는 **Windows OS (win32)** 및 PowerShell 환경을 전제로 설계되어 있습니다.

### (1) PostgreSQL 설치
- PC에 PostgreSQL이 설치되어 있어야 합니다. (공식 권장 경로: `C:\Program Files\PostgreSQL`)
- 스크립트 기동 시 이 경로 하위에 있는 최신 버전을 자동으로 탐색 및 부팅하므로 수동 서비스 등록이 필요하지 않습니다.

### (2) Python 3.10+ 설치
- 시스템 환경변수(Path)에 `python` 명령어가 등록되어 있어야 합니다.

### (3) 필수 Python 패키지 설치
로컬 백엔드 가동을 위해 필요한 라이브러리 목록을 설치해야 합니다. 루트 폴더의 `requirements.txt`에 기재된 패키지를 설치합니다:
```powershell
python -m pip install --user -r requirements.txt
```
* **주요 필수 모듈**:
  - `psycopg` (PostgreSQL 연동용 어댑터)
  - `Pillow` (이미지 썸네일 생성 및 가공용 라이브러리)

---

## 3. 로컬 인프라 구동 프로세스

CineTube는 원클릭 실행 스크립트인 **`start-cinetube.cmd`**를 실행하면 내부적으로 `scripts/launch_cinetube.ps1` 및 `scripts/start_local_db.ps1`을 호출하여 아래의 인프라를 순서대로 자동 활성화합니다.

### [1단계] PostgreSQL DB 시작 (포트: `54322`)
- `local/postgres-data` 폴더가 없을 경우 자동으로 `initdb.exe`를 구동하여 독자적인 데이터 디렉터리를 초기화합니다.
- 포트 **`54322`**번으로 PostgreSQL을 가동합니다.
- `cinetube` 데이터베이스를 생성하고 `local/schema.sql` 스키마 스크립트를 최초 1회 자동 적용합니다.

### [2단계] Python API 서버 구동 (포트: `3001`)
- DB 부팅이 성공하면 `scripts/local_api.py` 서버가 포트 **`3001`**번으로 백그라운드 구동됩니다.
- 로그는 `local/api.out.log` 및 `local/api.err.log`에 기록됩니다.
- 이 API 서버는 CORS 요청이 전면 허용되어 크롬 확장 프로그램이나 다른 호스트에서의 POST 통신도 유연하게 수락합니다.

### [3단계] 프론트엔드 정적 웹서버 가동 (포트: `8080`)
- 로컬 웹 서비스 가동 여부를 체크하고 열려있지 않다면 `python -m http.server 8080 --bind 0.0.0.0` 명령어로 정적 웹 페이지들을 즉시 호스팅합니다.
- 서비스 가동 완료 후 크롬 브라우저로 `http://localhost:8080/index.html`을 자동 오픈합니다.

---

## 4. 핵심 예외 처리 및 장애 회피 설계 (개발자용)

CineTube는 `javtrailers.com` 등 강력한 방화벽(WAF)이 세팅된 외부 사이트 이미지 주소를 처리하기 위해 이중 안전 구조가 설계되어 있습니다:

1. **백엔드 다운로드 격리 (`scripts/cinetube_api/media.py`)**:
   - `localize_remote_images` 처리기 내부에서 이미지 가공이나 소켓 단절(`WinError 10054`) 같은 모든 종류의 `Exception`을 잡아내어 에러의 전파를 격리합니다.
   - 로컬화 실패 시 경고 로그만 찍고, **영화 데이터 등록 자체는 성공 처리**시킵니다.
2. **프론트엔드 저장 폴백 (`assets/js/shared/admin-page.js`)**:
   - 관리자 화면에서 저장 시 `Store.importMediaUrl` 호출 부를 `try-catch`로 감싸고 있습니다.
   - 백엔드가 이미지 다운로드에 실패하여 500 오류를 뱉더라도, 프론트엔드에서는 전체 저장 실패 경고창을 띄우는 대신 **원본 원격 이미지 주소를 그대로 DB 이미지 컬럼에 보존한 채 저장을 무조건 완료**시킵니다.
   - 브라우저는 사용자 세션이므로 차단당하지 않고 `javtrailers.com` 등의 고화질 원본 포스터를 화면에 깔끔하게 출력해 줍니다.

---

## 5. 원클릭 메타데이터 크롬 확장 프로그램 운용

외부 AV 영화 비디오 상세 페이지(123AV, MissAV 등)에서 메타데이터를 손쉽게 추출하여 내 CineTube 로컬 데이터베이스에 원클릭 전송하는 크롬 확장 프로그램입니다.

- **위치**: `tools/chrome-extension/`
- **구조**: Manifest V3 표준 명세, `content.js` (DOM 메타데이터 추출기), `popup.html` 및 `popup.js` (다크모드 송신 UI).
- **장착 방법**:
  1. 크롬 브라우저에서 `chrome://extensions/`로 이동합니다.
  2. 우측 상단의 **개발자 모드**를 활성화합니다.
  3. 좌측 상단의 **"압축해제된 확장 프로그램을 로드합니다"** 버튼을 클릭하고 `tools/chrome-extension/` 폴더를 로드합니다.
  4. 웹 상세페이지에서 영상을 가볍게 재생 후 확장프로그램 아이콘(📌)을 눌러 원클릭 전송 버튼을 누르면 CineTube API(`localhost:3001/movies`)를 거쳐 영화 정보가 안전하게 삽입됩니다.

---

## 6. 서비스 정지 프로세스

작업이 종료된 후 백그라운드 인프라(PostgreSQL 및 Python API 서버)를 안전하게 정지하려면 루트 폴더의 **`stop-cinetube.cmd`**를 기동합니다.
- 이 스크립트는 내부적으로 `scripts/stop_local_db.ps1`을 가동하여 부팅되었던 포트 `54322` PostgreSQL 인스턴스와 백그라운드 Python API 프로세스를 완전히 정상 종료시킵니다.

---

## 7. 검증 및 테스트 가이드 (AI 에이전트 필독)

백엔드 파이썬 코드를 편집하거나 기능을 추가한 뒤에는 반드시 아래의 단위 테스트(Unit Tests)를 수행하여 아키텍처 손상 및 리그레션 여부를 검증해야 합니다:

* **미디어/로컬화 기능 테스트**:
  ```powershell
  python -m unittest tests/test_media.py
  ```
* **영화 임포터/파서 기능 테스트**:
  ```powershell
  python -m unittest tests/test_importers_movie.py
  ```

---

## 8. 에이전트 컨텍스트 단축 꿀팁
- 다수의 HTML 파일을 대상으로 반복적인 마크업 배치 가공(예: 탑바 구조 변경 등)을 일괄 처리할 때에는, 마스터 에이전트가 개별 수정을 반복하기보다 **`generalist` 하브 에이전트(Sub-agent)**에게 대상 파일 목록과 정규식 수정 양식을 하나의 프롬프트로 전송해 대행시키는 것이 컨텍스트 절약 및 작업 가속에 압도적으로 효율적입니다.
