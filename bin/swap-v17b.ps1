# Swap in the tokenized-fallback build (rename-aside trick), restart, verify.
$ErrorActionPreference = "Continue"
$bin = "C:\Users\hyper\workspace\HyperNexus\bin"
$lock = "C:\Users\hyper\.hypernexus\lock"

Write-Output "=== 1. shutdown ==="
try { Invoke-RestMethod -Uri "http://127.0.0.1:7778/api/shutdown" -Method Post -TimeoutSec 15 | Out-Null; Write-Output "shutdown ok" } catch { Write-Output "shutdown: $($_.Exception.Message)" }
for ($i = 0; $i -lt 16; $i++) {
  Start-Sleep -Milliseconds 500
  if (-not (Get-NetTCPConnection -LocalPort 7778 -State Listen -ErrorAction SilentlyContinue)) { Write-Output "port free after $($i*0.5)s"; break }
}

Write-Output "=== 2. rename aside + install new ==="
if (Test-Path "$bin\hypernexus.exe") {
  Move-Item "$bin\hypernexus.exe" "$bin\hypernexus-v16b.exe" -Force
  Write-Output "renamed aside -> v16b"
}
Copy-Item "$bin\hypernexus-v17.exe" "$bin\hypernexus.exe" -Force
Write-Output "installed: $((Get-Item "$bin\hypernexus.exe").Length) bytes"
Write-Output "v17 src:   $((Get-Item "$bin\hypernexus-v17.exe").Length) bytes"

Write-Output "=== 3. clear orphan lock ==="
if (Test-Path $lock) {
  try {
    $lp = (Get-Content $lock -Raw | ConvertFrom-Json).pid
    $alive = Get-Process -Id $lp -ErrorAction SilentlyContinue
    $listen = Get-NetTCPConnection -LocalPort 7778 -State Listen -ErrorAction SilentlyContinue
    if (-not ($alive -and $listen)) { Remove-Item $lock -Force; Write-Output "cleared orphan lock (pid $lp)" } else { Write-Output "lock live ($lp)" }
  } catch { Write-Output "lock: $($_.Exception.Message)" }
}

Write-Output "=== 4. start ==="
Start-Process -FilePath "$bin\hypernexus.exe" -ArgumentList "serve" -WorkingDirectory "C:\Users\hyper\workspace\HyperNexus" -WindowStyle Hidden
for ($i = 0; $i -lt 25; $i++) {
  Start-Sleep -Seconds 1
  try { $h = Invoke-RestMethod -Uri "http://127.0.0.1:7778/health" -Method Get -TimeoutSec 4; if ($h.ok) { Write-Output "HEALTH OK after $($i+1)s: $($h | ConvertTo-Json -Compress)"; break } } catch {}
  if ($i -eq 24) { Write-Output "HEALTH FAILED" }
}
