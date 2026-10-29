# use-meta-model.ps1 — launch Crush on Meta muse-spark-1.3-contributor.
# USER-RUN ONLY. Mints a FRESH Model API key per run via bin/meta-muse-key.mjs
# (pi owns OAuth refresh; nothing stored, nothing pasted). The key lives only in
# this shell's environment for the child Crush process.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Prompt)

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$minter = Join-Path $here 'bin\meta-muse-key.mjs'
$repoRoot = Split-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) -Parent
if (-not (Test-Path $minter)) { $minter = Join-Path $repoRoot 'addons\crush\bin\meta-muse-key.mjs' }

try {
  $key = (node $minter) 2>$null
} catch {
  Write-Error 'Meta mint failed. Run: node addons/crush/bin/meta-muse-key.mjs --check  (if 401/403: /login meta in pi first).'
  exit 1
}
if ([string]::IsNullOrWhiteSpace($key)) {
  Write-Error 'Meta mint returned empty. Run: node addons/crush/bin/meta-muse-key.mjs --check'
  exit 1
}
$env:META_MUSE_API_KEY = $key.Trim()
Write-Host '[hypernexus] META_MUSE_API_KEY minted fresh for this run (value hidden). Starting crush with meta/muse-spark-1.3-contributor ...'

$crush = Get-Command crush -ErrorAction SilentlyContinue
if (-not $crush) { Write-Error 'crush not found on PATH.'; exit 1 }

if ($Prompt -and $Prompt.Count -gt 0) {
  & crush run -m 'meta/muse-spark-1.3-contributor' ($Prompt -join ' ')
} else {
  & crush --model 'meta/muse-spark-1.3-contributor'
}
