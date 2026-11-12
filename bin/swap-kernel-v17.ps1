# Swap hypernexus.exe -> v17 (tool-suggestions fix) and restart via /api/shutdown.
$ErrorActionPreference = "Continue"
$root = "C:\Users\hyper\workspace\HyperNexus"
$bin  = Join-Path $root "bin"

Write-Output "=== 1. rename running exe aside (allowed while running) ==="
if (Test-Path "$bin\hypernexus.exe") {
  if (Test-Path "$bin\hypernexus-v16.exe") { Write-Output "v16 backup already present" }
  else { Move-Item "$bin\hypernexus.exe" "$bin\hypernexus-v16.exe"; Write-Output "renamed -> hypernexus-v16.exe" }
}

Write-Output "=== 2. install v17 as hypernexus.exe ==="
Copy-Item "$bin\hypernexus-v17.exe" "$bin\hypernexus.exe" -Force
Write-Output "installed: $((Get-Item "$bin\hypernexus.exe").Length) bytes"

Write-Output "=== 3. clean shutdown of old process ==="
try {
  Invoke-RestMethod -Uri "http://127.0.0.1:7778/api/shutdown" -Method Post -TimeoutSec 15 | Out-Null
  Write-Output "shutdown requested"
} catch { Write-Output "shutdown call: $($_.Exception.Message)" }

# wait for port release
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Milliseconds 500
  $c = Get-NetTCPConnection -LocalPort 7778 -State Listen -ErrorAction SilentlyContinue
  if (-not $c) { Write-Output "port 7778 released after $($i * 0.5)s"; break }
  if ($i -eq 19) {
    Write-Output "port still bound - force killing port-holding PID only"
    $c | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop; Write-Output "killed PID $($_.OwningProcess)" } catch { Write-Output "kill $($_.OwningProcess): $($_.Exception.Message)" } }
    Start-Sleep -Seconds 2
  }
}

Write-Output "=== 4. start v17 ==="
Start-Process -FilePath "$bin\hypernexus.exe" -ArgumentList "serve" -WorkingDirectory $root -WindowStyle Hidden
Write-Output "started, waiting for health..."

$ok = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:7778/health" -Method Get -TimeoutSec 5
    if ($h) { Write-Output "HEALTH after $($i+1)s: $($h | ConvertTo-Json -Compress)"; $ok = $true; break }
  } catch { }
}
if (-not $ok) { Write-Output "HEALTH FAILED after 30s" }

Write-Output "=== 5. quick version check ==="
try {
  $v = Invoke-RestMethod -Uri "http://127.0.0.1:7778/api/version" -Method Get -TimeoutSec 8
  Write-Output "version: $($v | ConvertTo-Json -Compress)"
} catch { Write-Output "version: $($_.Exception.Message)" }
