# set-lowpri.ps1 — deprioritize LLM workers so music/UI never starve.
#
# Windows priority classes are INHERITED by child processes, so lowering the
# parent covers everything it spawns: ollama's llamacpp model runner, tool-call
# children from agent harnesses (bash/shell spawns), and per-request workers.
#
# Usage:
#   .\bin\set-lowpri.ps1                 # ollama + LM Studio + Tabby + hypernexus kernel
#   .\bin\set-lowpri.ps1 -IncludeAgents  # also mimo/opencode (their tool children inherit too)
#   .\bin\set-lowpri.ps1 -LeaveCores 2   # additionally reserve N CPU cores (workers never get them)
#
# Idempotent: safe to run repeatedly. Also sweeps descendants via ParentProcessId.

param(
    [switch]$IncludeAgents,
    [int]$LeaveCores = 0
)

$targetNames = @('ollama', 'ollama app', 'lmstudio', 'LM Studio', 'Tabby', 'hypernexus')
if ($IncludeAgents) { $targetNames += @('mimo', 'opencode') }

function Set-LowPriority($proc, $mask) {
    try {
        $proc.PriorityClass = 'BelowNormal'
        if ($mask -gt 0) { $proc.ProcessorAffinity = [IntPtr]$mask }
        return "ok  $($proc.ProcessName) pid $($proc.Id)"
    } catch {
        return "ERR $($proc.ProcessName) pid $($proc.Id): $($_.Exception.Message)"
    }
}

# Affinity mask: all cores minus the reserved ones (reserve the LOW-numbered cores).
$mask = 0
if ($LeaveCores -gt 0) {
    $total = [Environment]::ProcessorCount
    $usable = [Math]::Max(1, $total - $LeaveCores)
    $mask = (1 -shl $usable) - 1   # cores 0..usable-1
}

# 1) named targets + every descendant (walk ParentProcessId tree)
$byPid = @{}
Get-CimInstance Win32_Process | ForEach-Object { $byPid[[int]$_.ProcessId] = [int]$_.ParentProcessId }
$seeds = @(Get-Process -Name $targetNames -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
$descendants = New-Object System.Collections.Generic.List[int]
function Walk($parentPid) {
    foreach ($kv in $byPid.GetEnumerator()) {
        if ($kv.Value -eq $parentPid -and -not $descendants.Contains($kv.Key)) {
            $descendants.Add($kv.Key)
            Walk $kv.Key
        }
    }
}
foreach ($s in $seeds) { Walk $s }
$allPids = @($seeds) + @($descendants)

$seen = @{}
foreach ($procId in $allPids) {
    if ($seen[$procId]) { continue }
    $seen[$procId] = $true
    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($p) { Write-Output (Set-LowPriority $p $mask) }
}

# 2) already-running node harnesses doing LLM work (children inherit)
foreach ($p in @(Get-Process -Name 'node' -ErrorAction SilentlyContinue)) {
    $cl = (Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)").CommandLine
    if ($cl -match 'benchmark-ab|run-benchmark') { Write-Output (Set-LowPriority $p $mask) }
}
