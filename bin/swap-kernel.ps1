# swap-kernel.ps1 -- atomic, collision-safe kernel binary swap for the shared box.
#
# Multiple harness agents (mimo, pi, codewhale) rebuild and swap the kernel on
# this machine; without coordination a staged binary can vanish mid-swap (it
# happened 2026-10-21). This script is the ONE sanctioned swap path:
#   1. takes an exclusive lockfile (so two agents cannot swap simultaneously)
#   2. kills all hypernexus processes and verifies they are gone
#   3. copies staged -> live and verifies byte size
#   4. only then deletes the staged binary
#   5. optionally starts the kernel
#
# Usage:
#   powershell -File bin\swap-kernel.ps1 -Staged bin\hypernexus-new.exe [-Start] [-Version 1.0.21]
#
# If the lock is held by another agent it retries up to -LockTimeoutSec (default 120).

param(
    [string]$Staged = "bin\hypernexus-new.exe",
    [string]$Live = "bin\hypernexus.exe",
    [switch]$Start,
    [string]$Version = "",
    [string]$Expect = "",
    [int]$LockTimeoutSec = 120
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$lockPath = Join-Path $root "bin\.kernel-swap.lock"

function Write-Step($msg) { Write-Output "[swap] $msg" }

# --- 1. exclusive lock ------------------------------------------------------
$deadline = (Get-Date).AddSeconds($LockTimeoutSec)
$lock = $null
while ($null -eq $lock) {
    try {
        $lock = [System.IO.File]::Open($lockPath, 'CreateNew', 'Write', 'None')
    } catch {
        # Stale-lock recovery: if the holder crashed mid-swap the lock file
        # lingers. Steal it once it is older than 10 minutes.
        $info = Get-Item $lockPath -ErrorAction SilentlyContinue
        if ($info -and ((Get-Date) - $info.LastWriteTime).TotalMinutes -gt 10) {
            Write-Step "lock file stale ($([int]((Get-Date) - $info.LastWriteTime).TotalMinutes) min old) -- stealing"
            Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
            continue
        }
        if ((Get-Date) -gt $deadline) {
            Write-Step "LOCK TIMEOUT: $lockPath held by another agent for ${LockTimeoutSec}s -- aborting (do NOT swap manually)."
            exit 2
        }
        Write-Step "lock held by another agent, retrying..."
        Start-Sleep -Seconds 3
    }
}
$owner = "$env:COMPUTERNAME pid=$PID at $(Get-Date -Format o)"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($owner)
$lock.Write($bytes, 0, $bytes.Length)
Write-Step "lock acquired ($owner)"

try {
    # --- 2. preflight -------------------------------------------------------
    if (-not (Test-Path $Staged)) {
        Write-Step "ERROR: staged binary not found: $Staged"
        exit 1
    }
    $stagedSize = (Get-Item $Staged).Length
    Write-Step "staged: $Staged ($stagedSize bytes)"

    # --- 3. graceful shutdown first, then kill + verify gone -----------------
    # POST /api/shutdown makes the kernel exit cleanly (and works even when the
    # kernel holds an ELEVATED token that Stop-Process cannot touch -- e.g. when
    # it was spawned by the HyperNexus-KernelWatchdog scheduled task).
    if (Get-Process -Name 'hypernexus' -ErrorAction SilentlyContinue) {
        try {
            Invoke-WebRequest -Uri 'http://127.0.0.1:7778/api/shutdown' -Method POST -ContentType 'application/json' -Body '{}' -UseBasicParsing -TimeoutSec 8 | Out-Null
            Write-Step "graceful /api/shutdown requested"
        } catch {
            Write-Step "graceful shutdown unavailable ($($_.Exception.Message)) - falling back to kill"
        }
        for ($i = 0; $i -lt 15; $i++) {
            Start-Sleep -Seconds 2
            if (-not (Get-Process -Name 'hypernexus' -ErrorAction SilentlyContinue)) { break }
        }
    }
    $killErrs = @()
    foreach ($proc in @(Get-Process -Name 'hypernexus' -ErrorAction SilentlyContinue)) {
        try { Stop-Process -Id $proc.Id -Force -ErrorAction Stop } catch { $killErrs += "pid $($proc.Id): $($_.Exception.Message)" }
    }
    Start-Sleep -Seconds 5
    $survivors = @(Get-Process -Name 'hypernexus' -ErrorAction SilentlyContinue)
    if ($survivors.Count -gt 0) {
        Write-Step "ERROR: hypernexus processes still alive after graceful shutdown + kill -- aborting, staged binary left in place."
        foreach ($e in $killErrs) { Write-Step "  kill error: $e" }
        if ($killErrs -match 'Access is denied') {
            Write-Step "  HINT: the kernel runs with an ELEVATED token (e.g. spawned by the HyperNexus-KernelWatchdog scheduled task)."
            Write-Step "  Re-run this script elevated (or stop the watchdog task first): Stop-ScheduledTask -TaskName 'HyperNexus-KernelWatchdog'"
        }
        exit 1
    }
    Write-Step "all hypernexus processes gone"

    # --- 4. copy + verify ----------------------------------------------------
    # Move-Item -Force cannot overwrite an existing exe on Windows; use copy.
    cmd /c copy /Y "$Staged" "$Live" | Out-Null
    $liveSize = (Get-Item $Live).Length
    if ($liveSize -ne $stagedSize) {
        Write-Step "ERROR: size mismatch after copy (live=$liveSize staged=$stagedSize) -- staged binary left in place."
        exit 1
    }
    Write-Step "copied + verified (size match: $liveSize)"

    # --- 4b. stale-binary content verification ------------------------------
    # Lesson learned live (2026-10-21): a swap once deployed a PRE-commit
    # build that reported the right version but lacked a fresh fix. Size
    # cannot tell that apart; a fix-unique byte string can. Pass -Expect with
    # a string only present in the intended source state (e.g. a new function
    # name) and the swap aborts if the live exe does not contain it.
    if ($Expect -ne "") {
        $bytes = [System.IO.File]::ReadAllBytes((Join-Path $root $Live))
        $ascii = [System.Text.Encoding]::ASCII.GetString($bytes)
        if (-not $ascii.Contains($Expect)) {
            Write-Step "ERROR: live exe does NOT contain expected marker '$Expect' -- wrong/stale source state was built. Staged binary left in place."
            exit 1
        }
        Write-Step "content verified: marker '$Expect' present in live exe"
    }

    # --- 5. only now delete staged -----------------------------------------
    Remove-Item $Staged -Force
    Write-Step "staged binary removed -- SWAP COMPLETE"

    if ($Version -ne "") {
        Write-Step "deployed version: $Version"
    }

    # --- 6. optional start --------------------------------------------------
    if ($Start) {
        $env:HYPERNEXUS_WORKSPACE_ROOT = $root
        Start-Process -FilePath (Join-Path $root $Live) -ArgumentList 'serve' -WorkingDirectory $root -WindowStyle Hidden
        Write-Step "kernel starting (HYPERNEXUS_WORKSPACE_ROOT=$root)"
    }
} finally {
    $lock.Close()
    Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
    Write-Step "lock released"
}
