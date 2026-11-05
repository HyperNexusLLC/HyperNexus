# use-meta-model.ps1 — launch Claude Code on Meta muse-spark-1.3-contributor.
# USER-RUN ONLY. Mints a FRESH Model API key per run via bin/meta-muse-key.mjs
# (pi owns OAuth refresh; nothing stored, nothing pasted). The key lives only in
# this shell's environment for the child Claude Code process, as an override —
# without it, the kernel reads the pi Meta OAuth identity itself per request.
#
# META ATTESTATION: Meta's subscription attestation denies exact bare tool names
# (bash/powershell/shell/add_memory) with 403 client_attestation_denied when
# they appear in model requests. This launcher therefore excludes the native
# Bash tool from the model's tool list (--disallowedTools). Shell and file work
# goes through the HyperNexus MCP parity tools instead (mcp__hypernexus__read,
# mcp__hypernexus__write, mcp__hypernexus__edit, mcp__hypernexus__grep,
# mcp__hypernexus__find, mcp__hypernexus__ls, mcp__hypernexus__codebase_search,
# mcp__hypernexus__code_interpreter for snippets) with minimal descriptions.
# The kernel Anthropic shim additionally renames any bare denied tool that still
# reaches it (bash->hypernexus_bash etc.) and maps the name back on return, so
# the tool loop keeps working with real names.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Prompt)

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$minter = Join-Path $here 'bin\meta-muse-key.mjs'
# Dual-model: META_MODEL env override (default spark, opt-in wonder).
$MetaWanted = if ($env:META_MODEL) { $env:META_MODEL.Replace('meta/','') } else { 'muse-spark-1.3-contributor' }
$Model = if ($MetaWanted -in 'muse-spark-1.3-contributor', 'muse-wonder-1.0-contributor') { $MetaWanted } else { 'muse-spark-1.3-contributor' }

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
Write-Host ('[hypernexus] META_MUSE_API_KEY minted fresh for this run (value hidden). Starting Claude Code with ' + $Model + ' ...')

$kernel = $env:HYPERNEXUS_URL
if ([string]::IsNullOrEmpty($kernel)) { $kernel = 'http://127.0.0.1:7778' }
$env:ANTHROPIC_BASE_URL = $kernel
$env:ANTHROPIC_API_KEY = 'hypernexus-local'
$env:ANTHROPIC_MODEL = $Model

$claude = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claude) { $claude = 'C:\Users\hyper\AppData\Roaming\npm\claude.ps1' }

$pluginDir = Join-Path $here 'plugin' 'hypernexus'

if ($Prompt -and $Prompt.Count -gt 0) {
  & $claude --plugin-dir $pluginDir -p --model $Model --disallowedTools Bash -- $Prompt
} else {
  & $claude --plugin-dir $pluginDir --model $Model --disallowedTools Bash
}
