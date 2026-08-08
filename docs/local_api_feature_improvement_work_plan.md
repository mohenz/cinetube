# CineTube 로컬 API 기능개선 작업계획서

## 1. 문서 정보

- 대상 프로젝트: `CineTube`
- 대상 파일: `scripts/local_api.py`
- 작성일: `2026-08-08`
- 기준 환경: 로컬 PostgreSQL `54322`, Python API `3001`, 정적 웹 `8080`
- 현재 규모: `scripts/local_api.py` 2,052줄
- 작업 성격: 기능 단위 모듈 분리, 동시 처리 안정화, 장기적 부하 분산 기반 마련

## 2. 추진 배경

현재 `scripts/local_api.py`는 다음 책임을 한 파일에서 처리한다.

- HTTP 서버와 라우팅
- PostgreSQL 연결 풀과 SQL 실행
- 공통 CRUD와 검색·정렬·페이지네이션
- 로컬 이미지 저장과 썸네일 생성
- 외부 이미지 다운로드와 로컬화
- 영화·배우·웹툰 외부 사이트 파싱
- TMDB API 및 HTML fallback
- DB 통계와 오류 응답

이 구조는 단일 PC에서 간단히 운영하기에는 편리하지만, 한 기능의 변경이 전체 API에 영향을 줄 수 있다. 외부 사이트 응답 지연이나 이미지 변환이 일반 CRUD 요청과 같은 프로세스 자원을 사용하므로 동시 요청이 증가할 때 조회·저장 처리까지 지연될 가능성도 있다.

## 3. 작업 목표

1. 기존 API URL, JSON 응답, 실행 명령을 유지하면서 기능별 모듈로 분리한다.
2. DB 조회·CRUD와 외부 사이트 파싱·이미지 처리를 명확히 분리한다.
3. 기능별 단위테스트와 장애 원인 추적이 가능한 구조를 만든다.
4. 장시간 작업을 백그라운드 작업으로 전환할 수 있는 경계를 마련한다.
5. 향후 API와 Worker를 독립 실행·확장할 수 있도록 구성한다.
6. 운영 DB와 `local/media`의 기존 데이터를 변경하거나 초기화하지 않는다.

## 4. 비목표

이번 기본 분리 작업에는 다음 변경을 포함하지 않는다.

- 화면 UI 개편
- DB 테이블 변경 또는 데이터 마이그레이션
- 인증·권한 정책 변경
- Supabase Storage 강제 전환
- 외부 메시지 큐나 신규 프레임워크 도입
- 기존 API 경로와 응답 형식 변경

DB 작업 큐나 클라우드 Storage가 필요한 단계는 별도 승인 후 진행한다.

## 5. 목표 아키텍처

```text
브라우저
   |
HTTP Handler
   |-- CRUD Repository ------ PostgreSQL
   |-- Media Service -------- local/media 또는 공용 Storage
   `-- Import Service ------- 외부 영화·배우·웹툰 사이트
              |
        선택적 Background Job
              |
            Worker
```

### 5.1 목표 파일 구조

```text
scripts/
|-- local_api.py
|-- local_worker.py                 # 백그라운드 작업 도입 시 추가
`-- cinetube_api/
    |-- __init__.py
    |-- config.py
    |-- tables.py
    |-- database.py
    |-- queries.py
    |-- repository.py
    |-- media.py
    |-- http_client.py
    |-- jobs.py                     # 승인된 비동기 작업만 담당
    |-- handler.py
    `-- importers/
        |-- __init__.py
        |-- common.py
        |-- movie.py
        |-- tmdb.py
        |-- actor.py
        `-- webtoon.py
```

### 5.2 의존 방향

```text
config / tables
       |
database / http_client
       |
queries
       |
repository / media / importers
       |
jobs
       |
handler
       |
local_api.py
```

- 하위 계층은 상위 계층을 import하지 않는다.
- `repository`와 `media`가 서로 직접 순환 참조하지 않도록 조정 계층을 둔다.
- DB 연결 풀은 프로세스당 하나만 생성한다.
- 외부 사이트 파서는 DB와 HTTP Handler를 직접 참조하지 않는다.

## 6. 세부 작업 범위

