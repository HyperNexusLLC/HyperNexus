# Verify tool-suggestions fix: all body shapes + catalog fallback.
$ErrorActionPreference = "Continue"
$base = "http://127.0.0.1:7778/api/mcp/tool-suggestions"
function Show($label, $obj) {
  Write-Output "--- $label ---"
  $obj | ConvertTo-Json -Depth 6 -Compress
}

Write-Output "=== 1. plugin shape {query} ==="
$b1 = '{"query":"manage files and read git commits on github"}'
(Invoke-RestMethod -Uri $base -Method Post -ContentType "application/json" -Body $b1 -TimeoutSec 15) | ConvertTo-Json -Compress
Start-Sleep -Milliseconds 400
$g1 = Invoke-RestMethod -Uri "$base`?query=manage%20files%20and%20read%20git%20commits%20on%20github" -Method Get -TimeoutSec 20
Show "GET after plugin POST" $g1
if ($g1.data) { Write-Output "data.count = $($g1.data.Count)" } else { Write-Output "data is NULL/empty (FAIL)" }

Write-Output "=== 2. batch shape {messages} ==="
$b2 = '{"messages":[{"role":"user","content":"we need to deploy to hetzner with nginx and stripe billing"}],"sessionId":"probe-adv-2"}'
(Invoke-RestMethod -Uri $base -Method Post -ContentType "application/json" -Body $b2 -TimeoutSec 15) | ConvertTo-Json -Compress
Start-Sleep -Milliseconds 400
$g2 = Invoke-RestMethod -Uri "$base`?query=deploy%20to%20hetzner%20with%20nginx%20and%20stripe%20billing" -Method Get -TimeoutSec 20
Show "GET after batch POST" $g2
if ($g2.data) { Write-Output "data.count = $($g2.data.Count)" } else { Write-Output "data is NULL/empty (FAIL)" }

Write-Output "=== 3. flat shape {role,content} ==="
$b3 = '{"role":"user","content":"search the tool catalog for memory and embedding tools"}'
(Invoke-RestMethod -Uri $base -Method Post -ContentType "application/json" -Body $b3 -TimeoutSec 15) | ConvertTo-Json -Compress
Start-Sleep -Milliseconds 400
$g3 = Invoke-RestMethod -Uri "$base`?query=memory%20and%20embedding%20tools" -Method Get -TimeoutSec 20
Show "GET after flat POST" $g3
if ($g3.data) { Write-Output "data.count = $($g3.data.Count)" } else { Write-Output "data is NULL/empty (FAIL)" }

Write-Output "=== 4. GET with query only (catalog fallback) ==="
$g4 = Invoke-RestMethod -Uri "$base`?query=github%20issues%20pull%20requests" -Method Get -TimeoutSec 20
Show "GET query-only" $g4
if ($g4.data) { Write-Output "data.count = $($g4.data.Count) source=$($g4.bridge.source)" } else { Write-Output "data is NULL/empty (FAIL)" }

Write-Output "=== 5. GET no query (should be [] not null now) ==="
$g5 = Invoke-RestMethod -Uri $base -Method Get -TimeoutSec 20
Show "GET bare" $g5
if ($null -eq $g5.data) { Write-Output "data NULL (should be array)" } else { Write-Output "data type: $(if ($g5.data -is [array]) { "array count=$($g5.data.Count)" } else { "object" })" }
