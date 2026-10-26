# set-llm-priority.ps1 — Set all LLM inference processes to BelowNormal priority
# so they never starve audio playback or system responsiveness.
# Run elevated (right-click > Run as Administrator) for full effect.
#
# Windows priority classes:
#   256 = RealTime, 128 = High, 32768 = AboveNormal, 32 = Normal, 16384 = BelowNormal, 64 = Idle
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\set-llm-priority.ps1           # one-shot
#   powershell -ExecutionPolicy Bypass -File scripts\set-llm-priority.ps1 -Loop     # watchdog mode (every 30s)
#   powershell -ExecutionPolicy Bypass -File scripts\set-llm-priority.ps1 -Priority Idle  # even lower

param(
    [switch]$Loop,
    [ValidateSet("BelowNormal","Idle")]
    [string]$Priority = "BelowNormal",
    [int]$IntervalSec = 30
)

$priorityValue = switch ($Priority) {
    "BelowNormal" { 16384 }
    "Idle"        { 64 }
}

# Processes to manage — LLM inference and related heavy compute
$llmProcessNames = @(
    "llama-server",      # llama.cpp inference (Ollama backend, standalone)
    "ollama",            # Ollama service
    "ollama-runner",     # Ollama model runner
    "lmstudio",          # LM Studio
    "LMS",               # LM Studio helper
    "lmstudio-headless", # LM Studio headless
    "jan",               # Jan AI
    "text-generation-webui",
    "koboldcpp",
    "vllm",
    "python",            # Python inference scripts (set low — can be raised per-script)
    "node"               # Node.js tool-call processes (set low for spawned work)
)

# Exclude the current shell and MiMoCode itself from being downgraded
$excludeNames = @("mimo", "mimo-code", "powershell", "pwsh", "cmd", "WindowsTerminal", "OpenConsole", "conhost", "hypernexus-kernel", "hypernexus")

function Set-LLMPriorities {
    $changed = 0
    foreach ($name in $llmProcessNames) {
        if ($excludeNames -contains $name) { continue }
        $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
        if (-not $procs) { continue }
        foreach ($p in $procs) {
            if ($excludeNames -contains $p.ProcessName) { continue }
            try {
                $current = $p.PriorityClass
                if ($current.ToString() -ne $Priority) {
                    $p.PriorityClass = $Priority
                    $changed++
                    Write-Host "  [$($p.Id)] $($p.ProcessName) -> $Priority (was $current)"
                }
            } catch {
                try {
                    $null = & wmic process where "ProcessId=$($p.Id)" call setpriority $priorityValue 2>&1
                    $changed++
                    Write-Host "  [$($p.Id)] $($p.ProcessName) -> $Priority (via wmic)"
                } catch {
                    $msg = $_.Exception.Message
                    Write-Warning "  [$($p.Id)] $($p.ProcessName) cannot set priority - $msg"
                }
            }
        }
    }
    return $changed
}

Write-Host "=== LLM Process Priority Manager ==="
Write-Host "Target priority: $Priority ($priorityValue)"
Write-Host "Processes to manage: $($llmProcessNames -join ', ')"
Write-Host "Excluded: $($excludeNames -join ', ')"
Write-Host ""

if ($Loop) {
    Write-Host "Watchdog mode - checking every ${IntervalSec}s. Ctrl+C to stop."
    while ($true) {
        $n = Set-LLMPriorities
        if ($n -gt 0) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Updated $n process(es)" }
        Start-Sleep -Seconds $IntervalSec
    }
} else {
    $n = Set-LLMPriorities
    Write-Host ""
    Write-Host "Done. $n process(es) updated."
    if ($n -eq 0) {
        Write-Host "No LLM processes needed updating (already at $Priority or not running)."
        Write-Host "Note - elevated processes may require running this script as Administrator."
    }
}
