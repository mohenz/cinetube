$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# 1. Locate PostgreSQL Installation
$PgInstallations = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
  Sort-Object { [int]$_.Name } -Descending
if (-not $PgInstallations) {
  throw "PostgreSQL installation was not found under C:\Program Files\PostgreSQL"
}
$PgRoot = $PgInstallations[0].FullName
$PgBin = Join-Path $PgRoot "bin"
$PsqlExe = Join-Path $PgBin "psql.exe"

if (-not (Test-Path $PsqlExe)) {
  throw "psql.exe was not found at $PgBin"
}

$ImportFile = Join-Path $ProjectRoot "local\cinetube_data_migration.sql"
if (-not (Test-Path $ImportFile)) {
  throw "Migration backup SQL file was not found: $ImportFile. Please copy 'cinetube_data_migration.sql' from your USB to the 'local' folder first."
}

# Verify local DB is running
$serverReady = & (Join-Path $PgBin "pg_isready.exe") -h 127.0.0.1 -p 54322 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "CineTube local database is not running. Please start 'start-cinetube.cmd' once first to turn on the DB, then run this script."
}

$env:PGPASSWORD = "" # Trust Auth

Write-Host "=============================================="
Write-Host " CineTube Local Database Data Inject (Import) "
Write-Host "=============================================="
Write-Host "Port: 54322 / DB: cinetube"
Write-Host "Source File: $ImportFile"
Write-Host "Wiping empty tables to prevent duplicate key collisions..."

# Wipe tables cleanly to avoid primary key constraints on fresh initialization
& $PsqlExe -h 127.0.0.1 -p 54322 -U postgres -d cinetube -c "TRUNCATE TABLE movies, categories, actors, ratings, common_codes, webtoons, webtoon_chapters, media_assets, background_jobs CASCADE;"

Write-Host "Restoring data records from SQL file..."
& $PsqlExe -h 127.0.0.1 -p 54322 -U postgres -d cinetube -f $ImportFile

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Success! All database records migrated successfully to the new PC."
  Write-Host "Run 'start-cinetube.cmd' to enjoy your fully migrated CineTube service!"
} else {
  throw "Database import failed."
}
