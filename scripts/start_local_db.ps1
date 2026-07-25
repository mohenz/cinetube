param(
  [switch]$Reset
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$DataDir = Join-Path $ProjectRoot "local\postgres-data"
$ExistingPgVersionPath = Join-Path $DataDir "PG_VERSION"
$PgInstallations = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
  Sort-Object { [int]$_.Name } -Descending
$ExistingPgVersion = if (Test-Path $ExistingPgVersionPath) { (Get-Content -Raw $ExistingPgVersionPath).Trim() } else { "" }
$PgRoot = if ($ExistingPgVersion) {
  $PgInstallations |
    Where-Object { $_.Name -eq $ExistingPgVersion } |
    Select-Object -First 1 -ExpandProperty FullName
} else {
  $PgInstallations |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $PgRoot) {
  if ($ExistingPgVersion) {
    throw "PostgreSQL $ExistingPgVersion is required for existing data directory $DataDir"
  }
  throw "PostgreSQL was not found under C:\Program Files\PostgreSQL"
}
$PgBin = Join-Path $PgRoot "bin"
$LogPath = Join-Path $ProjectRoot "local\postgres.log"
$SchemaPath = Join-Path $ProjectRoot "local\schema.sql"
$MarkerPath = Join-Path $ProjectRoot "local\.schema_applied"
$ApiScript = Join-Path $ProjectRoot "scripts\local_api.py"
$ApiOutLog = Join-Path $ProjectRoot "local\api.out.log"
$ApiErrLog = Join-Path $ProjectRoot "local\api.err.log"
$RequirementsPath = Join-Path $ProjectRoot "requirements.txt"
$ApiHost = "0.0.0.0"
$ApiPort = "3001"

if (-not (Test-Path (Join-Path $PgBin "initdb.exe"))) {
  throw "PostgreSQL binaries were not found at $PgRoot"
}

python -c "import psycopg" 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "Python package 'psycopg' is required. Run: python -m pip install --user -r `"$RequirementsPath`""
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

$ConfigPaths = @(
  (Join-Path $DataDir "PG_VERSION"),
  (Join-Path $DataDir "postgresql.conf"),
  (Join-Path $DataDir "postgresql.auto.conf")
)
foreach ($ConfigPath in $ConfigPaths) {
  if (Test-Path $ConfigPath) {
    $bytes = [System.IO.File]::ReadAllBytes($ConfigPath)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
      [System.IO.File]::WriteAllBytes($ConfigPath, $bytes[3..($bytes.Length - 1)])
    }
  }
}

$serverReady = & (Join-Path $PgBin "pg_isready.exe") -h 127.0.0.1 -p 54322 2>$null
if ($LASTEXITCODE -ne 0) {
  & (Join-Path $PgBin "pg_ctl.exe") -D $DataDir -o "-p 54322" -l $LogPath start
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL start failed. Check $LogPath"
  }
}

$env:PGHOST = "127.0.0.1"
$env:PGPORT = "54322"
$env:PGUSER = "postgres"
$env:PGDATABASE = "postgres"

$dbExists = & (Join-Path $PgBin "psql.exe") -tAc "select 1 from pg_database where datname='cinetube';"
if ($LASTEXITCODE -ne 0) {
  throw "PostgreSQL connection check failed."
}
if (-not ($dbExists -match "1")) {
  & (Join-Path $PgBin "createdb.exe") cinetube
  if ($LASTEXITCODE -ne 0) {
    throw "Local database creation failed."
  }
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
  $env:PGDATABASE = "cinetube"
  $env:CINETUBE_API_HOST = $ApiHost
  $env:CINETUBE_API_PORT = $ApiPort
  Start-Process -FilePath "python" -ArgumentList @($ApiScript) -WorkingDirectory $ProjectRoot -WindowStyle Hidden -RedirectStandardOutput $ApiOutLog -RedirectStandardError $ApiErrLog
}

$LanIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -First 1 -ExpandProperty IPAddress)

Write-Host "CineTube local DB is running."
Write-Host "Local API: http://127.0.0.1:$ApiPort"
if ($LanIp) {
  Write-Host "LAN API: http://$LanIp`:$ApiPort"
}
Write-Host "PostgreSQL: 127.0.0.1:54322 / db=cinetube / user=postgres / auth=trust"

