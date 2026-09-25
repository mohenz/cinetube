# 개발 PC의 Gitea 연결과 배포 절차

구성일: 2026-09-15

## 환경

- 개발 경로: `D:\workspace\cinetube`
- 운영 경로: 서버 `192.168.0.2`의 `E:\workspace\cinetube`
- `gitea`: `http://192.168.0.2:3000/admin/cinetube.git`
- `origin`: 기존 GitHub 저장소 유지
- 기본 push 대상: `gitea`, `push.default=simple`
- 로컬 `main`은 `gitea/main`, `rename/persona_full`은 동명의 Gitea 브랜치 추적
- Python 3.10.11, psycopg 3.3.4, Pillow 12.1.1 설치 확인
- PostgreSQL 16 및 18 설치 디렉터리 확인

이 Git 설정은 현재 PC의 `.git/config`에 적용되어 다른 PC로 자동 복사되지 않습니다.

## 개발

```powershell
git fetch gitea
git status -sb
# 필요한 파일만 선택해 커밋합니다.
git add -- <변경한파일>
git commit -m "변경 내용"
git push
```

현재 개발 브랜치의 push는 운영 main 배포와 별개입니다. 새 작업 브랜치는
`git push -u gitea <브랜치>`로 최초 등록합니다.
GitHub로 전송할 때는 `git push origin <브랜치>`를 명시합니다.

로컬 개발 실행은 `start-cinetube.cmd`, 종료는 `stop-cinetube.cmd`입니다.
로컬 API의 기본 DB는 `127.0.0.1:54322`입니다. 운영 데이터를 개발 DB로 직접 연결하지 않습니다.
장시간 작업을 개발 환경에서 실행하려면 별도 터미널에서 `python scripts/local_worker.py`를 실행합니다.

## 운영 배포

현재 개발 브랜치에는 운영 main보다 앞선 변경이 있으므로 배포할 변경을 먼저 검토합니다.
아래는 작업 트리가 깨끗하고 배포 대상 커밋 검토가 끝난 경우의 절차입니다.

```powershell
python scripts/check_module_layers.py
python -m unittest discover -s tests -t .
git switch main
git pull --ff-only gitea main
git merge --ff-only <검토한개발브랜치>
git push gitea main
```

fast-forward가 불가능하면 중단하고 브랜치 차이를 검토합니다.
내부 Git 가이드에 따르면 main push의 서버 post-receive 훅이 코드를 반영하고 API를 재시작합니다.
push 로그의 배포 성공 여부와 아래 주소를 확인합니다.

- 웹: `http://192.168.0.2:8080/index.html`
- API: `http://192.168.0.2:3001/health`
- 서버 배포 로그: `E:\workspace\cinetube\local\deploy.log`

Git push 성공과 서버 배포 성공은 별도로 확인해야 합니다.
DB 마이그레이션 및 Worker 재시작은 가이드의 자동 배포 보장 범위에 포함되어 있지 않습니다.
DB 덤프, 이미지, 비밀번호는 커밋하지 않습니다.
인증이 필요하면 Git 자격 증명 창을 사용합니다.

## 확장 프로그램

`tools/chrome-extension`을 로드하고 서버 설정에
`http://192.168.0.2:3001`을 입력한 뒤 연결 테스트를 수행합니다.
브라우저에 저장된 서버 주소는 Git 설정과 별개입니다.
