# use-meta-model.ps1 — launch Grok on Meta muse-spark-1.3-contributor.
# MINTER PATTERN (per-invocation live mint — never snapshot a key).
# This script mints a FRESH Meta Model API key on every run from pi's
# auth.json identity (pi owns OAuth refresh), uses it for this process only,
# and never stores it. Minted keys die in ~24h; a pasted snapshot would rot.
#
#   .\use-meta-model.ps1 "your prompt here"   # or no args for REPL
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
  Write-Error 'Meta key mint failed. Run: node addons/grok/bin/meta-muse-key.mjs --check  — if it reports an expired session, /login meta in pi first (identity tokens are not renewable; pi owns refresh).'
  exit 1
}
$env:META_MUSE_API_KEY = $fresh.Trim()
$env:OPENAI_API_KEY = $env:META_MUSE_API_KEY
$env:OPENAI_BASE_URL = 'https://api.meta.ai/v1'
$env:OPENAI_MODEL = ('meta/' + $Model)
Write-Host '[hypernexus] minted fresh META_MUSE_API_KEY for this run only (value hidden, never stored). Starting grok with meta/'' + $Model + '' ...'

$oi = Get-Command interpreter -ErrorAction SilentlyContinue
if (-not $oi) { $oi = Get-Command grok -ErrorAction SilentlyContinue }

if ($Prompt -and $Prompt.Count -gt 0) {
  if ($oi) { & $oi.Source --model $env:OPENAI_MODEL -- $Prompt }
  else { Write-Error 'grok CLI not found (expected `interpreter` on PATH). Key was minted but no session started; install grok and re-run.'; exit 1 }
} else {
  if ($oi) { & $oi.Source --model $env:OPENAI_MODEL }
  else { Write-Error 'grok CLI not found (expected `interpreter` on PATH). Key was minted but no session started; install grok and re-run.'; exit 1 }
}
# Key dies with this process env. Next run mints fresh again.
