# lowpri.ps1 — launch a command at BELOWNORMAL priority class.
# Every process it spawns inherits the class: model runners, tool-call
# children, shell spawns — all yield to music/UI automatically.
#
# Usage: .\bin\lowpri.ps1 node bin\benchmark-ab.mjs
#        .\bin\lowpri.ps1 -LeaveCores 2 node bin\run-benchmark.mjs

param(
    [int]$LeaveCores = 0,
    [Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)]
    [string[]]$Command
)

$exe = $Command[0]
$args = @()
if ($Command.Count -gt 1) { $args = $Command[1..($Command.Count - 1)] }

$p = Start-Process -FilePath $exe -ArgumentList $args -PassThru -WindowStyle Hidden
$p.PriorityClass = 'BelowNormal'
if ($LeaveCores -gt 0) {
    $total = [Environment]::ProcessorCount
    $usable = [Math]::Max(1, $total - $LeaveCores)
    $p.ProcessorAffinity = [IntPtr]((1 -shl $usable) - 1)
}
Write-Output "launched pid $($p.Id) at BelowNormal$(if ($LeaveCores -gt 0) { ", cores reserved: $LeaveCores" })"
