$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LocalDir = Join-Path $ProjectRoot "local"
$WebOutLog = Join-Path $LocalDir "web.out.log"
$WebErrLog = Join-Path $LocalDir "web.err.log"
$Url = "http://localhost:8080/index.html"

New-Item -ItemType Directory -Force $LocalDir | Out-Null

& (Join-Path $ProjectRoot "scripts\start_local_db.ps1")

$webReady = $false
try {
  $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 2
  $webReady = $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
} catch {
  $webReady = $false
}

if (-not $webReady) {
  Start-Process -FilePath "python" -ArgumentList @("-m", "http.server", "8080") -WorkingDirectory $ProjectRoot -WindowStyle Hidden -RedirectStandardOutput $WebOutLog -RedirectStandardError $WebErrLog
  Start-Sleep -Seconds 1
}

Start-Process $Url

Write-Host "CineTube local service is ready."
Write-Host "Open: $Url"
