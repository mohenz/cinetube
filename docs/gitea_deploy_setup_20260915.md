# Gitea 기반 내부망 배포 환경 구축 완료 보고 및 운용 가이드

## 1. 개요 및 구성 정보
이 PC(내부망 사설 IP: `192.168.0.2`)를 CineTube 운영 서버로 설정하였으며, 다른 PC에서 Gitea로 코드를 push하면 운영 작업 디렉터리(`E:\workspace\cinetube`)로 즉시 자동 배포되도록 구축을 완료하였습니다.

- **Gitea 설치 위치**: `C:\gitea` (바이너리 `C:\gitea\gitea.exe` v1.27.3 64-bit)
- **Gitea 웹 UI 주소**: `http://192.168.0.2:3000/` (로컬: `http://localhost:3000/`)
- **Gitea 관리자 계정**:
  - 아이디: `admin`
  - 비밀번호: `Cinetube1234!`
  - 이메일: `admin@cinetube.local`
- **Gitea Git 저장소 주소**: `http://192.168.0.2:3000/admin/cinetube.git`
- **운영 작업 디렉터리**: `E:\workspace\cinetube`
- **배포 트리거**: 저장소의 `post-receive` 훅 → `scripts/deploy_from_gitea.ps1` 자동 호출

---

## 2. 구축 완료 내역

1. **Gitea 바이너리 설치 및 설정 (`C:\gitea`)**:
   - `gitea.exe` 배치 및 디렉터리(`custom/conf`, `data`, `log`) 생성
   - `custom/conf/app.ini` 설정:
     - SQLite3 독립 DB (`C:/gitea/data/gitea.db`)
     - `HTTP_PORT = 3000`, `DOMAIN = 192.168.0.2`
     - 내부망 보안: `DISABLE_REGISTRATION = true` (외부 가입 차단)
     - `ENABLE_GIT_HOOKS = true` (관리자 훅 허용)
2. **Gitea 관리자 계정 및 `cinetube` 저장소 생성 완료**:
   - 관리자 `admin` 계정 생성 완료
   - `cinetube` 원격 저장소 생성 완료
3. **자동 배포 훅(`post-receive`) 구현 및 실동작 검증 완료**:
   - 위치: `C:\gitea\data\gitea-repositories\admin\cinetube.git\custom_hooks\post-receive`
   - push 수신 시 `E:\workspace\cinetube\scripts\deploy_from_gitea.ps1`를 호출하여 최신 커밋을 `E:\workspace\cinetube`로 즉시 반영
   - 배포 로그 기록: `E:\workspace\cinetube\local\deploy.log`
   - Python API 서버(`local_api.py`) 실행 중일 시 자동 재기동 연동
4. **로컬 Git 저장소 연동 완료**:
   - `E:\workspace\cinetube`에 `gitea` 원격 추가 완료 (`main`, `rename/persona_full`, `check-internal-network-git` 브랜치 push 및 자동 배포 검증 완료)

---

## 3. 원클릭 Windows 서비스 및 방화벽 등록 방법 (관리자 1회 실행)

Windows 백그라운드 서비스 자동 시작 및 `192.168.0.0/24` LAN 한정 방화벽 규칙을 적용하려면 아래 배치 파일을 **마우스 우클릭 → "관리자 권한으로 실행"**해 주시면 됩니다.

- **실행 파일**: [`C:\gitea\setup_service_and_firewall.cmd`](file:///C:/gitea/setup_service_and_firewall.cmd)
  (또는 [`E:\workspace\cinetube\tools\gitea\setup_service_and_firewall.cmd`](file:///e:/workspace/cinetube/tools/gitea/setup_service_and_firewall.cmd))
- **수행 내용**:
  1. `gitea` Windows 서비스를 `auto`(부팅 시 자동 시작)로 등록
  2. Windows Defender 방화벽 인바운드 규칙 등록 (`192.168.0.0/24` 내부망 전용):
     - Gitea 웹/Git: TCP `3000`
     - Gitea SSH: TCP `2222`
     - CineTube 웹 화면: TCP `8080`
     - CineTube 로컬 API: TCP `3001`
  3. `sc start gitea` 서비스 기동

*(서비스 및 방화벽 제거가 필요한 경우 `C:\gitea\uninstall_service_and_firewall.cmd`를 관리자 권한으로 실행하면 됩니다.)*

---

## 4. 다른 PC(개발 PC)에서 사용 및 자동 배포 방법

### 1단계: 원격 저장소 추가
개발 PC의 CineTube 프로젝트 터미널에서 Gitea 원격을 추가합니다:
```bash
git remote add gitea http://192.168.0.2:3000/admin/cinetube.git
```

### 2단계: 코드 푸시 및 자동 배포
작업 후 변경사항을 커밋하고 Gitea로 push합니다:
```bash
git push gitea main
```
push가 완료되는 즉시 이 운영 서버의 Gitea `post-receive` 훅이 작동하여 `E:\workspace\cinetube` 작업 디렉터리에 최신 소스가 1~2초 내로 자동 배포(반영)됩니다.
