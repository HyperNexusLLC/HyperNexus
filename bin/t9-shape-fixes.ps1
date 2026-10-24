# Verify 400s with correct shapes + real-route equivalents of the 404s.
$ErrorActionPreference = "Continue"
$base = "http://127.0.0.1:7778"

function Probe($name, $method, $path, $body) {
  try {
    $params = @{ Uri = "$base$path"; Method = $method; TimeoutSec = 12 }
    if ($body) { $params.Body = $body; $params.ContentType = "application/json" }
    $r = Invoke-RestMethod @params
    $json = $r | ConvertTo-Json -Depth 3 -Compress
    if ($json.Length -gt 140) { $json = $json.Substring(0, 140) + "..." }
    Write-Output "PASS $name -> $json"
  } catch {
    $code = "ERR"
    try { $code = $_.Exception.Response.StatusCode.value__ } catch {}
    Write-Output "FAIL $name [$code] $($_.Exception.Message.Substring(0, [Math]::Min(70, $_.Exception.Message.Length)))"
  }
}

Write-Output "=== conversation/append shapes ==="
Probe "append turn field" Post "/api/mcp/conversation/append" '{"turn":{"role":"user","content":"hello"}}'
Probe "append speaker/text" Post "/api/mcp/conversation/append" '{"speaker":"user","text":"hello"}'
Probe "append role/text" Post "/api/mcp/conversation/append" '{"role":"user","text":"hello"}'
Probe "conversation/window" Get "/api/mcp/conversation/window" $null

Write-Output ""
Write-Output "=== tools/get shapes ==="
Probe "tools/get name param" Get "/api/tools/get?name=bash" $null
Probe "tools/get tool param" Get "/api/tools/get?tool=hypernexus__bash" $null
Probe "tools/get id param" Get "/api/tools/get?id=1" $null

Write-Output ""
Write-Output "=== real-route equivalents of 404s ==="
Probe "mcp/decision/list-loaded" Get "/api/mcp/decision/list-loaded" $null
Probe "config/status" Get "/api/config/status" $null
Probe "agent-memory/stats" Get "/api/agent-memory/stats" $null
Probe "runtime/status" Get "/api/runtime/status" $null
Probe "mesh/status" Get "/api/mesh/status" $null
Probe "council/status" Get "/api/council/status" $null
Probe "billing/status" Get "/api/billing/status" $null
Probe "providers/status" Get "/api/providers/status" $null
Probe "skills/summary" Get "/api/skills/summary" $null
Probe "tools/native" Get "/api/tools/native" $null
Probe "system/overview" Get "/api/system/overview" $null
Probe "health" Get "/api/health" $null

Write-Output ""
Write-Output "=== decision/search (catalog search API) ==="
Probe "decision/search github" Post "/api/mcp/decision/search" '{"query":"github file management","limit":5}'
Probe "decision/search memory" Post "/api/mcp/decision/search" '{"query":"memory store","limit":5}'
