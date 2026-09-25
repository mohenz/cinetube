# CineTube 내부망 개발 PC 환경 구성 및 협업 가이드 (Gitea 연동)

이 문서는 동일 내부망(LAN, `192.168.0.0/24`) 환경의 **다른 개발 PC**에서 CineTube 저장소를 클론하고, 코드를 수정하여 커밋 및 푸시함으로써 운영 서버(`192.168.0.2`)에 자동 배포하는 전체 과정을 안내합니다.

---

## 1. 운영 서버 및 서비스 기본 정보

| 항목 | 주소 / 정보 | 비고 |
| :--- | :--- | :--- |
| **운영 서버 IP** | `192.168.0.2` | 동일 공유기(LAN) 연결 필수 |
| **Gitea 웹 UI** | `http://192.168.0.2:3000/` | 브라우저에서 저장소 및 커밋 열람 |
| **Git 저장소 Clone/Push URL** | `http://192.168.0.2:3000/admin/cinetube.git` | HTTP Git 프로토콜 |
| **Gitea 기본 계정** | 아이디: `admin` / 비밀번호: `Cinetube1234!` | 개발자 공용/관리자 계정 |
| **운영 웹 화면** | `http://192.168.0.2:8080/index.html` | 배포 결과 즉시 확인 |
| **운영 로컬 API** | `http://192.168.0.2:3001/` | 백엔드 API 서비스 |

---

## 2. 개발 PC 사전 준비

### 1) 네트워크 연결 확인
개발 PC가 운영 서버와 같은 내부망(`192.168.0.x`)에 연결되어 있는지 확인합니다.
- 개발 PC 터미널(CMD 또는 PowerShell)에서 핑 테스트:
  ```cmd
  ping 192.168.0.2
  ```
- 브라우저를 열고 `http://192.168.0.2:3000/`에 접속하여 Gitea 웹 화면이 뜨는지 확인합니다.

