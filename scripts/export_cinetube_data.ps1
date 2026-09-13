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
$DumpExe = Join-Path $PgBin "pg_dump.exe"

if (-not (Test-Path $DumpExe)) {
  throw "pg_dump.exe was not found at $PgBin"
}

$ExportFile = Join-Path $ProjectRoot "local\cinetube_data_migration.sql"
$env:PGPASSWORD = "" # Trust Auth

Write-Host "=============================================="
Write-Host " CineTube Local Database Data Backup (Export) "
Write-Host "=============================================="
Write-Host "Port: 54322 / DB: cinetube"
Write-Host "Export Path: $ExportFile"
Write-Host "Backing up database records... Please wait."

# --data-only --inserts options for clean SQL record restore
& $DumpExe --host=127.0.0.1 --port=54322 --username=postgres -d cinetube --data-only --inserts --column-inserts --file=$ExportFile

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Success! Local database records exported successfully."
  Write-Host "Backup File: $ExportFile"
  Write-Host ""
  Write-Host "=== USB Migration Instructions ==="
  Write-Host "1. Copy B: The entire 'local\media' folder to your USB."
  Write-Host "2. Copy A: The backup SQL file 'local\cinetube_data_migration.sql' to your USB."
  Write-Host "3. On the new PC, clone this CineTube repo."
  Write-Host "4. Run 'start-cinetube.cmd' on the new PC to initialize the PostgreSQL server."
  Write-Host "5. Stop it by running 'stop-cinetube.cmd'."
  Write-Host "6. Paste 'media' folder from USB to 'local\' folder on the new PC (overwrite)."
  Write-Host "7. Paste 'cinetube_data_migration.sql' from USB to 'local\' folder on the new PC."
  Write-Host "8. Run the import script on the new PC:"
  Write-Host "   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\import_cinetube_data.ps1"
} else {
  throw "Database export failed."
}
