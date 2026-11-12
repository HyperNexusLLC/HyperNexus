# use-meta-model.ps1 — launch Freebuff on Meta muse-spark-1.3-contributor.
# MINTER PATTERN (per-invocation live mint — never snapshot a key).
# This script mints a FRESH Meta Model API key on every run from pi's
# auth.json identity (pi owns OAuth refresh), uses it for this process only,
# and never stores it. Minted keys die in ~24h; a pasted snapshot would rot.
#
#   .\use-meta-model.ps1 "your prompt here"   # or no args for TUI
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Prompt)

# NOTE (2026-11-07, verified live): this freebuff build is interactive-
# TUI-only (no --model flag, no one-shot prompt; it draws the TUI and waits).
# Fail fast BEFORE minting so a doomed run never spends a key. Use the TUI
# branch below (FREEBUFF_MODEL env) for live turns.
if ($Prompt -and $Prompt.Count -gt 0) {
  Write-Error 'Headless one-shot is not supported by this freebuff build (interactive TUI only). Run without args for the TUI (model via FREEBUFF_MODEL), or use a harness with a headless path.'
  exit 2
}

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
  Write-Error 'Meta key mint failed. Run: node addons/freebuff/bin/meta-muse-key.mjs --check  — if it reports an expired session, /login meta in pi first (identity tokens are not renewable; pi owns refresh).'
  exit 1
}
$env:META_MUSE_API_KEY = $fresh.Trim()
Write-Host '[hypernexus] minted fresh META_MUSE_API_KEY for this run only (value hidden, never stored). Starting freebuff with meta/' + $Model + ' ...'

$freebuff = Get-Command freebuff -ErrorAction SilentlyContinue
if (-not $freebuff) { $freebuff = 'C:\Users\hyper\AppData\Roaming\npm\freebuff.ps1' }

if ($Prompt -and $Prompt.Count -gt 0) {
  # (Unreachable: one-shot prompts exit above before minting.)
  exit 2
} else {
  $env:FREEBUFF_MODEL = ('meta/' + $Model)
  & $freebuff
}
# Key dies with this process env. Next run mints fresh again.