### 2) Git 설치 확인
Git이 설치되어 있지 않다면 [Git for Windows 공식 사이트](https://git-scm.com/)에서 설치합니다.
```cmd
git --version
```

### 3) Git 사용자 정보 설정 (최초 1회)
커밋 작성자 정보를 본인의 이름과 이메일로 등록합니다.
```bash
git config --global user.name "홍길동"
git config --global user.email "your_email@example.com"
```

---

## 3. 저장소 클론 (Clone)

### Case A: 새로 프로젝트를 내려받는 경우 (신규 개발 PC)
원하는 작업 폴더(예: `C:\workspace` 또는 `D:\workspace`)로 이동한 후 클론합니다:

```bash
cd C:\workspace
git clone http://192.168.0.2:3000/admin/cinetube.git
cd cinetube
```

> **🔑 자격 증명(인증) 입력 창이 나타나는 경우:**
> - Username: `admin`
> - Password: `Cinetube1234!`
>
> *(Windows 자격 증명 관리자에 한 번 저장되면 이후에는 자동으로 로그인됩니다.)*

---

### Case B: 이미 CineTube 코드를 가지고 있는 경우 (기존 작업 폴더)
기존 프로젝트 폴더에 Gitea 원격 저장소를 추가합니다:

```bash
cd E:\workspace\cinetube

# 1. Gitea 원격 저장소 추가
git remote add gitea http://192.168.0.2:3000/admin/cinetube.git

# 2. 최신 코드 동기화
git fetch gitea
```

---

## 4. 작업, 커밋 및 푸시 (자동 배포)

개발 PC에서 코드를 수정하고 Gitea로 push하면, 운영 서버의 `post-receive` 훅이 즉각 작동하여 **1~2초 내로 운영 서버 작업 트리에 코드가 반영**됩니다.

### 1) 변경 사항 확인 및 커밋
작업 완료 후 변경된 파일을 스테이징하고 커밋합니다:
```bash
# 상태 확인
git status

# 변경된 파일 스테이징
git add .

# 커밋 메시지 작성
git commit -m "feat: 메타데이터 카드 UI 개선 및 로컬 API 연동 버그 수정"
```

### 2) Gitea로 푸시 (Push)
```bash
# main 브랜치로 작업 중인 경우
git push gitea main

# (참고) 클론 시 기본 원격이 origin으로 설정된 경우
git push origin main
```

### 3) 자동 배포 성공 메시지 확인
Push 시 터미널 콘솔에 아래와 같은 서버 배포 로그가 실시간 출력됩니다:
```text
remote: ======================================================
remote: >> [Gitea Auto-Deploy] Push detected: branch 'main'
remote: >> [Gitea Auto-Deploy] Deploying to E:/workspace/cinetube...
remote: ======================================================
remote: [2026-09-15 23:00:00] [CineTube Auto-Deploy] Processing push for branch: main
remote: Working tree updated to main (clean reset).
remote: Restarting CineTube local_api.py to apply backend code updates...
remote: CineTube local_api.py restarted.
remote: [2026-09-15 23:00:02] [CineTube Auto-Deploy] Deployment completed successfully.
To http://192.168.0.2:3000/admin/cinetube.git
   123b980..a74c89f  main -> main
```

### 4) 운영 서버에서 반영 결과 확인
브라우저에서 운영 서버 주소에 접속하여 새로고침(Ctrl + F5)합니다:
- 웹 화면: `http://192.168.0.2:8080/index.html`
- API 상태: `http://192.168.0.2:3001/health`

---

## 5. 개발 PC에서 크롬 확장 프로그램(영화 등록 도구) 연동

개발 PC에서도 123AV / MissAV 상세 페이지에서 비디오 메타데이터를 원격 운영 서버로 바로 등록할 수 있습니다.

1. 개발 PC 크롬 브라우저에서 `chrome://extensions/`로 이동합니다.
2. 우측 상단 **[개발자 모드]**를 켭니다.
3. **[압축해제된 확장 프로그램을 로드합니다]**를 클릭하고, 클론받은 프로젝트 내 `tools/chrome-extension/` 폴더를 선택합니다.
4. 브라우저 툴바의 **CineTube Exporter** 아이콘(🎬)을 클릭합니다.
5. 상단의 **⚙️ [서버 설정]**을 클릭하고 운영 서버 주소를 입력합니다:
   - 입력: `http://192.168.0.2:3001`
6. **[연결 테스트]** 버튼을 눌러 `✅ 연결 성공` 메시지가 뜨는지 확인합니다.
7. 이제 123AV/MissAV 사이트에서 상세 페이지를 열고 영상을 1~2초 재생한 뒤 **[CineTube로 영화 등록]**을 누르면 운영 서버의 데이터베이스로 직접 저장됩니다.

---

## 6. 자주 묻는 질문 및 트러블슈팅 (FAQ)

### Q1. `git clone` 또는 `push` 시 `Failed to connect to 192.168.0.2 port 3000: Timed out` 에러가 발생합니다.
- **원인 1**: 개발 PC와 운영 서버가 서로 다른 공유기(네트워크 대역)에 연결되어 있을 수 있습니다. 양쪽 PC가 모두 `192.168.0.x` 대역인지 확인하세요.
- **원인 2**: 운영 서버의 Windows 방화벽에서 포트 3000이 차단되어 있을 수 있습니다. 운영 서버에서 `C:\gitea\setup_service_and_firewall.cmd`를 관리자 권한으로 한 번 실행해 주면 즉시 해결됩니다.

### Q2. `HTTP 401 Unauthorized` 또는 인증 오류가 발생합니다.
- Git 자격 증명이 잘못 캐시되었을 수 있습니다.
- Windows 제어판 → **자격 증명 관리자** → **Windows 자격 증명**에서 `192.168.0.2` 관련 항목을 찾아 사용자 이름을 `admin`, 비밀번호를 `Cinetube1234!`로 업데이트하거나 삭제 후 다시 시도하세요.

### Q3. Push는 성공했는데 운영 서버 웹 화면에 변경 사항이 안 보입니다.
- 브라우저 캐시 문제일 수 있으므로 **`Ctrl + Shift + R`** (강력 새로고침)을 시도하세요.
- 운영 서버의 `local/deploy.log` 파일을 확인하여 자동 배포 스크립트 실행 이력을 검토합니다:
  ```cmd
  type E:\workspace\cinetube\local\deploy.log
  ```
- 운영 서버가 현재 체크아웃하고 있는 브랜치(`git rev-parse --abbrev-ref HEAD`)와 푸시한 브랜치가 일치하는지 확인하세요. 기본 배포 브랜치는 `main`입니다.
