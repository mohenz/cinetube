@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_service_and_firewall.ps1"
if %errorlevel% neq 0 (
    echo.
    echo 오류가 발생했습니다. C:\gitea\setup.log 를 확인해 주세요.
    pause
)
