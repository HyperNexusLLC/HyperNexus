# HyperNexus Kernel Watchdog
# Checks kernel health and restarts if down.
# Usage: .\kernel-watchdog.ps1 [-KernelPath <path>] [-Port <port>]

param(
    [string]$KernelPath = "C:\Users\hyper\workspace\HyperNexus\bin\hypernexus.exe",
    [int]$Port = 7778,
    [int]$MaxRestartAttempts = 3,
    [int]$CheckIntervalSec = 30,
    [string]$WebhookUrl = "",
    [switch]$MonitorMCP
)

$ErrorActionPreference = 'SilentlyContinue'

function Send-Alert {
    param([string]$Message)
    if (-not $WebhookUrl) { return }
    try {
        $body = @{text = "[HyperNexus Watchdog] $Message"} | ConvertTo-Json
        Invoke-WebRequest -Uri $WebhookUrl -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 5 | Out-Null
    } catch {}
}

function Test-KernelHealth {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 12
        $json = $response.Content | ConvertFrom-Json
        return $json.ok -eq $true
    } catch {
        return $false
    }
}

function Test-KernelAlive {
    # Liveness independent of HTTP latency: a kernel under memory pressure can
    # stall its request handlers (GC/scheduling) for several seconds while still
    # being alive and holding the port. That is NOT death and must not trigger a
    # restart (restarting a live kernel only adds memory churn). A real death is
    # the process being gone OR the port no longer bound.
    $portBound = [bool](netstat -ano | Select-String ":$Port .*LISTENING")
    if (-not $portBound) { return $false }
    $proc = Get-Process -Name "hypernexus" -ErrorAction SilentlyContinue
    return [bool]$proc
}

function Test-MCPHealth {
    # NOTE: Do NOT probe /api/agent/tool — it hangs on the 'echo' tool and
    # caused a false-failure restart loop (2026-10-16). Use /api/mcp/status,
    # a fast liveness endpoint, instead. Timeout is generous to tolerate
    # memory-pressure GC stalls rather than misread them as failure.
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/mcp/status" -UseBasicParsing -TimeoutSec 12
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Start-Kernel {
    # Wait for the port to be free first — the kernel has a single-instance
    # guard that refuses to bind if the port is still live, which would make
    # this restart silently fail and loop.
    for ($i = 1; $i -le 8; $i++) {
        $portCheck = netstat -ano | Select-String ":$Port .*LISTENING"
        if (-not $portCheck) { break }
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Port $Port still bound, waiting for release (${i}/8)..."
        Start-Sleep -Seconds 2
    }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting HyperNexus kernel..."
    Start-Process -FilePath $KernelPath -ArgumentList "serve" -WindowStyle Hidden

    # Wait for port to actually bind (up to 15 seconds)
    for ($i = 1; $i -le 15; $i++) {
        Start-Sleep -Seconds 1
        if (Test-KernelHealth) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Kernel started successfully (port $Port bound after ${i}s)"
            return $true
        }
    }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Kernel failed to bind port $Port after 15s"
    return $false
}

