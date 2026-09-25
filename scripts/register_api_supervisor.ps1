# Registers the "CineTube-API-Supervisor" scheduled task for the current user
# (no admin rights needed). It fires every minute; api_supervisor.ps1 is
# single-instance, so this just (re)starts the supervisor if it is not running,
# including after a reboot + logon.

$ErrorActionPreference = "Stop"
$TaskName = "CineTube-API-Supervisor"
$Supervisor = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "api_supervisor.ps1"

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Supervisor`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes 1)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
    -Principal $principal -Description "Keeps CineTube local_api.py running (restarts it after deploys/crashes)." -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName
Write-Host "Registered and started scheduled task '$TaskName'."
