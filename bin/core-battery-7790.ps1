# Confirm test-4 shape + run MCP/core endpoint battery against the 7790 verification kernel.
$ErrorActionPreference = "Continue"
$base = "http://127.0.0.1:7790"

function Probe($name, $method, $path, $body) {
  try {
    $params = @{ Uri = "$base$path"; Method = $method; TimeoutSec = 12 }
    if ($body) { $params.Body = $body; $params.ContentType = "application/json" }
    $r = Invoke-RestMethod @params
    $json = $r | ConvertTo-Json -Depth 4 -Compress
    if ($json.Length -gt 180) { $json = $json.Substring(0, 180) + "..." }
    Write-Output "PASS $name -> $json"
  } catch {
    Write-Output "FAIL $name -> $($_.Exception.Message)"
  }
}

Write-Output "=== 0. tool-suggestions bare GET: exact type ==="
$g = Invoke-RestMethod -Uri "$base/api/mcp/tool-suggestions" -Method Get -TimeoutSec 15
Write-Output "data is null: $($null -eq $g.data)"
Write-Output "data JSON: $($g.data | ConvertTo-Json -Compress)"
Write-Output "data.Count: $(if ($null -eq $g.data) { 'N/A' } else { @($g.data).Count })"

Write-Output ""
Write-Output "=== 1. core health/version ==="
Probe "health" Get "/health" $null
Probe "api/version" Get "/api/version" $null

Write-Output ""
Write-Output "=== 2. MCP surface ==="
Probe "mcp/status" Get "/api/mcp/status" $null
Probe "mcp/servers" Get "/api/mcp/servers" $null
Probe "mcp/decision/list-all" Get "/api/mcp/decision/list-all" $null
Probe "mcp/decision/events" Get "/api/mcp/decision/events" $null

Write-Output ""
Write-Output "=== 3. tools catalog search ==="
Probe "tools/search github" Get "/api/tools/search?query=github&limit=3" $null
Probe "tools/search memory" Get "/api/tools/search?query=memory&limit=3" $null
Probe "tools/search file" Get "/api/tools/search?query=file&limit=3" $null

Write-Output ""
Write-Output "=== 4. prediction pipeline ==="
Probe "mcp/predict-tools" Post "/api/mcp/predict-tools" '{"chatHistory":"we need to manage github issues and deploy to hetzner","activeGoal":"setup CI"}'
Probe "mcp/tool-suggestions POST query" Post "/api/mcp/tool-suggestions" '{"query":"kubernetes deployment with nginx"}'

Write-Output ""
Write-Output "=== 5. memory endpoints ==="
Probe "memory/search" Get "/api/memory/search?query=kernel&limit=3" $null
Probe "memory/facts/add" Post "/api/memory/facts/add" '{"title":"e2e-verify-stopwords","content":"tool-suggestions stopword filter verified on 7790","tags":["e2e","test"],"namespace":"project"}'

Write-Output ""
Write-Output "=== 6. tool-suggestions final shape check ==="
$g2 = Invoke-RestMethod -Uri "$base/api/mcp/tool-suggestions?query=stripe%20billing%20checkout" -Method Get -TimeoutSec 15
Write-Output "count=$(if ($null -eq $g2.data) { 'NULL' } else { @($g2.data).Count }) source=$($g2.bridge.source)"
if ($g2.data) { $g2.data | ForEach-Object { "  $($_.toolName) [$($_.reason)]" } }
