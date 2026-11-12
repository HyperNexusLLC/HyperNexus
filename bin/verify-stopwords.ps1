# Start a verification kernel on port 7790 (isolated config-dir) to test the stopword build.
$ErrorActionPreference = "Continue"
$bin = "C:\Users\hyper\workspace\HyperNexus\bin"
$testCfg = "C:\Users\hyper\.hypernexus-test"
New-Item -ItemType Directory -Force -Path $testCfg | Out-Null

Write-Output "=== start verification kernel on 7790 ==="
Start-Process -FilePath "$bin\hypernexus.exe" -ArgumentList "serve","--port","7790","--config-dir",$testCfg -WorkingDirectory "C:\Users\hyper\workspace\HyperNexus" -WindowStyle Hidden

for ($i = 0; $i -lt 25; $i++) {
  Start-Sleep -Seconds 1
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:7790/health" -Method Get -TimeoutSec 3
    if ($h.ok) { Write-Output "HEALTH OK after $($i+1)s: $($h | ConvertTo-Json -Compress)"; break }
  } catch {}
  if ($i -eq 24) { Write-Output "HEALTH FAILED" }
}

Write-Output "=== tool-suggestions test on 7790 ==="
$base = "http://127.0.0.1:7790/api/mcp/tool-suggestions"

Write-Output "--- 1. plugin shape {query} ---"
(Invoke-RestMethod -Uri $base -Method Post -ContentType "application/json" -Body '{"query":"manage files and read git commits on github"}' -TimeoutSec 15) | ConvertTo-Json -Compress
Start-Sleep -Milliseconds 400
$g1 = Invoke-RestMethod -Uri "$base`?query=manage%20files%20and%20read%20git%20commits%20on%20github" -Method Get -TimeoutSec 20
Write-Output "count=$(if ($g1.data) { $g1.data.Count } else { 'NULL' }) source=$($g1.bridge.source)"
$g1.data | ForEach-Object { "  $($_.toolName) [$($_.reason)] score=$($_.score)" }

Write-Output "--- 2. GET query-only (catalog fallback) ---"
$g4 = Invoke-RestMethod -Uri "$base`?query=github%20issues%20pull%20requests" -Method Get -TimeoutSec 20
Write-Output "count=$(if ($g4.data) { $g4.data.Count } else { 'NULL' }) source=$($g4.bridge.source)"
$g4.data | ForEach-Object { "  $($_.toolName) [$($_.reason)] score=$($_.score)" }

Write-Output "--- 3. batch shape {messages} ---"
(Invoke-RestMethod -Uri $base -Method Post -ContentType "application/json" -Body '{"messages":[{"role":"user","content":"deploy to hetzner with nginx and stripe billing"}],"sessionId":"t2"}' -TimeoutSec 15) | ConvertTo-Json -Compress
Start-Sleep -Milliseconds 400
$g2 = Invoke-RestMethod -Uri "$base`?query=deploy%20to%20hetzner%20with%20nginx%20and%20stripe%20billing" -Method Get -TimeoutSec 20
Write-Output "count=$(if ($g2.data) { $g2.data.Count } else { 'NULL' }) source=$($g2.bridge.source)"
$g2.data | ForEach-Object { "  $($_.toolName) [$($_.reason)] score=$($_.score)" }

Write-Output "--- 4. GET bare (must be [] not null) ---"
$g5 = Invoke-RestMethod -Uri $base -Method Get -TimeoutSec 20
Write-Output "data=$($g5.data | ConvertTo-Json -Compress)"
