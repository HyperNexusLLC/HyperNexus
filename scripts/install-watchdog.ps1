# Install HyperNexus Kernel Watchdog as a Windows Scheduled Task
# Run this script as Administrator

param(
    [int]$Port = 7778,
    [int]$CheckIntervalSec = 30
)

$taskName = "HyperNexus-KernelWatchdog"
$scriptPath = Join-Path $PSScriptRoot "kernel-watchdog.ps1"

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator. Right-click PowerShell and select 'Run as Administrator'."
    exit 1
}

# Remove existing task if present
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Removed existing watchdog task"
}

# Create the scheduled task
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -Port $Port -CheckIntervalSec $CheckIntervalSec"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Monitors HyperNexus kernel health and auto-restarts if down" -RunLevel Highest

Write-Host "Watchdog installed as scheduled task '$taskName'"
Write-Host "  - Starts at logon"
Write-Host "  - Checks health every ${CheckIntervalSec}s"
Write-Host "  - Restarts kernel after 3 consecutive failures"
Write-Host ""
Write-Host "To uninstall: Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