### 6.1 설정과 테이블 정의 분리

`config.py` 책임:

- `DATABASE_URL`, `PG*` 환경변수
- API 호스트·포트
- 프로젝트 및 미디어 경로
- DB 연결 풀 크기
- 외부 요청 timeout 기본값

`tables.py` 책임:

- CRUD 허용 테이블
- 테이블별 기본키
- 등록·수정 가능 컬럼
- 검색 대상 컬럼
- 최대 페이지 크기
- 지원하는 외부 가져오기 사이트

### 6.2 DB와 SQL 계층 분리

`database.py` 책임:

- PostgreSQL 연결 생성
- 연결 풀 대여·반납
- 손상 연결 폐기
- SQL 실행
- 테이블 컬럼 메타데이터 캐시

`queries.py` 책임:

- 필터 조건 생성
- 검색 조건 생성
- 정렬 컬럼 검증
- 페이지네이션
- 전체 건수 조회
- JSON과 PostgreSQL 레코드 변환

`repository.py` 책임:

- 목록·단건 조회
- 등록·수정·삭제
- DB 통계
- 테이블과 컬럼 화이트리스트 적용

### 6.3 이미지 처리 분리

`media.py` 책임:

- Base64 data URL 해석
- 안전한 파일 경로 생성
- 원본 이미지 저장
- 300px WebP 썸네일 생성
- 외부 이미지 다운로드
- `media_assets` 메타데이터 생성
- 영화·배우·웹툰 등록 후 외부 이미지 로컬화

이미지 저장과 DB 레코드 생성 중 하나가 실패할 경우 불완전 파일이나 고아 레코드가 남지 않도록 보상 처리 방식을 정의한다.

### 6.4 외부 요청과 파서 분리

`http_client.py` 책임:

- User-Agent·Referer 헤더
- SSL 설정
- 쿠키 처리
- 외부 요청 timeout
- 응답 크기 제한
- 네트워크 오류 표준화

`importers/common.py` 책임:

- HTML 텍스트 정리
- Open Graph와 JSON-LD 분석
- 링크·이미지 후보 추출
- 상대 URL 변환
- 작품번호와 URL slug 분석

도메인별 책임:

- `movie.py`: Javtiful, Supjav, 123AV/MissAV
- `tmdb.py`: TMDB API, 공개 페이지 fallback
- `actor.py`: AVDBS 배우정보
- `webtoon.py`: MangaDistrict, MangaDNA, Hentai18, IMHentai

각 파서는 표준화된 `dict`만 반환하며 DB 저장을 직접 수행하지 않는다.

### 6.5 HTTP Handler 분리

`handler.py` 책임:

- `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`
- URL·쿼리·JSON 요청 파싱
- 서비스와 저장소 호출
- HTTP 상태코드와 JSON 응답
- CORS 헤더
- 공통 오류 변환

`scripts/local_api.py`는 `Handler`를 재노출하고 서버만 시작하는 호환성 진입점으로 축소한다. Vercel의 `from scripts.local_api import Handler` 계약은 유지한다.

## 7. 동시 처리 및 분산 개선

### 7.1 요청 유형 분리

즉시 처리 요청:

- 상태 확인
- 목록·상세 조회
- 일반 CRUD
- DB 통계

장시간 처리 후보:

- 외부 영화·배우·웹툰 가져오기
- 외부 이미지 일괄 다운로드
- 이미지 변환과 썸네일 생성
- 대량 데이터 등록

장시간 작업을 일반 CRUD 요청과 같은 실행 흐름에서 분리하면 외부 사이트 지연이 조회 API에 직접 전파되는 문제를 줄일 수 있다.

### 7.2 1단계 동시 처리 안정화

- 외부 HTTP 요청에 연결·읽기 timeout 적용
- 이미지 최대 크기와 응답 크기 제한
- DB 연결 풀 대기 timeout 적용
- 요청별 처리시간 로그 추가
- 외부 요청 실패를 DB 장애와 분리해 기록
- 동시 요청 중 연결 풀 고갈과 교착 여부 검증

이 단계는 별도 프로세스나 DB 스키마 추가 없이 수행한다.

### 7.3 2단계 백그라운드 Worker

