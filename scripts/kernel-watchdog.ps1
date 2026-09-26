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
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 5
        $json = $response.Content | ConvertFrom-Json
        return $json.ok -eq $true
    } catch {
        return $false
    }
}

function Test-MCPHealth {
    try {
        $body = '{"name":"echo","arguments":{"message":"ping"}}'
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/agent/tool" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
        $json = $response.Content | ConvertFrom-Json
        return $json.success -eq $true
    } catch {
        return $false
    }
}

function Start-Kernel {
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
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Stopping existing kernel processes..."
    Get-Process -Name "hypernexus" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
    # Verify port is freed
    $portCheck = netstat -ano | Select-String ":$Port "
    if ($portCheck) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Port $Port still in use, waiting..."
        Start-Sleep -Seconds 3
    }
}

# Main watchdog loop
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
                    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] MCP unhealthy, restarting kernel..."
                    Send-Alert "MCP tools unresponsive. Restarting kernel..."
                    Stop-Kernel
                    if (Start-Kernel) { $mcpFailures = 0; $consecutiveFailures = 0 }
                }
            }
        }
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
    Start-Sleep -Seconds $CheckIntervalSec
}
