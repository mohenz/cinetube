$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$configPath = Join-Path $projectRoot "assets/js/supabase-config.js"
$config = Get-Content $configPath -Raw

$url = [regex]::Match($config, 'url:\s*"([^"]+)"').Groups[1].Value
$key = [regex]::Match($config, 'anonKey:\s*"([^"]+)"').Groups[1].Value

if (-not $url -or -not $key) {
  throw "Supabase config is missing url or anonKey."
}

$headers = @{
  apikey = $key
  Authorization = "Bearer $key"
  "Content-Type" = "application/json"
  Accept = "application/json"
}

function Invoke-CineRest {
  param(
    [Parameter(Mandatory=$true)][string]$Method,
    [Parameter(Mandatory=$true)][string]$Path,
    [object]$Body = $null,
    [hashtable]$ExtraHeaders = @{}
  )

  $requestHeaders = $headers.Clone()
  foreach ($name in $ExtraHeaders.Keys) {
    $requestHeaders[$name] = $ExtraHeaders[$name]
  }

  $uri = "$url/rest/v1/$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $requestHeaders
  }

  $json = $Body | ConvertTo-Json -Depth 8
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $requestHeaders -Body $json
}

$category = @{
  category_code = "prestige-exclusive"
  name = "Prestige Exclusive"
  is_visible = $true
}

Invoke-CineRest `
  -Method "Post" `
  -Path "categories?on_conflict=category_code" `
  -Body @($category) `
  -ExtraHeaders @{ Prefer = "resolution=merge-duplicates,return=representation" } | Out-Null

$actorName = "Yatsugake Umi"
$encodedActorName = [uri]::EscapeDataString($actorName)
$existingActors = Invoke-CineRest -Method "Get" -Path "actors?select=id,name&name=eq.$encodedActorName"

if ($existingActors.Count -gt 0) {
  $actorId = $existingActors[0].id
  $actorAction = "reused"
} else {
  $createdActor = Invoke-CineRest `
    -Method "Post" `
    -Path "actors" `
    -Body @(@{
      name = $actorName
      age = 25
      height_cm = 160
      body_size = "B80(C)-W57-H85"
      debut_year = 2020
      image_urls = @()
      image_asset_ids = @()
    }) `
    -ExtraHeaders @{ Prefer = "return=representation" }

  $actorId = $createdActor[0].id
  $actorAction = "created"
}

$movies = @(
  @{
    title = "ABF-270 성욕에 지배된 미대생 커플의 동거 질 내 사정 성교록. 하치카케 우미"
    movie_code = "ABF-270"
    category_code = "prestige-exclusive"
    actor_id = $actorId
    keywords = @("Umi Yatsugake", "Prestige", "Featured Actress")
    rating_grade = "B"
    video_url = "https://javtiful.com/kr/video/94468/abf-270"
    description = "Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다."
    poster_url = "https://javtiful.com/uploads/uploads/videos/thumbs/2025/09/25/87f051985acae6ad87451ad544a1cd2c.jpg"
    release_month = "2026"
    production_company = "Prestige"
    recommendation_score = 70
  },
  @{
    title = "ABF-260 신 테크 단지 10 분간 참을 수 있다면 ... 보상 나마 질 내 사정"
    movie_code = "ABF-260"
    category_code = "prestige-exclusive"
    actor_id = $actorId
    keywords = @("Umi Yatsugake", "Prestige", "Featured Actress")
    rating_grade = "B"
    video_url = "https://javtiful.com/kr/video/91587/abf-260"
    description = "Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다."
    poster_url = "https://javtiful.com/uploads/uploads/videos/thumbs/2025/08/21/92b19ba9a184d47fa78eea174e1d3ba9.jpg"
    release_month = "2026"
    production_company = "Prestige"
    recommendation_score = 70
  },
  @{
    title = "ABF-251 아저씨가 좋아 깜짝 미소녀와 이챠베로 3실전"
    movie_code = "ABF-251"
    category_code = "prestige-exclusive"
    actor_id = $actorId
    keywords = @("Umi Yatsugake", "Prestige", "Featured Actress")
    rating_grade = "B"
    video_url = "https://javtiful.com/kr/video/89616/abf-251"
    description = "Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다."
    poster_url = "https://javtiful.com/uploads/uploads/videos/thumbs/2025/07/24/aa44a435658f56522afae559b30e6221.jpg"
    release_month = "2025"
    production_company = "Prestige"
    recommendation_score = 70
  },
  @{
    title = "ABF-241 아침 발치치 ○ 포에서 일어나서 하메 걷는 토요일."
    movie_code = "ABF-241"
    category_code = "prestige-exclusive"
    actor_id = $actorId
    keywords = @("Umi Yatsugake", "Prestige", "Featured Actress")
    rating_grade = "B"
    video_url = "https://javtiful.com/kr/video/87724/abf-241"
    description = "Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다."
    poster_url = "https://javtiful.com/uploads/uploads/videos/thumbs/2025/06/26/2417207d15546f21d143f9f44d56473a.jpg"
    release_month = "2025"
    production_company = "Prestige"
    recommendation_score = 70
  },
  @{
    title = "ABF-231 설마의, 뒤 옵 유혹"
    movie_code = "ABF-231"
    category_code = "prestige-exclusive"
    actor_id = $actorId
    keywords = @("Umi Yatsugake", "Prestige", "Featured Actress")
    rating_grade = "B"
    video_url = "https://javtiful.com/kr/video/85481/abf-231"
    description = "Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다."
    poster_url = "https://javtiful.com/uploads/uploads/videos/thumbs/2025/05/22/002d1d7fe76caf242b6d5015a89ce07e.jpg"
    release_month = "2025"
    production_company = "Prestige"
    recommendation_score = 70
  },
  @{
    title = "ABF-109 작은 악마 미소녀에게 이성이 망가질수록 농락당한다."
    movie_code = "ABF-109"
    category_code = "prestige-exclusive"
    actor_id = $actorId
    keywords = @("Cosplay Drama", "Featured Actress", "Slender", "Uniform", "Umi Yatsugake")
    rating_grade = "B"
    video_url = "https://javtiful.com/kr/video/60279/abf-109"
    description = "Javtiful 개별 영상 페이지 기준으로 등록한 Yatsugake Umi 작품입니다."
    poster_url = "https://javtiful.com/uploads/uploads/videos/thumbs/2024/05/30/1aa1744757655a72e6c73fe1c176ad9a.jpg"
    release_month = "2024-05"
    production_company = "Prestige"
    recommendation_score = 70
  }
)

$registered = 0
$updated = 0

foreach ($movie in $movies) {
  $encodedCode = [uri]::EscapeDataString($movie.movie_code)
  $exists = Invoke-CineRest -Method "Get" -Path "movies?select=id,movie_code&movie_code=eq.$encodedCode"
  if ($exists.Count -gt 0) {
    Invoke-CineRest `
      -Method "Patch" `
      -Path "movies?movie_code=eq.$encodedCode" `
      -Body $movie `
      -ExtraHeaders @{ Prefer = "return=representation" } | Out-Null
    $updated++
  } else {
    Invoke-CineRest `
      -Method "Post" `
      -Path "movies" `
      -Body @($movie) `
      -ExtraHeaders @{ Prefer = "return=representation" } | Out-Null
    $registered++
  }
}

[pscustomobject]@{
  actor = $actorName
  actor_action = $actorAction
  actor_id = $actorId
  category = $category.category_code
  movies_inserted = $registered
  movies_updated = $updated
  source_url = "https://javtiful.com/kr/actress/yatsugake-umi"
} | ConvertTo-Json

