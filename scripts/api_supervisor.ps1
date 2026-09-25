# Keeps scripts/local_api.py running. Meant to be launched by the
# "CineTube-API-Supervisor" scheduled task (see register_api_supervisor.ps1),
# never directly from a deploy hook or an agent/terminal shell.
#
# Why: anything started with Start-Process from a Gitea hook, a Claude Code
# tool shell, etc. lands in that caller's Windows job object and is killed
# when the caller exits, which silently took the API down minutes after
# "successful" deploys. Task Scheduler starts us outside any such job, so the
# API survives whoever triggered the restart.
#
# Deploys only need to kill the python process; this loop brings it back up
# with the freshly checked-out code within a few seconds.

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LocalDir = Join-Path $ProjectRoot "local"
$ApiScript = Join-Path $ProjectRoot "scripts\local_api.py"
$ApiOutLog = Join-Path $LocalDir "api.out.log"
$ApiErrLog = Join-Path $LocalDir "api.err.log"
$SupervisorLog = Join-Path $LocalDir "api_supervisor.log"
New-Item -ItemType Directory -Force $LocalDir | Out-Null

function Write-Log($text) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $text"
    Add-Content -Path $SupervisorLog -Value $line -ErrorAction SilentlyContinue
}

# Single instance: the scheduled task re-fires every minute as a self-heal,
# so later copies must exit immediately while one is already supervising.
$mutex = New-Object System.Threading.Mutex($false, "Global\CineTubeApiSupervisor")
if (-not $mutex.WaitOne(0)) { exit 0 }

function Resolve-Python {
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return Get-ChildItem -Path @(
        "$env:LocalAppData\Programs\Python\Python3*\python.exe",
        "C:\Python3*\python.exe",
        "C:\Program Files\Python3*\python.exe"
    ) -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}

$env:PGDATABASE = "cinetube"
$env:CINETUBE_API_HOST = "0.0.0.0"
$env:CINETUBE_API_PORT = "3001"

Write-Log "supervisor started (pid $PID)"
try {
    while ($true) {
        $existing = Get-CimInstance Win32_Process | Where-Object { $_.Name -like "python*" -and $_.CommandLine -like "*local_api.py*" } | Select-Object -First 1
        if ($existing) {
            # An API started some other way (e.g. start_local_db.ps1 before the
            # task existed). Adopt it and wait for it to exit.
            $proc = Get-Process -Id $existing.ProcessId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Log "watching existing local_api.py (pid $($proc.Id))"
                $proc.WaitForExit()
                Write-Log "local_api.py (pid $($proc.Id)) exited"
            }
        } else {
            $python = Resolve-Python
            if (-not $python) {
                Write-Log "ERROR: python executable not found; retrying in 30s"
                Start-Sleep -Seconds 30
                continue
            }
            # Keep the previous stderr so a crash traceback survives the restart.
            if ((Test-Path $ApiErrLog) -and (Get-Item $ApiErrLog).Length -gt 0) {
                Copy-Item $ApiErrLog "$ApiErrLog.prev" -Force -ErrorAction SilentlyContinue
            }
            $proc = Start-Process -FilePath $python -ArgumentList @("`"$ApiScript`"") `
                -WorkingDirectory $ProjectRoot -WindowStyle Hidden -PassThru `
                -RedirectStandardOutput $ApiOutLog -RedirectStandardError $ApiErrLog
            $null = $proc.Handle  # cache the handle so ExitCode is readable after exit
            Write-Log "started local_api.py (pid $($proc.Id)) with $python"
            $proc.WaitForExit()
            Write-Log "local_api.py (pid $($proc.Id)) exited with code $($proc.ExitCode)"
        }
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Log "supervisor stopping (pid $PID)"
    $mutex.ReleaseMutex()
}
