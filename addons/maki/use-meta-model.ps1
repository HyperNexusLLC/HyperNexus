# use-meta-model.ps1 — launch Maki on Meta muse-spark-1.3-contributor.
# MINTER PATTERN (per-invocation live mint — never snapshot a key).
# This script mints a FRESH Meta Model API key on every run from pi's
# auth.json identity (pi owns OAuth refresh), uses it for this process only,
# and never stores it. Minted keys die in ~24h; a pasted snapshot would rot.
#
# Maki's PRIMARY auth remains its native device-code flow in
# extensions/maki-hypernexus/lua/meta_oauth.lua (plugin store -> env -> pi
# auth.json); this launcher covers the shell path (kernel /v1 probes,
# headless turns needing META_MUSE_API_KEY in the environment).
#
#   .\use-meta-model.ps1 "your prompt here"   # or no args for TUI
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Prompt)

$mintScript = Join-Path $PSScriptRoot 'bin/meta-muse-key.mjs'
try {
  $fresh = & node $mintScript 2>$null
} catch {
  $fresh = $null
}
if ([string]::IsNullOrWhiteSpace($fresh)) {
  Write-Error 'Meta key mint failed. Run: node addons/maki/bin/meta-muse-key.mjs --check  — if it reports an expired session, /login meta in pi first (identity tokens are not renewable; pi owns refresh).'
  exit 1
}
$env:META_MUSE_API_KEY = $fresh.Trim()
Write-Host '[hypernexus] minted fresh META_MUSE_API_KEY for this run only (value hidden, never stored). Starting maki with meta/muse-spark-1.3-contributor ...'

if ($Prompt -and $Prompt.Count -gt 0) {
  & maki -p -- $Prompt -m 'meta/muse-spark-1.3-contributor'
} else {
  & maki
}
# Key dies with this process env. Next run mints fresh again.
