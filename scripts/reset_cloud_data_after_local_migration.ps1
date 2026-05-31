$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ConfigPath = Join-Path $ProjectRoot "assets\js\supabase-config.js"

$config = Get-Content $ConfigPath -Raw
$url = [regex]::Match($config, 'url:\s*"([^"]+)"').Groups[1].Value.TrimEnd("/")
$anonKey = [regex]::Match($config, 'anonKey:\s*"([^"]+)"').Groups[1].Value

if (-not $url -or -not $anonKey) {
  throw "Supabase config was not found in $ConfigPath"
}

$headers = @{
  apikey = $anonKey
  Authorization = "Bearer $anonKey"
  Prefer = "return=minimal"
}

function Delete-TableRows {
  param([string]$Table, [string]$Filter)
  Invoke-WebRequest -UseBasicParsing -Method Delete -Uri "$url/rest/v1/$Table`?$Filter" -Headers $headers | Out-Null
}

Write-Host "Resetting cloud CineTube data..."
Delete-TableRows "movies" "id=not.is.null"
Delete-TableRows "categories" "category_code=not.is.null"
Delete-TableRows "actors" "id=not.is.null"
Delete-TableRows "media_assets" "id=not.is.null"
Delete-TableRows "rating_grades" "grade=not.is.null"

$ratingHeaders = @{
  apikey = $anonKey
  Authorization = "Bearer $anonKey"
  Prefer = "return=minimal"
  "Content-Type" = "application/json"
}
$ratings = @(
  @{ grade = "A+"; display_order = 1 },
  @{ grade = "A"; display_order = 2 },
  @{ grade = "B+"; display_order = 3 },
  @{ grade = "B"; display_order = 4 },
  @{ grade = "C"; display_order = 5 }
) | ConvertTo-Json

Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$url/rest/v1/rating_grades" -Headers $ratingHeaders -Body $ratings | Out-Null
Write-Host "Cloud CineTube data reset complete."
