# Kill hung kernel serve (port-holder), clear lock, restart, verify.
# v2 (2026-10-26): PID is now auto-detected from the port instead of hardcoded,
# so this works for any future wedge without editing.
$ErrorActionPreference = "Continue"
$bin = "C:\Users\hyper\workspace\HyperNexus\bin"
$lock = "C:\Users\hyper\.hypernexus\lock"

Write-Output "=== 0. detect port-holding PID ==="
$portHolder = $null
try { $portHolder = @(Get-NetTCPConnection -LocalPort 7778 -State Listen -ErrorAction SilentlyContinue)[0].OwningProcess } catch {}
if (-not $portHolder) { Write-Output "nothing listening on 7778"; }
else { Write-Output "port 7778 held by PID $portHolder" }

Write-Output "=== 1. try graceful shutdown (2s budget - it's hung) ==="
try {
  $r = Invoke-RestMethod -Uri "http://127.0.0.1:7778/api/shutdown" -Method Post -TimeoutSec 2
  Write-Output "shutdown: $($r | ConvertTo-Json -Compress)"
} catch { Write-Output "shutdown unresponsive: $($_.Exception.Message)" }

Start-Sleep -Seconds 1

Write-Output "=== 2. kill ONLY the port-holding serve PID ==="
foreach ($procId in @($portHolder)) {
  if (-not $procId) { continue }
  $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
  if ($p) {
    try {
      Stop-Process -Id $procId -Force -ErrorAction Stop
      Write-Output "killed PID $procId"
    } catch { Write-Output "kill $procId : $($_.Exception.Message)" }
  } else { Write-Output "PID $procId already gone" }
}
Start-Sleep -Seconds 2

Write-Output "=== 3. confirm port free (fast) ==="
$portBusy = $false
try {
  $c = @(Get-NetTCPConnection -LocalPort 7778 -State Listen -ErrorAction SilentlyContinue)
  if ($c.Count -gt 0) { $portBusy = $true; Write-Output "STILL BOUND by $($c[0].OwningProcess)" }
} catch { Write-Output "netconn check skipped" }
if (-not $portBusy) { Write-Output "port free" }

Write-Output "=== 4. clear orphan lock ==="
if (Test-Path $lock) {
  try {
    $lp = (Get-Content $lock -Raw | ConvertFrom-Json).pid
    if (-not (Get-Process -Id $lp -ErrorAction SilentlyContinue)) {
      Remove-Item $lock -Force
      Write-Output "cleared orphan lock (pid $lp)"
    } else { Write-Output "lock pid $lp alive - kept" }
  } catch { Write-Output "lock: $($_.Exception.Message)" }
}

Write-Output "=== 5. start serve ==="
Start-Process -FilePath "$bin\hypernexus.exe" -ArgumentList "serve" -WorkingDirectory "C:\Users\hyper\workspace\HyperNexus" -WindowStyle Hidden

Write-Output "=== 6. poll health ==="
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 1
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:7778/health" -Method Get -TimeoutSec 3
    if ($h.ok) { Write-Output "HEALTH OK after $($i+1)s: $($h | ConvertTo-Json -Compress)"; break }
  } catch {}
  if ($i -eq 19) { Write-Output "HEALTH FAILED after 20s" }
}
