# Diagnose predict-tools route + stripe/checkout catalog vs suggestions on 7790.
$ErrorActionPreference = "Continue"

Write-Output "=== predict route registration ==="
Select-String -Path "C:\Users\hyper\workspace\HyperNexus\go\internal\httpapi\*.go" -Pattern "predict" -CaseSensitive | ForEach-Object { "$($_.Filename):$($_.LineNumber): $($_.Line.Trim())" }

Write-Output ""
Write-Output "=== tools/search stripe ==="
try { (Invoke-RestMethod -Uri "http://127.0.0.1:7790/api/tools/search?query=stripe&limit=5" -Method Get -TimeoutSec 20) | ConvertTo-Json -Depth 4 -Compress } catch { Write-Output "ERR $($_.Exception.Message)" }

Write-Output ""
Write-Output "=== tools/search checkout ==="
try { (Invoke-RestMethod -Uri "http://127.0.0.1:7790/api/tools/search?query=checkout&limit=5" -Method Get -TimeoutSec 20) | ConvertTo-Json -Depth 4 -Compress } catch { Write-Output "ERR $($_.Exception.Message)" }

Write-Output ""
Write-Output "=== suggest?query=stripe ==="
try { $g = Invoke-RestMethod -Uri "http://127.0.0.1:7790/api/mcp/tool-suggestions?query=stripe" -Method Get -TimeoutSec 20; Write-Output "count=$(if ($null -eq $g.data) { 'NULL' } else { @($g.data).Count }) source=$($g.bridge.source)"; if ($g.data) { $g.data | ForEach-Object { "  $($_.toolName)" } } } catch { Write-Output "ERR $($_.Exception.Message)" }

Write-Output ""
Write-Output "=== suggest?query=billing ==="
try { $g2 = Invoke-RestMethod -Uri "http://127.0.0.1:7790/api/mcp/tool-suggestions?query=billing" -Method Get -TimeoutSec 20; Write-Output "count=$(if ($null -eq $g2.data) { 'NULL' } else { @($g2.data).Count }) source=$($g2.bridge.source)"; if ($g2.data) { $g2.data | ForEach-Object { "  $($_.toolName)" } } } catch { Write-Output "ERR $($_.Exception.Message)" }

Write-Output ""
Write-Output "=== version endpoint variants ==="
foreach ($p in @("/api/version", "/api/v1/version", "/version", "/api/kernel/version")) {
  try { $r = Invoke-RestMethod -Uri "http://127.0.0.1:7790$p" -Method Get -TimeoutSec 10; Write-Output "PASS $p -> $($r | ConvertTo-Json -Compress)" } catch { Write-Output "FAIL $p -> $($_.Exception.Response.StatusCode.value__)" }
}
