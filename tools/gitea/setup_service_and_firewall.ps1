$logPath = "C:\gitea\setup.log"
Start-Transcript -Path $logPath -Append -ErrorAction SilentlyContinue

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[안내] 관리자 권한이 필요하여 UAC 승격 창을 호출합니다..."
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "========================================================"
Write-Host "  CineTube Gitea 서비스 등록 및 방화벽 설정"
Write-Host "========================================================"

# 1. 기존 프로세스 종료
Write-Host "[1/4] 기존 Gitea 수동 프로세스를 종료합니다..."
Get-Process gitea -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. 서비스 등록
Write-Host "[2/4] Gitea Windows 서비스를 등록합니다..."
$existing = Get-Service gitea -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "  - 기존 gitea 서비스 재설정..."
    Stop-Service gitea -Force -ErrorAction SilentlyContinue
    & sc.exe config gitea binPath= "C:\gitea\gitea.exe web --config C:\gitea\custom\conf\app.ini" start= auto
} else {
    Write-Host "  - 새 gitea 서비스 생성..."
    & sc.exe create gitea start= auto binPath= "C:\gitea\gitea.exe web --config C:\gitea\custom\conf\app.ini"
    & sc.exe description gitea "CineTube Gitea Internal Git Server (Auto-Deploy)"
}

# 3. 방화벽 규칙
Write-Host "[3/4] 내부망(192.168.0.0/24) 방화벽 규칙을 적용합니다..."
$rules = @(
    @{ Name = "Gitea Internal Web (3000)"; Port = 3000 },
    @{ Name = "Gitea Internal SSH (2222)"; Port = 2222 },
    @{ Name = "CineTube Internal Web (8080)"; Port = 8080 },
    @{ Name = "CineTube Internal API (3001)"; Port = 3001 }
)
foreach ($r in $rules) {
    Remove-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $r.Port -RemoteAddress "192.168.0.0/24" | Out-Null
    Write-Host "  - 방화벽 등록: $($r.Name)"
}

# 4. 서비스 시작
Write-Host "[4/4] Gitea 서비스를 시작합니다..."
& sc.exe start gitea
Start-Sleep -Seconds 2

Write-Host "========================================================"
Write-Host "  설정이 성공적으로 완료되었습니다!"
Write-Host "  - Gitea 서비스: 자동 시작 등록 완료"
Write-Host "  - 웹 URL: http://192.168.0.2:3000/"
Write-Host "  - 방화벽: 192.168.0.0/24 LAN 한정 허용 완료 (3000, 2222, 8080, 3001)"
Write-Host "========================================================"

Stop-Transcript -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
