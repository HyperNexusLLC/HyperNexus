# set-lowpri-ollama.ps1 — elevated helper for LLM processes owned by another
# account (ollama service / LM Studio). Run elevated (UAC) once per ollama
# restart: setting the PARENT (ollama.exe) makes every future llama-server
# model runner inherit BelowNormal at spawn.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File bin\set-lowpri-ollama.ps1
#
# Name-based, so it catches processes that do not exist yet at script start.

$names = @('ollama', 'ollama app', 'llama-server', 'lmstudio', 'LM Studio')
$total = [Environment]::ProcessorCount
$usable = [Math]::Max(1, $total - 2)
$mask = [IntPtr]((1 -shl $usable) - 1)   # reserve 2 low cores for audio/UI

$log = Join-Path $PSScriptRoot 'lowpri-ollama.log'
"[$(Get-Date -Format o)] elevated lowpri run (mask=$mask)" | Set-Content $log

foreach ($n in $names) {
    foreach ($p in @(Get-Process -Name $n -ErrorAction SilentlyContinue)) {
        try {
            $p.PriorityClass = 'BelowNormal'
            $p.ProcessorAffinity = $mask
            "ok  $($p.ProcessName) pid $($p.Id) -> BelowNormal + affinity" | Add-Content $log
        } catch {
            "ERR $($p.ProcessName) pid $($p.Id): $($_.Exception.Message)" | Add-Content $log
        }
    }
}
Get-Content $log
