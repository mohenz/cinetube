# CineTube

PC 웹 우선, 모바일 반응형 영화정보 관리 사이트입니다. 화면은 단일 앱 파일에 모으지 않고 HTML과 화면 진입 JS를 화면별로 분리했습니다.

## 화면 구조
- `index.html`: Home, 최신등록 8개, 맞춤추천 8개, 카테고리별 평가등급 상위 8개
- `pages/movies.html`: 최신영화 순 전체 영화목록
- `pages/actors.html`: 주연배우 목록
- `pages/actor.html`: 배우 상세정보와 출연 작품 리스트
- `pages/categories.html`: 카테고리 정보와 작품 리스트
- `pages/ratings.html`: 평가등급별 작품 리스트
- `pages/movie.html`: 영화 상세정보
- `auth/login.html`: 레거시 로그인 화면
- `admin/index.html`: 관리 대시보드
- `admin/movies.html`: 영화정보 관리
- `admin/categories.html`: 카테고리정보 관리
- `admin/actors.html`: 주연배우정보 관리
- `admin/ratings.html`: 평가등급정보 관리

## 문서 / 참조자료 구조
- `docs/requirements/cinetube 기본요구사항.txt`: 기본 요구사항 원문
- `docs/reference/`: Stitch 등 외부 참조 산출물 보관 위치

## 화면별 JS 구조
- `assets/js/pages/home.js`: 홈 화면 전용
- `assets/js/pages/movies.js`: 전체 영화목록 화면 전용
- `assets/js/pages/actors.js`: 주연배우 조회 화면 전용
- `assets/js/pages/categories.js`: 카테고리 조회 화면 전용
- `assets/js/pages/ratings.js`: 평가등급 조회 화면 전용
- `assets/js/pages/admin-dashboard.js`: 관리자 대시보드 전용
- `assets/js/pages/admin-movies.js`: 영화정보 관리 화면 전용
- `assets/js/pages/admin-categories.js`: 카테고리 관리 화면 전용
- `assets/js/pages/admin-actors.js`: 주연배우 관리 화면 전용
- `assets/js/pages/admin-ratings.js`: 평가등급 관리 화면 전용

공통 데이터 접근과 반복 UI 유틸리티만 `assets/js/shared/`에 둡니다.

## 이미지 관리
- 관리 화면의 포스터, 캡쳐, 스냅샷, 대표이미지, 일반이미지는 URL 입력이 아니라 파일 선택 방식입니다.
- 로컬 운영에서는 이미지 파일을 data URL로 변환해 로컬 PostgreSQL의 `media_assets` 테이블에 저장합니다.
- 파일명, MIME 타입, 크기, 객체 경로, 표시 URL 등 메타정보도 `media_assets` 테이블에서 관리합니다.
- 로그인 없이 접속하는 로컬 전용 서비스입니다.

## 로컬 DB 실행

로컬 PC 기준 데이터베이스는 프로젝트 전용 PostgreSQL 데이터 디렉터리와 경량 로컬 API로 실행합니다.

더블클릭 실행:

- `start-cinetube.cmd`: DB/API/웹서버를 켜고 홈 화면을 브라우저로 엽니다.
- `stop-cinetube.cmd`: 로컬 웹서버/API/DB를 중지합니다.

짧은 프롬프트 실행:

```powershell
cd D:\workspace\cinetube
.\ct
```

수동 실행:

```powershell
cd D:\workspace\cinetube
.\scripts\start_local_db.ps1
python -m http.server 8080 --bind 0.0.0.0
```

브라우저에서 `http://localhost:8080`으로 접속합니다. 같은 네트워크의 다른 PC에서는 호스트 PC의 사설 IP를 사용해 `http://<호스트IP>:8080`으로 접속합니다. 예: `http://192.168.0.10:8080`.

기본 설정은 `assets/js/local-db-config.js`의 도메인 기반 API 선택을 사용합니다. `localhost`, `127.0.0.1`, 사설 IP(`192.168.x.x`, `10.x.x.x`, `172.16.x.x`~`172.31.x.x`) 또는 로컬 PC 이름으로 접속하면 같은 호스트의 `:3001` 로컬 API를 사용합니다. Vercel 배포 도메인은 같은 프로젝트의 `/api` Function을 사용합니다. 로그인은 필요하지 않습니다.

다른 PC에서 접속하려면 Windows 방화벽에서 호스트 PC의 TCP `8080`과 `3001` 인바운드를 허용해야 할 수 있습니다. PostgreSQL `54322`는 외부에 열 필요가 없습니다.

## 배포 API 설정

배포본은 브라우저 도메인에 따라 API를 선택합니다. `assets/js/local-db-config.js`의 `cloudUrl`은 기본 `/api`이며, `cinetube-gray.vercel.app` 접속 시 Vercel Python Function을 호출합니다.

배포 API가 Supabase PostgreSQL을 보도록 하려면 API 서버 환경변수에 `DATABASE_URL`을 지정하거나, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE=require`를 설정합니다.

## 클라우드 DB 데이터 마이그레이션

로컬 DB를 먼저 실행한 뒤 아래 스크립트로 현재 Supabase 데이터를 로컬 PostgreSQL로 복사합니다.

```powershell
cd D:\workspace\cinetube
.\scripts\migrate_supabase_to_local.ps1
```

스크립트는 Supabase REST에서 `media_assets`, `categories`, `actors`, `rating_grades`, `movies`를 읽고 `local/backups/`에 JSON/SQL 백업을 만든 뒤 로컬 DB에 적재합니다.

로컬 DB/API 중지는 아래 명령을 사용합니다.

```powershell
.\scripts\stop_local_db.ps1
```

로컬 데이터 검증이 끝난 뒤 클라우드 DB 초기화는 Supabase SQL Editor에서 `supabase/reset_cloud_after_local_migration.sql`을 실행합니다.

## 정적 실행
```powershell
cd D:\workspace\cinetube
python -m http.server 8080 --bind 0.0.0.0
```

설정이 비어 있으면 샘플 데이터로 화면이 동작합니다.











