# T9 surface tests: install.js dry-run, Pi parity, live MCP tools, kernel version check.
$ErrorActionPreference = "Continue"
$root = "C:\Users\hyper\workspace\HyperNexus"

Write-Output "=== 1. kernel 7778 binary build-time (stopword fix should be 19:15+) ==="
Get-Item "$root\bin\hypernexus.exe" | ForEach-Object { "hypernexus.exe: $($_.Length) bytes, built $($_.LastWriteTime)" }

Write-Output ""
Write-Output "=== 2. install.js dry-run (syntax check) ==="
$installJs = Get-Content "$root\addons\mimo\install.js" -Raw
if ($installJs -match "mergeJsoncPlugin" -and $installJs -match "ensurePluginNodeModules" -and $installJs -match "stripBom") {
  Write-Output "PASS install.js has all 3 key functions"
} else {
  Write-Output "FAIL install.js missing expected functions"
}
node -e "try { const fs = require('fs'); const src = fs.readFileSync(String.raw`$root\addons\mimo\install.js`, 'utf8'); new Function(src); console.log('PASS install.js parses as valid JS'); } catch(e) { console.log('FAIL install.js parse error: ' + e.message); }"

Write-Output ""
Write-Output "=== 3. Pi extension byte-identical check ==="
$a = Get-FileHash "$root\addons\pi\hypernexus.ts" -Algorithm MD5
$b = Get-FileHash "C:\Users\hyper\.pi\agent\extensions\hypernexus.ts" -Algorithm MD5
if ($a.Hash -eq $b.Hash) {
  Write-Output "PASS Pi extension copies identical (MD5 $($a.Hash.Substring(0,12))...)"
} else {
  Write-Output "FAIL Pi extension copies differ: $($a.Hash) vs $($b.Hash)"
}

Write-Output ""
Write-Output "=== 4. plugin node_modules junctions ==="
foreach ($pkg in @("hypernexus", "hypernexus-tui")) {
  $nm = "$root\addons\mimo\plugin\$pkg\node_modules"
  if (Test-Path $nm) {
    $item = Get-Item $nm -Force
    if ($item.LinkType -eq "Junction" -or $item.Attributes.ToString().Contains("ReparsePoint")) {
      Write-Output "PASS $pkg node_modules junction exists -> $($item.Target)"
    } else {
      Write-Output "WARN $pkg node_modules exists but is not a junction"
    }
  } else {
    Write-Output "FAIL $pkg node_modules missing"
  }
}

Write-Output ""
Write-Output "=== 5. live MCP servers (via kernel 7778) ==="
try {
  $mcp = Invoke-RestMethod -Uri "http://127.0.0.1:7778/api/mcp/servers" -Method Get -TimeoutSec 15
  $servers = $mcp.data
  Write-Output "MCP servers found: $(@($servers).Count)"
  foreach ($s in @($servers)) {
    Write-Output "  $($s.name): status=$($s.status) tools=$(@($s.tools).Count)"
  }
} catch {
  Write-Output "ERR mcp/servers: $($_.Exception.Message)"
}

Write-Output ""
Write-Output "=== 6. tool-suggestions on MAIN kernel 7778 (post-stopword build) ==="
try {
  $g = Invoke-RestMethod -Uri "http://127.0.0.1:7778/api/mcp/tool-suggestions?query=manage%20files%20on%20github" -Method Get -TimeoutSec 15
  $count = if ($null -eq $g.data) { "NULL" } else { @($g.data).Count }
  Write-Output "7778 manage files on github: count=$count source=$($g.bridge.source)"
  if ($g.data) { $g.data | ForEach-Object { "  $($_.toolName) [$($_.reason)]" } }
} catch {
  Write-Output "ERR 7778 tool-suggestions: $($_.Exception.Message)"
}

Write-Output ""
Write-Output "=== 7. plugin test suites re-run ==="
Push-Location "$root\addons\mimo\plugin\hypernexus"
$extResult = node "$root\bin\test-extensions.mjs" 2>&1
$extCode = $LASTEXITCODE
Pop-Location
Write-Output "test-extensions.mjs exit=$extCode"
$extResult | Select-Object -Last 6 | ForEach-Object { "  $_" }

$tuiResult = node "$root\bin\test-tui.mjs" 2>&1
$tuiCode = $LASTEXITCODE
Write-Output "test-tui.mjs exit=$tuiCode"
$tuiResult | Select-Object -Last 6 | ForEach-Object { "  $_" }