function Stop-Kernel {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Stopping kernel (clean shutdown first)..."
    # Clean shutdown via API so the systray icon is removed properly.
    # Force-kill leaves ghost tray icons.
    try {
        Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/shutdown" -Method POST -UseBasicParsing -TimeoutSec 5 | Out-Null
    } catch {}
    # Wait for the process to exit on its own (up to 10s)
    for ($i = 1; $i -le 10; $i++) {
        Start-Sleep -Seconds 1
        $proc = Get-Process -Name "hypernexus" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne '' -or $true }
        $portCheck = netstat -ano | Select-String ":$Port .*LISTENING"
        if (-not $portCheck) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Kernel exited cleanly after ${i}s"
            return
        }
    }
    # Last resort: force kill only the 'serve' instance. Prefer the lock-file
    # PID (the serve process), else the port holder. Do NOT Stop-Process every
    # hypernexus — the 'mcp' stdio children are legitimate live client sessions.
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Clean shutdown timed out, force-killing serve instance..."
    $lockPid = $null
    $lockFile = "C:\Users\hyper\.hypernexus\lock"
    if (Test-Path $lockFile) {
        try { $lockPid = (Get-Content $lockFile -Raw | ConvertFrom-Json).pid } catch {}
    }
    $holderPid = $null
    $portLine = netstat -ano | Select-String ":$Port .*LISTENING" | Select-Object -First 1
    if ($portLine) { $holderPid = [int](($portLine -split '\s+')[-1]) }
    $targets = @()
    if ($lockPid) { $targets += $lockPid }
    if ($holderPid -and $holderPid -ne $lockPid) { $targets += $holderPid }
    foreach ($t in $targets) {
        Stop-Process -Id $t -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

# Main watchdog loop
# ── LLM Process Priority (keep inference from starving audio) ──────────────
# LLM inference processes (llama-server, ollama, LMS, etc.) run at BelowNormal
# so they never cause audio stutter or system unresponsiveness. This is
# re-enforced every watchdog cycle because new processes spawn at Normal.
$llmProcNames = @("llama-server", "ollama", "ollama-runner", "LMS", "lmstudio", "lmstudio-headless")
$llmExclude = @("mimo", "hypernexus-kernel", "hypernexus", "powershell", "pwsh", "cmd")
$llmPriority = 16384  # BelowNormal

function Set-LLMProcessPriorities {
    $n = 0
    foreach ($name in $llmProcNames) {
        $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
        if (-not $procs) { continue }
        foreach ($p in $procs) {
            if ($llmExclude -contains $p.ProcessName) { continue }
            try {
                $null = & wmic process where "ProcessId=$($p.Id)" call setpriority $llmPriority 2>&1
                $n++
            } catch {}
        }
    }
    return $n
}

# ── Dashboard (Next.js :7779) health + restart ─────────────────────────────
# The dashboard is a core UI component; keep it alive like the kernel.
$script:WebDir = Join-Path (Split-Path (Split-Path $KernelPath -Parent) -Parent) "apps\web"

function Test-DashboardHealth {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:7779/" -UseBasicParsing -TimeoutSec 12
        return $r.StatusCode -ge 200 -and $r.StatusCode -lt 500
    } catch { return $false }
}

function Start-Dashboard {
    $bat = Join-Path $WebDir "_start_prod.bat"
    if (-not (Test-Path $bat)) { Write-Host "[dashboard] start script missing: $bat"; return $false }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting dashboard (:7779)..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "_start_prod.bat" -WorkingDirectory $WebDir -WindowStyle Hidden
    for ($i = 1; $i -le 15; $i++) {
        Start-Sleep -Seconds 1
        if (Test-DashboardHealth) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Dashboard started (after ${i}s)"
            return $true
        }
    }
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Dashboard failed to respond after 15s"
    return $false
}

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] HyperNexus Kernel Watchdog started (port=$Port, interval=${CheckIntervalSec}s, mcp=$MonitorMCP)"

$consecutiveFailures = 0
$mcpFailures = 0

while ($true) {
    if (Test-KernelHealth) {
        if ($consecutiveFailures -gt 0) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Kernel recovered after $consecutiveFailures failures"
        }
        $consecutiveFailures = 0

        # Optional MCP health check
        if ($MonitorMCP) {
            if (Test-MCPHealth) {
                $mcpFailures = 0
            } else {
                $mcpFailures++
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] MCP health check FAILED ($mcpFailures)"
                if ($mcpFailures -ge 3) {
                    if (Test-KernelAlive) {
                        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] MCP slow but kernel alive - likely memory pressure. Not restarting."
                        $mcpFailures = 0
                    } else {
                        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] MCP unhealthy and kernel not alive, restarting kernel..."
                        Send-Alert "MCP tools unresponsive. Restarting kernel..."
                        Stop-Kernel
                        if (Start-Kernel) { $mcpFailures = 0; $consecutiveFailures = 0 }
                    }
                }
            }
        }
    } else {
        # HTTP probe failed. Distinguish a live-but-stalled kernel (memory
        # pressure) from a real death before deciding to restart.
        if (Test-KernelAlive) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Kernel alive (port bound) but HTTP slow - likely memory pressure. Not restarting."
            $consecutiveFailures = 0
        } else {
            $consecutiveFailures++
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Kernel health check FAILED (attempt $consecutiveFailures/$MaxRestartAttempts)"
            if ($consecutiveFailures -ge $MaxRestartAttempts) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Max failures reached. Restarting kernel..."
                Send-Alert "Kernel DOWN after $MaxRestartAttempts failures. Restarting..."
                Stop-Kernel
                if (Start-Kernel) {
                    $consecutiveFailures = 0
                    Send-Alert "Kernel restarted successfully."
                } else {
                    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Restart failed. Will retry in ${CheckIntervalSec}s"
                }
            }
        }
    }
    # Keep LLM inference processes at BelowNormal so they never starve audio.
    $null = Set-LLMProcessPriorities
    # Keep the dashboard (Next.js :7779) alive independently of the kernel.
    if (-not (Test-DashboardHealth)) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Dashboard down, restarting..."
        Start-Dashboard | Out-Null
    }
    Start-Sleep -Seconds $CheckIntervalSec
}
