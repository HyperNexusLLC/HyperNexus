# use-meta-model.ps1 — launch Prime Agent on Meta muse-spark-1.3-contributor.
# MINTER PATTERN (per-invocation live mint — never snapshot a key).
# This script mints a FRESH Meta Model API key on every run from pi's
# auth.json identity (pi owns OAuth refresh), uses it for this process only,
# and never stores it. Minted keys die in ~24h; a pasted snapshot would rot.
#
#   .\use-meta-model.ps1 "your prompt here"          # one-shot via -p
#   .\use-meta-model.ps1                             # interactive TUI
#   # optional persistent wiring: merge the "meta" block from
#   # meta-model.prime.json into ~/.prime/agent/models.json under "providers",
#   # then: prime-agent --provider meta --model muse-spark-1.3-contributor
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Prompt)

$mintScript = Join-Path $PSScriptRoot 'bin/meta-muse-key.mjs'
# Dual-model: META_MODEL env override (default spark, opt-in wonder).
$MetaWanted = if ($env:META_MODEL) { $env:META_MODEL.Replace('meta/','') } else { 'muse-spark-1.3-contributor' }
$Model = if ($MetaWanted -in 'muse-spark-1.3-contributor', 'muse-wonder-1.0-contributor') { $MetaWanted } else { 'muse-spark-1.3-contributor' }
try {
  $fresh = & node $mintScript 2>$null
} catch {
  $fresh = $null
}
if ([string]::IsNullOrWhiteSpace($fresh)) {
  Write-Error 'Meta key mint failed. Run: node addons/prime-agent/bin/meta-muse-key.mjs --check  — if it reports an expired session, /login meta in pi first (identity tokens are not renewable; pi owns refresh).'
  exit 1
}
$env:MODEL_API_KEY = $fresh.Trim()
Write-Host ('[hypernexus] minted fresh MODEL_API_KEY for this run only (value hidden, never stored). Starting prime-agent with meta/' + $Model + ' ...')

$cli = Get-Command prime-agent -ErrorAction SilentlyContinue
$bin = if ($cli) { 'prime-agent' } else { Join-Path $HOME '.local\bin\prime-agent.cmd' }

if ($Prompt -and $Prompt.Count -gt 0) {
  & $bin --provider meta --model $Model -p -- $Prompt
} else {
  & $bin --provider meta --model $Model
}
# Key dies with this process env. Next run mints fresh again.
