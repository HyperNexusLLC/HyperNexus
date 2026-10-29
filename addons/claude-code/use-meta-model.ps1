# use-meta-model.ps1 — launch Claude Code on Meta muse-spark-1.3-contributor.
# USER-RUN ONLY. Mints a FRESH Model API key per run via bin/meta-muse-key.mjs
# (pi owns OAuth refresh; nothing stored, nothing pasted). The key lives only in
# this shell's environment for the child Claude Code process, as an override —
# without it, the kernel reads the pi Meta OAuth identity itself per request.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Prompt)

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$minter = Join-Path $here 'bin\meta-muse-key.mjs'

try {
  $key = (node $minter) 2>$null
} catch {
  Write-Error 'Meta mint failed. Run: node bin/meta-muse-key.mjs --check  (if 401/403: /login meta in pi first).'
  exit 1
}
if ([string]::IsNullOrWhiteSpace($key)) {
  Write-Error 'Meta mint returned empty. Run: node bin/meta-muse-key.mjs --check'
  exit 1
}
$env:META_MUSE_API_KEY = $key.Trim()
Write-Host '[hypernexus] META_MUSE_API_KEY minted fresh for this run (value hidden). Starting Claude Code with muse-spark-1.3-contributor ...'

$kernel = $env:HYPERNEXUS_URL
if ([string]::IsNullOrEmpty($kernel)) { $kernel = 'http://127.0.0.1:7778' }
$env:ANTHROPIC_BASE_URL = $kernel
$env:ANTHROPIC_API_KEY = 'hypernexus-local'
$env:ANTHROPIC_MODEL = 'muse-spark-1.3-contributor'

$claude = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claude) { $claude = 'C:\Users\hyper\AppData\Roaming\npm\claude.ps1' }

$pluginDir = Join-Path $here 'plugin' 'hypernexus'

if ($Prompt -and $Prompt.Count -gt 0) {
  & $claude --plugin-dir $pluginDir -p --model muse-spark-1.3-contributor -- $Prompt
} else {
  & $claude --plugin-dir $pluginDir --model muse-spark-1.3-contributor
}
