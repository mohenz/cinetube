@echo off
chcp 65001 >nul
title CineTube Gitea 서비스 및 방화벽 제거

echo ========================================================
echo   CineTube Gitea 서비스 제거 및 방화벽 규칙 삭제
echo ========================================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [안내] 관리자 권한이 필요합니다. 관리자 권한으로 승격합니다...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~dpnx0' -Verb RunAs"
    exit /b
)

echo Gitea 서비스를 중지하고 삭제합니다...
sc.exe stop gitea >nul 2>&1
sc.exe delete gitea >nul 2>&1

echo 방화벽 규칙을 삭제합니다...
netsh advfirewall firewall delete rule name="Gitea Internal Web (3000)" >nul 2>&1
netsh advfirewall firewall delete rule name="Gitea Internal SSH (2222)" >nul 2>&1
netsh advfirewall firewall delete rule name="CineTube Internal Web (8080)" >nul 2>&1
netsh advfirewall firewall delete rule name="CineTube Internal API (3001)" >nul 2>&1

echo 제거가 완료되었습니다.
pause