사용자 승인 후 PostgreSQL 기반 작업 큐를 검토한다.

- `background_jobs` 테이블에 작업 유형·상태·입력·결과·오류 저장
- API는 장시간 작업 등록 후 `202 Accepted`와 작업 ID 반환
- Worker는 `FOR UPDATE SKIP LOCKED` 방식으로 작업 선점
- 성공·실패·재시도 횟수 기록
- 작업 상태 조회 API 제공
- API 프로세스와 Worker 프로세스를 독립 실행

PostgreSQL을 작업 큐로 재사용하면 새로운 Redis·RabbitMQ 의존성을 추가하지 않고 로컬 운영 구조를 유지할 수 있다. 이 단계는 DB 스키마 변경이므로 사용자 명시 승인 전에 실행하지 않는다.

### 7.4 3단계 실행 인스턴스 분산

- API 프로세스와 Import Worker를 별도 프로세스로 운영
- Worker 수를 외부 요청량과 이미지 처리량에 맞게 조절
- 여러 서버에서 실행할 경우 이미지 저장소를 공용 Storage로 전환
- 로컬 디스크 경로를 DB에 직접 의존하지 않도록 Storage 인터페이스 도입
- Vercel에서는 `/api` 인스턴스 자동 확장과 PostgreSQL 연결 수 제한을 함께 검증

## 8. 작업 단계

### 단계 0. 기준선 확보

- 현재 API 엔드포인트와 응답 형식 목록화
- 주요 함수 입력·출력 fixture 생성
- `python -m py_compile scripts/local_api.py` 실행
- 기존 로컬 API 상태·조회 흐름 확인
- 운영 DB와 미디어 파일의 읽기 전용 기준 정보 기록

완료 조건: 리팩터링 전 동작을 비교할 기준과 회귀 테스트가 존재한다.

### 단계 1. 순수 설정·유틸리티 분리

- `config.py`, `tables.py`, `importers/common.py` 생성
- 순수 함수부터 이동
- 기존 함수 이름과 반환 형식 유지

완료 조건: API 동작과 Git diff상 데이터 변경이 없고 정적 검증이 통과한다.

### 단계 2. DB·SQL·Repository 분리

- `database.py`, `queries.py`, `repository.py` 생성
- CRUD Handler가 Repository만 호출하도록 변경
- 연결 풀과 캐시가 중복 생성되지 않는지 확인

완료 조건: 10개 테이블의 조회·등록·수정·삭제 회귀 테스트가 통과한다.

### 단계 3. 미디어 분리

- `media.py` 생성
- 파일 업로드·외부 URL 가져오기·썸네일 생성 이동
- CRUD 후 이미지 자동 로컬화 연결

완료 조건: 원본·썸네일·DB 메타데이터 경로가 기존과 동일하다.

### 단계 4. 도메인 파서 분리

- 영화·TMDB·배우·웹툰 파서를 독립 모듈로 이동
- 외부 HTML fixture 기반 단위테스트 추가
- 원격 사이트 실패 fallback 검증

완료 조건: 사이트별 정상·차단·불완전 HTML 입력 결과가 기존 계약과 일치한다.

### 단계 5. Handler와 진입점 정리

- `handler.py` 생성
- `local_api.py`를 호환성 진입점으로 축소
- 로컬 실행과 Vercel import 경로 확인
- 이전 중복 코드 제거

완료 조건: 기존 실행 명령과 Vercel `Handler` import가 유지된다.

### 단계 6. 동시 처리 안정화

- timeout·크기 제한·처리시간 로그 적용
- DB 풀 대기와 외부 요청 지연 상황 검증
- 장시간 작업 후보의 실행 경계 확정

완료 조건: 외부 가져오기 요청 중에도 일반 조회 API가 오류 없이 응답한다.

### 단계 7. 선택적 Worker 도입

- 사용자 승인 후 DB 작업 큐 설계·마이그레이션
- Worker 실행 스크립트와 상태 조회 API 추가
- 실패·재시도·중복 실행 방지 검증

완료 조건: Import·이미지 작업이 API 요청 스레드와 독립적으로 실행된다.

## 9. 검증 계획

### 9.1 정적 검증

