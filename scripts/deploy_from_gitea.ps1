param(
    [string]$Branch = "main",
    [string]$Commit = ""
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LocalDir = Join-Path $ProjectRoot "local"
if (-not (Test-Path $LocalDir)) {
    New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null
}
$LogFile = Join-Path $LocalDir "deploy.log"

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$msg = "[$timestamp] [CineTube Auto-Deploy] Processing push for branch: $Branch ($Commit)"
Write-Host $msg
Add-Content -Path $LogFile -Value $msg -ErrorAction SilentlyContinue

Set-Location $ProjectRoot

# 1. Fetch from local Gitea bare repository into a scratch ref first.
#    Fetching straight into the checked-out branch (old: "$Branch`:$Branch") is
#    refused by git ("refusing to fetch into branch ... checked out at ..."),
#    which silently left the branch ref stale and made every deploy of the
#    checked-out branch a no-op ("Already up to date.") even though the push
#    itself succeeded on Gitea's side.
$GiteaRepo = "C:/gitea/data/gitea-repositories/admin/cinetube.git"
$FetchRef = "refs/deploy-fetch/$Branch"
$deployFailed = $false
git fetch $GiteaRepo "$Branch`:$FetchRef" --force 2>&1 | Out-String | Add-Content -Path $LogFile -ErrorAction SilentlyContinue
if ($LASTEXITCODE -ne 0) {
    $deployFailed = $true
    Add-Content -Path $LogFile -Value "ERROR: git fetch $GiteaRepo $Branch->$FetchRef failed (exit $LASTEXITCODE)." -ErrorAction SilentlyContinue
}

# 2. Update working tree if currently on this branch
$currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($deployFailed) {
    Add-Content -Path $LogFile -Value "Skipping working tree update because fetch failed." -ErrorAction SilentlyContinue
} elseif ($currentBranch -eq $Branch) {
    Write-Host "Updating current active branch '$currentBranch'..."
    # The server's working tree always carries local-only operational files
    # (this deploy script, docs, data dumps, etc.) that are never committed.
    # A plain "git merge" aborts as soon as any of them collide with an
    # incoming file, and the old code below never checked for that, so a
    # collision silently left the tree stale while still logging "success".
    # Stashing (and excluding this running script from the stash, so we
    # don't rewrite ourselves out from under PowerShell mid-execution) lets
    # reset --hard always succeed, then we restore the local-only files on top.
    $status = (git status --porcelain)
    $stashed = $false
    if ($status) {
        $stashOut = git stash push -u -m "auto-deploy-$Commit" -- . ":!scripts/deploy_from_gitea.ps1" 2>&1 | Out-String
        $stashOut | Add-Content -Path $LogFile -ErrorAction SilentlyContinue
        if ($LASTEXITCODE -eq 0 -and $stashOut -notmatch "No local changes to save") {
            $stashed = $true
        }
    }

    git reset --hard $FetchRef 2>&1 | Out-String | Add-Content -Path $LogFile -ErrorAction SilentlyContinue
    if ($LASTEXITCODE -ne 0) {
        $deployFailed = $true
        Add-Content -Path $LogFile -Value "ERROR: git reset --hard $FetchRef failed (exit $LASTEXITCODE)." -ErrorAction SilentlyContinue
    } else {
        Write-Host "Working tree updated to $Branch."
    }

    if ($stashed) {
        $popOut = git stash pop 2>&1 | Out-String
        $popOut | Add-Content -Path $LogFile -ErrorAction SilentlyContinue
        if ($LASTEXITCODE -ne 0) {
            $deployFailed = $true
            Add-Content -Path $LogFile -Value "ERROR: git stash pop failed (exit $LASTEXITCODE) - local operational files may conflict with the new content and need manual resolution (see 'git stash list')." -ErrorAction SilentlyContinue
        }
    }
} else {
    # Not checked out here, so it's safe to move the branch ref itself directly.
    git branch -f $Branch $FetchRef 2>&1 | Out-String | Add-Content -Path $LogFile -ErrorAction SilentlyContinue
    if ($LASTEXITCODE -ne 0) {
        $deployFailed = $true
        Add-Content -Path $LogFile -Value "ERROR: git branch -f $Branch $FetchRef failed (exit $LASTEXITCODE)." -ErrorAction SilentlyContinue
    } else {
        Write-Host "Branch '$Branch' updated. Current active branch is '$currentBranch'."
    }
}

# 3. Restart local_api.py via the CineTube-API-Supervisor scheduled task.
#    Never Start-Process python from here: this script runs inside the Gitea
#    hook's (or whatever shell's) Windows job object, and any child we spawn is
#    killed when that caller exits - the API came up, answered /health, then
#    silently died minutes later. The supervisor is started by Task Scheduler
#    (outside any job), so we only kill the old process and let it respawn.
$SupervisorTask = "CineTube-API-Supervisor"
$apiProcess = Get-CimInstance Win32_Process | Where-Object { $_.Name -like "python*" -and $_.CommandLine -like "*local_api.py*" -and $_.CommandLine -like "*$ProjectRoot*" }
if ($apiProcess) {
    Write-Host "Restarting CineTube local_api.py to apply backend code updates..."
    $apiProcess | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

# Make sure the supervisor is alive (it is single-instance, so this is a no-op
# when it already runs). Ignore failures here; the task also self-fires every minute.
schtasks.exe /Run /TN $SupervisorTask 2>&1 | Out-String | Add-Content -Path $LogFile -ErrorAction SilentlyContinue

$apiHealthy = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3001/health" -TimeoutSec 3
        if ($resp.StatusCode -eq 200) { $apiHealthy = $true; break }
    } catch { }
}
if ($apiHealthy) {
    Add-Content -Path $LogFile -Value "local_api.py is healthy on :3001 (managed by $SupervisorTask)." -ErrorAction SilentlyContinue
} else {
    $deployFailed = $true
    Add-Content -Path $LogFile -Value "ERROR: local_api.py did not answer /health within 60s. Check local\api_supervisor.log and local\api.err.log; run scripts\register_api_supervisor.ps1 if the task is missing." -ErrorAction SilentlyContinue
}

if ($deployFailed) {
    $doneMsg = "[$timestamp] [CineTube Auto-Deploy] Deployment FAILED. See errors above."
} else {
    $doneMsg = "[$timestamp] [CineTube Auto-Deploy] Deployment completed successfully."
}
Write-Host $doneMsg
Add-Content -Path $LogFile -Value $doneMsg -ErrorAction SilentlyContinue
