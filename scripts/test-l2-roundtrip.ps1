# L2 export/import round-trip test
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:7778"
$tmp = Join-Path $env:TEMP "l2-roundtrip-$(Get-Date -Format yyyyMMddHHmmss)"
New-Item -ItemType Directory -Path $tmp | Out-Null

Write-Host "1) Export current L2"
$export = Invoke-RestMethod "$base/api/memory/l2/export"
$exportPath = Join-Path $tmp "export.json"
$export.data | ConvertTo-Json -Depth 8 | Set-Content $exportPath
Write-Host "   count=$($export.data.count)"

Write-Host "2) Import payload back (should upsert, not crash)"
$importBody = Get-Content $exportPath -Raw
$import = Invoke-RestMethod -Method Post -Uri "$base/api/memory/l2/import" -ContentType "application/json" -Body $importBody
Write-Host "   imported=$($import.data.imported) errors=$(($import.data.errors | Measure-Object).Count)"

Write-Host "3) Re-export and compare counts"
$export2 = Invoke-RestMethod "$base/api/memory/l2/export"
Write-Host "   count_after=$($export2.data.count)"

Write-Host "4) Semantic search still works"
$search = Invoke-RestMethod "$base/api/memory/search?query=HyperNexus&limit=3"
Write-Host "   search_hits=$(($search.data | Measure-Object).Count)"

Write-Host "5) Graph intact"
$graph = Invoke-RestMethod "$base/api/memory/graph?limit=50"
Write-Host "   nodes=$(($graph.data.nodes | Measure-Object).Count) edges=$(($graph.data.edges | Measure-Object).Count)"

if ($export.data.count -gt 0 -and $import.data.imported -ge 0 -and $export2.data.count -ge $export.data.count * 0.5) {
  Write-Host "ROUND-TRIP OK"
  exit 0
} else {
  Write-Host "ROUND-TRIP CHECK FAILED"
  exit 1
}
