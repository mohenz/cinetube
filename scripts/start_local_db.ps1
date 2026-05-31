param(
  [switch]$Reset
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PgRoot = "C:\Program Files\PostgreSQL\16"
$PgBin = Join-Path $PgRoot "bin"
$DataDir = Join-Path $ProjectRoot "local\postgres-data"
$LogPath = Join-Path $ProjectRoot "local\postgres.log"
$SchemaPath = Join-Path $ProjectRoot "local\schema.sql"
$MarkerPath = Join-Path $ProjectRoot "local\.schema_applied"
$ApiScript = Join-Path $ProjectRoot "scripts\local_api.py"
$ApiOutLog = Join-Path $ProjectRoot "local\api.out.log"
$ApiErrLog = Join-Path $ProjectRoot "local\api.err.log"

if (-not (Test-Path (Join-Path $PgBin "initdb.exe"))) {
  throw "PostgreSQL 16 was not found at $PgRoot"
}

New-Item -ItemType Directory -Force (Join-Path $ProjectRoot "local") | Out-Null

if ($Reset -and (Test-Path $DataDir)) {
  & (Join-Path $PgBin "pg_ctl.exe") -D $DataDir -m fast stop 2>$null
  Remove-Item -LiteralPath $DataDir -Recurse -Force
  Remove-Item -LiteralPath $MarkerPath -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path $DataDir)) {
  & (Join-Path $PgBin "initdb.exe") -D $DataDir -U postgres --auth=trust --encoding=UTF8 --locale=C
}

$serverReady = & (Join-Path $PgBin "pg_isready.exe") -h localhost -p 54322 2>$null
if ($LASTEXITCODE -ne 0) {
  & (Join-Path $PgBin "pg_ctl.exe") -D $DataDir -o "-p 54322" -l $LogPath start
}

$env:PGHOST = "localhost"
$env:PGPORT = "54322"
$env:PGUSER = "postgres"
$env:PGDATABASE = "postgres"

$dbExists = & (Join-Path $PgBin "psql.exe") -tAc "select 1 from pg_database where datname='cinetube';"
if (-not ($dbExists -match "1")) {
  & (Join-Path $PgBin "createdb.exe") cinetube
}

if (-not (Test-Path $MarkerPath)) {
  & (Join-Path $PgBin "psql.exe") -d cinetube -f $SchemaPath
  if ($LASTEXITCODE -ne 0) {
    throw "Local schema apply failed."
  }
  Set-Content -Encoding UTF8 $MarkerPath (Get-Date -Format o)
}

$runningApi = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*local_api.py*" }
if (-not $runningApi) {
  Start-Process -FilePath "python" -ArgumentList @($ApiScript) -WorkingDirectory $ProjectRoot -WindowStyle Hidden -RedirectStandardOutput $ApiOutLog -RedirectStandardError $ApiErrLog
}

Write-Host "CineTube local DB is running."
Write-Host "Local API: http://localhost:3001"
Write-Host "PostgreSQL: localhost:54322 / db=cinetube / user=postgres / auth=trust"
