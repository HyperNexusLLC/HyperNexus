# HyperNexus Health Dashboard
# Run: powershell -File health-dashboard.ps1
# Displays kernel, MCP, and memory system status

param(
    [string]$KernelUrl = "http://127.0.0.1:7778",
    [int]$RefreshSec = 10
)

function Get-KernelHealth {
    try {
        $r = Invoke-WebRequest -Uri "$KernelUrl/health" -UseBasicParsing -TimeoutSec 3
        $j = $r.Content | ConvertFrom-Json
        return @{status="UP"; uptime=$j.uptimeSec; version=$j.version}
    } catch {
        return @{status="DOWN"; uptime=0; version="N/A"}
    }
}

function Get-MCPStatus {
    try {
        $body = '{"name":"memory_stats","arguments":{}}'
        $r = Invoke-WebRequest -Uri "$KernelUrl/api/agent/tool" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
        $j = $r.Content | ConvertFrom-Json
        if ($j.success) { return @{status="OK"; detail=$j.data.content[0].text} }
        return @{status="ERROR"; detail=$j.error}
    } catch {
        return @{status="DOWN"; detail=$_.Exception.Message}
    }
}

function Get-SystemStats {
    try {
        $body = '{"name":"get_system_stats","arguments":{}}'
        $r = Invoke-WebRequest -Uri "$KernelUrl/api/agent/tool" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
        $j = $r.Content | ConvertFrom-Json
        return $j.data.content[0].text
    } catch {
        return "Unavailable"
    }
}

function Get-ScratchpadStatus {
    try {
        $body = '{"name":"memory_scratchpad_get","arguments":{"key":"bugfix_log"}}'
        $r = Invoke-WebRequest -Uri "$KernelUrl/api/agent/tool" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
        $j = $r.Content | ConvertFrom-Json
        if ($j.success) { return @{status="OK"; preview=$j.data.content[0].text.Substring(0, [Math]::Min(60, $j.data.content[0].text.Length))} }
        return @{status="ERROR"; detail=$j.error}
    } catch {
        return @{status="DOWN"; detail=$_.Exception.Message}
    }
}

while ($true) {
    Clear-Host
    $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $kernel = Get-KernelHealth
    $mcp = Get-MCPStatus
    $scratchpad = Get-ScratchpadStatus

    Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║           HyperNexus Health Dashboard                ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Time: $now" -ForegroundColor Gray
    Write-Host ""

    # Kernel
    $color = if ($kernel.status -eq "UP") { "Green" } else { "Red" }
    Write-Host "  Kernel:     " -NoNewline; Write-Host $kernel.status -ForegroundColor $color -NoNewline
    if ($kernel.status -eq "UP") {
        $uptimeMin = [math]::Round($kernel.uptime/60, 1)
        Write-Host "  (uptime: ${uptimeMin}m, v$($kernel.version))" -ForegroundColor Gray
    } else { Write-Host "" }

    # Memory
    $color = if ($mcp.status -eq "OK") { "Green" } else { "Red" }
    Write-Host "  Memory:     " -NoNewline; Write-Host $mcp.status -ForegroundColor $color -NoNewline
    if ($mcp.status -eq "OK") { Write-Host "  ($($mcp.detail))" -ForegroundColor Gray } else { Write-Host "" }

    # Scratchpad
    $color = if ($scratchpad.status -eq "OK") { "Green" } else { "Red" }
    Write-Host "  Scratchpad: " -NoNewline; Write-Host $scratchpad.status -ForegroundColor $color -NoNewline
    if ($scratchpad.status -eq "OK") { Write-Host "  ($($scratchpad.preview)...)" -ForegroundColor Gray } else { Write-Host "" }

    Write-Host ""
    Write-Host "  Refreshing every ${RefreshSec}s... (Ctrl+C to exit)" -ForegroundColor DarkGray
    Start-Sleep -Seconds $RefreshSec
}
