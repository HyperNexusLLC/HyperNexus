# Poll the detached e2e run output. Reports tool calls + result.
$ErrorActionPreference = 'Continue'
$out  = Join-Path $PSScriptRoot 'e2e2'
$errF = "$out.err"; $outF = "$out.out"
Write-Output '=== tool CALLS (stderr, hypernexus lines) ==='
if (Test-Path $errF) {
  $lines = Get-Content $errF | Select-String -Pattern 'hypernexus|search_tools|error|Error|Cannot'
  if ($lines) { $lines | ForEach-Object { $_.Line } } else { Write-Output '(none yet)' }
} else { Write-Output '(no stderr yet)' }
Write-Output '=== RESULT (stdout) ==='
if (Test-Path $outF) {
  $raw = Get-Content $outF -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) { Write-Output '(stdout empty — still running or killed)' }
  else { Write-Output $raw }
} else { Write-Output '(no stdout yet)' }
Write-Output '=== sizes ==='
if (Test-Path $errF) { Write-Output ("err bytes: {0}" -f (Get-Item $errF).Length) }
if (Test-Path $outF) { Write-Output ("out bytes: {0}" -f (Get-Item $outF).Length) }
