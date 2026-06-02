$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ConfigPath = Join-Path $ProjectRoot "assets\js\supabase-config.js"
$BackupDir = Join-Path $ProjectRoot "local\backups"
$ImportSqlPath = Join-Path $BackupDir ("supabase_to_local_import_{0}.sql" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
$BackupJsonPath = Join-Path $BackupDir ("supabase_export_{0}.json" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
$Psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

New-Item -ItemType Directory -Force $BackupDir | Out-Null

$config = Get-Content $ConfigPath -Raw
$url = [regex]::Match($config, 'url:\s*"([^"]+)"').Groups[1].Value.TrimEnd("/")
$anonKey = [regex]::Match($config, 'anonKey:\s*"([^"]+)"').Groups[1].Value

if (-not $url -or -not $anonKey) {
  throw "Supabase config was not found in $ConfigPath"
}

function Get-SupabaseTable {
  param([string]$Table)
  $headers = @{
    apikey = $anonKey
    Authorization = "Bearer $anonKey"
  }
  Invoke-RestMethod -Method Get -Uri "$url/rest/v1/$Table`?select=*" -Headers $headers
}

function Sql-Scalar {
  param($Value)
  if ($null -eq $Value) { return "null" }
  if ($Value -is [bool]) {
    if ($Value) { return "true" }
    return "false"
  }
  if ($Value -is [int] -or $Value -is [long] -or $Value -is [decimal] -or $Value -is [double]) {
    return [string]$Value
  }
  $escaped = ([string]$Value).Replace("'", "''")
  return "'$escaped'"
}

function Sql-TextArray {
  param($Value)
  if ($null -eq $Value) { return "array[]::text[]" }
  $items = @($Value)
  if ($items.Count -eq 0) { return "array[]::text[]" }
  return "array[$(($items | ForEach-Object { Sql-Scalar $_ }) -join ",")]::text[]"
}

function Sql-UuidArray {
  param($Value)
  if ($null -eq $Value) { return "array[]::uuid[]" }
  $items = @($Value) | Where-Object { $_ }
  if ($items.Count -eq 0) { return "array[]::uuid[]" }
  return "array[$(($items | ForEach-Object { (Sql-Scalar $_) + '::uuid' }) -join ",")]::uuid[]"
}

function Sql-BigintArray {
  param($Value)
  if ($null -eq $Value) { return "array[]::bigint[]" }
  $items = @($Value) | Where-Object { $_ -ne $null -and $_ -ne "" }
  if ($items.Count -eq 0) { return "array[]::bigint[]" }
  return "array[$(($items | ForEach-Object { [string][long]$_ }) -join ",")]::bigint[]"
}

function Row-Value {
  param($Row, [string]$Column, [string]$Type = "scalar")
  $value = $Row.$Column
  if ($Type -eq "text_array") { return Sql-TextArray $value }
  if ($Type -eq "uuid_array") { return Sql-UuidArray $value }
  if ($Type -eq "bigint_array") { return Sql-BigintArray $value }
  return Sql-Scalar $value
}

function Table-Rows {
  param($Rows)
  $items = @($Rows)
  if ($items.Count -eq 1 -and $items[0] -is [array]) {
    return @($items[0])
  }
  return $items
}

function Insert-Line {
  param([string]$Table, [string[]]$Columns, [string[]]$Values, [switch]$OverrideIdentity)
  $override = ""
  if ($OverrideIdentity) { $override = " overriding system value" }
  "insert into public.$Table ($($Columns -join ","))$override values ($($Values -join ",")) on conflict do nothing;"
}

Write-Host "Exporting cloud Supabase data..."
$export = [ordered]@{
  media_assets = @(Get-SupabaseTable "media_assets")
  categories = @(Get-SupabaseTable "categories")
  actors = @(Get-SupabaseTable "actors")
  rating_grades = @(Get-SupabaseTable "rating_grades")
  movies = @(Get-SupabaseTable "movies")
}
$export | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $BackupJsonPath

$sql = New-Object System.Collections.Generic.List[string]
$sql.Add("begin;")
$sql.Add("truncate table public.movies restart identity cascade;")
$sql.Add("truncate table public.categories cascade;")
$sql.Add("truncate table public.actors restart identity cascade;")
$sql.Add("truncate table public.media_assets cascade;")
$sql.Add("truncate table public.rating_grades cascade;")

foreach ($row in (Table-Rows $export.media_assets)) {
  $cols = "id","bucket_id","object_path","public_url","original_name","mime_type","size_bytes","owner_table","owner_field","owner_id","sort_order","created_at"
  $vals = $cols | ForEach-Object { Row-Value $row $_ }
  $sql.Add((Insert-Line "media_assets" $cols $vals))
}

foreach ($row in (Table-Rows $export.categories)) {
  $cols = "category_code","name","representative_image_url","representative_image_asset_id","is_visible","created_at"
  $vals = $cols | ForEach-Object { Row-Value $row $_ }
  $sql.Add((Insert-Line "categories" $cols $vals))
}

foreach ($row in (Table-Rows $export.actors)) {
  $cols = "id","name","age","height_cm","body_size","debut_year","representative_image_url","representative_image_asset_id","image_urls","image_asset_ids","created_at"
  $vals = @(
    Row-Value $row "id"
    Row-Value $row "name"
    Row-Value $row "age"
    Row-Value $row "height_cm"
    Row-Value $row "body_size"
    Row-Value $row "debut_year"
    Row-Value $row "representative_image_url"
    Row-Value $row "representative_image_asset_id"
    Row-Value $row "image_urls" "text_array"
    Row-Value $row "image_asset_ids" "uuid_array"
    Row-Value $row "created_at"
  )
  $sql.Add((Insert-Line "actors" $cols $vals -OverrideIdentity))
}

foreach ($row in (Table-Rows $export.rating_grades)) {
  $cols = "grade","display_order"
  $vals = $cols | ForEach-Object { Row-Value $row $_ }
  $sql.Add((Insert-Line "rating_grades" $cols $vals))
}

foreach ($row in (Table-Rows $export.movies)) {
  $cols = "id","title","movie_code","category_code","actor_id","actor_ids","director_names","source_url","keywords","rating_grade","video_url","description","poster_url","poster_asset_id","capture_url","capture_asset_id","snapshot_url","snapshot_asset_id","release_month","production_company","recommendation_score","rotten_tomatoes_score","ranking_score","click_count","is_main","created_at"
  $vals = @(
    Row-Value $row "id"
    Row-Value $row "title"
    Row-Value $row "movie_code"
    Row-Value $row "category_code"
    Row-Value $row "actor_id"
    Row-Value $row "actor_ids" "bigint_array"
    Row-Value $row "director_names" "text_array"
    Row-Value $row "source_url"
    Row-Value $row "keywords" "text_array"
    Row-Value $row "rating_grade"
    Row-Value $row "video_url"
    Row-Value $row "description"
    Row-Value $row "poster_url"
    Row-Value $row "poster_asset_id"
    Row-Value $row "capture_url"
    Row-Value $row "capture_asset_id"
    Row-Value $row "snapshot_url"
    Row-Value $row "snapshot_asset_id"
    Row-Value $row "release_month"
    Row-Value $row "production_company"
    Row-Value $row "recommendation_score"
    Row-Value $row "rotten_tomatoes_score"
    Row-Value $row "ranking_score"
    Row-Value $row "click_count"
    Row-Value $row "is_main"
    Row-Value $row "created_at"
  )
  $sql.Add((Insert-Line "movies" $cols $vals -OverrideIdentity))
}

$sql.Add("select setval(pg_get_serial_sequence('public.actors','id'), coalesce((select max(id) from public.actors), 1), true);")
$sql.Add("select setval(pg_get_serial_sequence('public.movies','id'), coalesce((select max(id) from public.movies), 1), true);")
$sql.Add("commit;")
$sql | Set-Content -Encoding UTF8 $ImportSqlPath

Write-Host "Importing data into local PostgreSQL..."
$env:PGHOST = "localhost"
$env:PGPORT = "54322"
$env:PGUSER = "postgres"
$env:PGDATABASE = "cinetube"
& $Psql -f $ImportSqlPath

Write-Host "Migration complete."
Write-Host "Backup JSON: $BackupJsonPath"
Write-Host "Import SQL: $ImportSqlPath"
