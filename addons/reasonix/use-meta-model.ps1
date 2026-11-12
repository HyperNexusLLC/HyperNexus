# use-meta-model.ps1 — launch Reasonix on Meta muse-spark-1.3-contributor.
# MINTER PATTERN (per-invocation live mint — never snapshot a key).
# This script mints a FRESH Meta Model API key on every run from pi's
# auth.json identity (pi owns OAuth refresh), uses it for this process only,
# and never stores it. Minted keys die in ~24h; a pasted snapshot would rot.
#
#   .\use-meta-model.ps1 "your prompt here"   # one-shot via run
#   .\use-meta-model.ps1                      # interactive TUI
#   # optional persistent wiring: merge meta-model.reasonix.toml [[providers]]
#   # block into %APPDATA%\reasonix\config.toml, then /model in the TUI.
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
  Write-Error 'Meta key mint failed. Run: node addons/reasonix/bin/meta-muse-key.mjs --check  — if it reports an expired session, /login meta in pi first (identity tokens are not renewable; pi owns refresh).'
  exit 1
}
$env:META_MUSE_API_KEY = $fresh.Trim()
Write-Host '[hypernexus] minted fresh META_MUSE_API_KEY for this run only (value hidden, never stored). Starting reasonix with meta/'' + $Model + '' ...'

$reasonix = Get-Command reasonix -ErrorAction SilentlyContinue
if (-not $reasonix) { $reasonix = 'reasonix' }

if ($Prompt -and $Prompt.Count -gt 0) {
  # Headless runs must not stall on approvals (-y). NOTE (2026-11-07):
  # reasonix natively declares read_file/write_file/edit_file, which used to
  # 403 via the kernel proxy (live-bisected). The kernel attestation strip
  # list now covers those names (go/internal/httpapi/openai_compat.go), so the
  # proxy strips them on retry and live Meta inference in reasonix is
  # UNBLOCKED (verified: /v1/chat/completions + file tools -> HTTP 200 PONG).
  # reasonix run has no --disallowed-tools flag (only --allowed-tools), so the
  # kernel strip-and-retry is the mechanism — no client flags needed.
  & $reasonix run -y --model ('meta/' + $Model) -- $Prompt
} else {
  $env:REASONIX_MODEL = ('meta/' + $Model)
  & $reasonix --model ('meta/' + $Model)
}
# Key dies with this process env. Next run mints fresh again.
