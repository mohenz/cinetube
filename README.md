# CineTube

PC 웹 우선, 모바일 반응형 영화정보 관리 사이트입니다. 화면은 단일 앱 파일에 모으지 않고 HTML과 화면 진입 JS를 화면별로 분리했습니다.

## 화면 구조
- `index.html`: Home, 최신등록 8개, 맞춤추천 8개, 카테고리별 평가등급 상위 8개
- `actors.html`: 주연배우 정보와 출연 작품 리스트
- `categories.html`: 카테고리 정보와 작품 리스트
- `ratings.html`: 평가등급별 작품 리스트
- `admin/index.html`: 관리 대시보드
- `admin/movies.html`: 영화정보 관리
- `admin/categories.html`: 카테고리정보 관리
- `admin/actors.html`: 주연배우정보 관리
- `admin/ratings.html`: 평가등급정보 관리

## 화면별 JS 구조
- `assets/js/pages/home.js`: 홈 화면 전용
- `assets/js/pages/actors.js`: 주연배우 조회 화면 전용
- `assets/js/pages/categories.js`: 카테고리 조회 화면 전용
- `assets/js/pages/ratings.js`: 평가등급 조회 화면 전용
- `assets/js/pages/admin-dashboard.js`: 관리자 대시보드 전용
- `assets/js/pages/admin-movies.js`: 영화정보 관리 화면 전용
- `assets/js/pages/admin-categories.js`: 카테고리 관리 화면 전용
- `assets/js/pages/admin-actors.js`: 주연배우 관리 화면 전용
- `assets/js/pages/admin-ratings.js`: 평가등급 관리 화면 전용

공통 데이터 접근과 반복 UI 유틸리티만 `assets/js/shared/`에 둡니다.

## 실행
```powershell
cd D:\workspace\cinetube
python -m http.server 8080
```

브라우저에서 `http://localhost:8080`으로 접속합니다.

## Supabase 설정
1. `supabase/schema.sql`을 Supabase SQL Editor에서 적용합니다.
2. `assets/js/supabase-config.js`에 프로젝트 URL과 anon key를 입력합니다.
3. 관리자 저장 기능은 기본 정책상 Supabase Auth의 authenticated 사용자에게만 허용됩니다.

설정이 비어 있으면 샘플 데이터로 화면이 동작합니다.
