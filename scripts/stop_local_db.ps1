$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PgBin = "C:\Program Files\PostgreSQL\16\bin"
$DataDir = Join-Path $ProjectRoot "local\postgres-data"

Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*http.server*8080*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*local_api.py*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

if (Test-Path $DataDir) {
  & (Join-Path $PgBin "pg_ctl.exe") -D $DataDir -m fast stop
}

Write-Host "CineTube local DB stopped."
