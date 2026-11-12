# T9 extended surface: additional kernel endpoints + live MiMoCode MCP tools.
$ErrorActionPreference = "Continue"
$base = "http://127.0.0.1:7778"

function Probe($name, $method, $path, $body) {
  try {
    $params = @{ Uri = "$base$path"; Method = $method; TimeoutSec = 12 }
    if ($body) { $params.Body = $body; $params.ContentType = "application/json" }
    $r = Invoke-RestMethod @params
    $json = $r | ConvertTo-Json -Depth 3 -Compress
    if ($json.Length -gt 150) { $json = $json.Substring(0, 150) + "..." }
    Write-Output "PASS $name -> $json"
  } catch {
    $code = "ERR"
    try { $code = $_.Exception.Response.StatusCode.value__ } catch {}
    Write-Output "FAIL $name [$code] $($_.Exception.Message.Substring(0, [Math]::Min(80, $_.Exception.Message.Length)))"
  }
}

Write-Output "=== kernel endpoints battery ==="
Probe "mcp/tools/predict" Post "/api/mcp/tools/predict" '{"chatHistory":"manage github files","activeGoal":"code review"}'
Probe "mcp/tools/predict-conversational" Post "/api/mcp/tools/predict-conversational" '{"prompt":"deploy to kubernetes"}'
Probe "mcp/conversation/append" Post "/api/mcp/conversation/append" '{"role":"user","content":"test message"}'
Probe "expert/predict" Post "/api/expert/predict" '{"history":"help with docker","goal":"containerize app"}'
Probe "logs" Get "/api/logs" $null
Probe "logs/summary" Get "/api/logs/summary" $null
Probe "tools/get" Get "/api/tools/get?name=hypernexus__bash" $null
Probe "mcp/decision/servers" Get "/api/mcp/decision/servers" $null
Probe "orchestration/status" Get "/api/orchestration/status" $null
Probe "memory/stats" Get "/api/memory/stats" $null
Probe "sessions" Get "/api/sessions" $null
Probe "config" Get "/api/config" $null
Probe "system/status" Get "/api/system/status" $null
Probe "aggregator/status" Get "/api/aggregator/status" $null

Write-Output ""
Write-Output "=== POST tool-suggestions all 4 shapes (regression) ==="
Probe "messages[] shape" Post "/api/mcp/tool-suggestions" '{"messages":[{"role":"user","content":"manage github issues"}]}'
Probe "flat role/content" Post "/api/mcp/tool-suggestions" '{"role":"user","content":"deploy kubernetes"}'
Probe "query shorthand" Post "/api/mcp/tool-suggestions" '{"query":"read local files"}'
Probe "bare content" Post "/api/mcp/tool-suggestions" '{"content":"search code for bugs"}'

Write-Output ""
Write-Output "=== GET tool-suggestions after feeding (advertiser state) ==="
Start-Sleep -Seconds 1
Probe "after feed" Get "/api/mcp/tool-suggestions" $null
