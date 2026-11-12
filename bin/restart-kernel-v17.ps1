# Replace hypernexus.exe with the freshly built v17 and restart serve.
$ErrorActionPreference = "Continue"
$root = "C:\Users\hyper\workspace\HyperNexus"
$bin  = Join-Path $root "bin"
$lock = "C:\Users\hyper\.hypernexus\lock"

Write-Output "=== 1. clean shutdown ==="
try {
  Invoke-RestMethod -Uri "http://127.0.0.1:7778/api/shutdown" -Method Post -TimeoutSec 15 | Out-Null
  Write-Output "shutdown requested"
} catch { Write-Output "shutdown call: $($_.Exception.Message)" }

for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Milliseconds 500
  $c = Get-NetTCPConnection -LocalPort 7778 -State Listen -ErrorAction SilentlyContinue
  if (-not $c) { Write-Output "port released after $($i * 0.5)s"; break }
  if ($i -eq 19) {
    Write-Output "force killing port-holding PID only"
    $c | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop; Write-Output "killed PID $($_.OwningProcess)" } catch { Write-Output "kill $($_.OwningProcess): $($_.Exception.Message)" } }
    Start-Sleep -Seconds 2
  }
}

Write-Output "=== 2. replace binary ==="
Copy-Item "$bin\hypernexus-v17.exe" "$bin\hypernexus.exe" -Force
Write-Output "installed: $((Get-Item "$bin\hypernexus.exe").Length) bytes"

Write-Output "=== 3. clear stale lock if orphaned ==="
if (Test-Path $lock) {
  try {
    $lockPid = (Get-Content $lock -Raw | ConvertFrom-Json).pid
    $alive = Get-Process -Id $lockPid -ErrorAction SilentlyContinue
    $listening = Get-NetTCPConnection -LocalPort 7778 -State Listen -ErrorAction SilentlyContinue
    if (-not ($alive -and $listening)) {
      Remove-Item $lock -Force
      Write-Output "cleared orphan lock (pid $lockPid)"
    } else {
      Write-Output "lock held by live listener $lockPid"
    }
  } catch { Write-Output "lock check: $($_.Exception.Message)" }
}

Write-Output "=== 4. start serve ==="
Start-Process -FilePath "$bin\hypernexus.exe" -ArgumentList "serve" -WorkingDirectory $root -WindowStyle Hidden

Write-Output "=== 5. verify ==="
for ($i = 0; $i -lt 25; $i++) {
  Start-Sleep -Seconds 1
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:7778/health" -Method Get -TimeoutSec 4
    if ($h -and $h.ok) { Write-Output "HEALTH OK after $($i+1)s: $($h | ConvertTo-Json -Compress)"; break }
  } catch { }
  if ($i -eq 24) { Write-Output "HEALTH FAILED after 25s" }
}
