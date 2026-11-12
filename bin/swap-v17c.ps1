# Reliable swap: pause watchdog, shutdown, kill leftover serves, replace binary, start, resume watchdog.
$ErrorActionPreference = "Continue"
$bin = "C:\Users\hyper\workspace\HyperNexus\bin"
$lock = "C:\Users\hyper\.hypernexus\lock"

Write-Output "=== 1. pause watchdog ==="
try {
  Disable-ScheduledTask -TaskName "HyperNexus-KernelWatchdog" -ErrorAction Stop | Out-Null
  Write-Output "watchdog paused"
} catch { Write-Output "watchdog pause: $($_.Exception.Message)" }

Write-Output "=== 2. shutdown ==="
try { Invoke-RestMethod -Uri "http://127.0.0.1:7778/api/shutdown" -Method Post -TimeoutSec 15 | Out-Null; Write-Output "shutdown ok" } catch { Write-Output "shutdown: $($_.Exception.Message)" }
Start-Sleep -Seconds 2

Write-Output "=== 3. kill leftover serve processes (exact cmd contains 'serve') ==="
Get-CimInstance Win32_Process -Filter "Name='hypernexus.exe'" | ForEach-Object {
  $cl = $_.CommandLine
  if ($cl -match "serve") {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; Write-Output "killed serve PID $($_.ProcessId)" } catch { Write-Output "kill $($_.ProcessId): $($_.Exception.Message)" }
  } else {
    Write-Output "leaving PID $($_.ProcessId) ($cl)"
  }
}
Start-Sleep -Seconds 2

Write-Output "=== 4. confirm port free ==="
if (Get-NetTCPConnection -LocalPort 7778 -State Listen -ErrorAction SilentlyContinue) {
  Write-Output "PORT STILL BOUND - abort"
  try { Enable-ScheduledTask -TaskName "HyperNexus-KernelWatchdog" | Out-Null } catch {}
  exit 1
}
Write-Output "port free"

Write-Output "=== 5. replace binary (no rename needed - process gone) ==="
if (Test-Path "$bin\hypernexus.exe") {
  Remove-Item "$bin\hypernexus.exe" -Force
  Write-Output "old exe removed"
}
Copy-Item "$bin\hypernexus-v17.exe" "$bin\hypernexus.exe" -Force
Write-Output "installed: $((Get-Item "$bin\hypernexus.exe").Length) bytes @ $((Get-Item "$bin\hypernexus.exe").LastWriteTime)"

Write-Output "=== 6. clear orphan lock ==="
if (Test-Path $lock) {
  try {
    $lp = (Get-Content $lock -Raw | ConvertFrom-Json).pid
    if (-not (Get-Process -Id $lp -ErrorAction SilentlyContinue)) {
      Remove-Item $lock -Force
      Write-Output "cleared orphan lock (pid $lp)"
    } else { Write-Output "lock pid $lp alive" }
  } catch { Write-Output "lock: $($_.Exception.Message)" }
}

Write-Output "=== 7. start ==="
Start-Process -FilePath "$bin\hypernexus.exe" -ArgumentList "serve" -WorkingDirectory "C:\Users\hyper\workspace\HyperNexus" -WindowStyle Hidden
for ($i = 0; $i -lt 25; $i++) {
  Start-Sleep -Seconds 1
  try { $h = Invoke-RestMethod -Uri "http://127.0.0.1:7778/health" -Method Get -TimeoutSec 4; if ($h.ok) { Write-Output "HEALTH OK after $($i+1)s: $($h | ConvertTo-Json -Compress)"; break } } catch {}
  if ($i -eq 24) { Write-Output "HEALTH FAILED" }
}

Write-Output "=== 8. resume watchdog ==="
try { Enable-ScheduledTask -TaskName "HyperNexus-KernelWatchdog" | Out-Null; Write-Output "watchdog resumed" } catch { Write-Output "watchdog resume: $($_.Exception.Message)" }
