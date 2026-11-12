# Rename-aside (works even when processes hold the exe), install v17, start serve.
$ErrorActionPreference = "Continue"
$bin = "C:\Users\hyper\workspace\HyperNexus\bin"
$lock = "C:\Users\hyper\.hypernexus\lock"

Write-Output "=== 1. rename aside to unique name ==="
Move-Item "$bin\hypernexus.exe" "$bin\hypernexus-v16c.exe" -Force
Write-Output "renamed -> v16c ($((Get-Item "$bin\hypernexus-v16c.exe").LastWriteTime))"

Write-Output "=== 2. install v17 ==="
Copy-Item "$bin\hypernexus-v17.exe" "$bin\hypernexus.exe" -Force
$i = Get-Item "$bin\hypernexus.exe"
Write-Output "installed: $($i.Length) bytes @ $($i.LastWriteTime)"
if ($i.LastWriteTime -lt (Get-Date "2026-10-18 19:00:00")) { Write-Output "WARNING: timestamp looks stale" }

Write-Output "=== 3. clear orphan lock ==="
if (Test-Path $lock) {
  try {
    $lp = (Get-Content $lock -Raw | ConvertFrom-Json).pid
    if (-not (Get-Process -Id $lp -ErrorAction SilentlyContinue)) {
      Remove-Item $lock -Force
      Write-Output "cleared orphan lock (pid $lp)"
    } else { Write-Output "lock pid $lp alive" }
  } catch { Write-Output "lock: $($_.Exception.Message)" }
}

Write-Output "=== 4. start serve ==="
Start-Process -FilePath "$bin\hypernexus.exe" -ArgumentList "serve" -WorkingDirectory "C:\Users\hyper\workspace\HyperNexus" -WindowStyle Hidden
for ($i = 0; $i -lt 25; $i++) {
  Start-Sleep -Seconds 1
  try { $h = Invoke-RestMethod -Uri "http://127.0.0.1:7778/health" -Method Get -TimeoutSec 4; if ($h.ok) { Write-Output "HEALTH OK after $($i+1)s: $($h | ConvertTo-Json -Compress)"; break } } catch {}
  if ($i -eq 24) { Write-Output "HEALTH FAILED" }
}