- 모든 Python 모듈 `py_compile`
- import 순환 검사
- 사용하지 않는 이전 함수와 중복 상수 확인
- `git diff --check`

### 9.2 단위테스트

- SQL 필터·검색·정렬·페이지네이션
- HTML·JSON-LD·메타 태그 파싱
- 작품번호와 URL 정규화
- 이미지 확장자와 안전 경로 생성
- 사이트별 정상·실패 fallback

새 테스트 프레임워크를 추가하지 않고 Python 표준 `unittest`를 우선 사용한다.

### 9.3 통합테스트

- 별도 테스트 DB 또는 트랜잭션 롤백 사용
- 10개 테이블 CRUD
- 이미지 업로드와 메타데이터 연결
- `/health`, DB 통계, Import API
- 기존 JSON 응답 필드와 상태코드 비교

### 9.4 동시성 테스트

- 다수의 동시 목록 조회
- 조회와 CRUD 동시 실행
- 외부 가져오기 중 일반 조회 실행
- 이미지 처리 중 DB 연결 풀 상태 확인
- 오류·timeout 후 연결 풀이 정상 복구되는지 확인

운영 DB 데이터는 동시성 테스트에 사용하지 않는다.

### 9.5 브라우저 회귀

- 홈·영화·배우·웹툰·갤러리 공개 화면
- 관리자 조회·등록·수정 흐름
- 이미지 원본과 썸네일 표시
- API 오류 시 사용자 메시지와 샘플 fallback

## 10. 완료 기준

- `scripts/local_api.py`가 서버 실행과 `Handler` 재노출만 담당한다.
- DB·SQL·미디어·외부 파서·HTTP 책임이 독립 모듈로 분리된다.
- 기존 API URL, 환경변수, JSON 형식이 유지된다.
- 로컬 실행 `3001`과 Vercel `api/index.py` import가 정상이다.
- 기존 DB 데이터와 `local/media` 파일이 변경·삭제되지 않는다.
- 기능별 단위테스트와 핵심 API 통합테스트가 통과한다.
- 장시간 작업을 Worker로 이전할 수 있는 명확한 서비스 경계가 존재한다.

## 11. 리스크 및 대응

| 리스크 | 대응 |
|---|---|
| 함수 이동 중 반환 형식 변경 | 기존 응답 fixture 비교 |
| import 순환 | 단방향 의존 규칙 적용 |
| DB 연결 풀 중복 생성 | `database.py` 단일 모듈에서만 풀 생성 |
| 미디어 파일과 DB 불일치 | 보상 처리 및 통합테스트 |
| 외부 사이트 HTML 변경 | 저장된 fixture와 fallback 테스트 |
| Vercel import 실패 | `scripts.local_api.Handler` 호환 경로 유지 |
| Worker 중복 실행 | DB 작업 선점과 상태 전이 원자화 |
| 공용 Storage 없이 다중 서버 실행 | 분산 실행 전 Storage 전환을 필수 조건으로 설정 |

## 12. 변경 및 롤백 전략

- 한 단계당 하나의 독립 커밋을 원칙으로 한다.
- 각 단계에서 전체 API를 교체하지 않고 기존 호출부를 점진적으로 새 모듈에 연결한다.
- 단계별 검증 실패 시 해당 단계 커밋만 되돌릴 수 있도록 유지한다.
- DB 스키마 변경, 데이터 이관, 파일 이동은 별도 승인 전 수행하지 않는다.
- 인증·권한·CORS 보안 개선은 기능 분리 완료 후 별도 변경으로 진행한다.

## 13. 산출물

- 기능별 Python 모듈
- 기존 API 계약 목록
- 파서 fixture와 단위테스트
- CRUD·이미지 통합테스트
- 동시성 검증 결과
- 로컬 실행 및 장애 대응 문서
- 선택 단계 진행 시 Worker 운영 문서와 DB 마이그레이션 계획

## 14. 승인 지점

1. 모듈 분리 착수 승인
2. 모듈 분리 완료 및 회귀 결과 승인
3. 동시 처리 안정화 적용 승인
4. `background_jobs` 스키마 변경 승인
5. Worker 분리 적용 승인
6. 공용 Storage 또는 클라우드 분산 운영 전환 승인
