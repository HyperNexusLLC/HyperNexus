# use-meta-model.ps1 — launch jcode on Meta muse-spark-1.3-contributor.
# NATIVE-FIRST. This script never stores credentials and never prints a key.
#
# Route 1 (PRIMARY — native jcode OAuth, no pi needed):
#   $env:JCODE_EXPERIMENTAL_MUSE_SUBSCRIPTION = '1'
#   jcode login --provider muse-subscription     # one-time device flow
#   .\use-meta-model.ps1 "hello"                 # runs on the native sub
#
# Route 2 (BRIDGE — pi OAuth session, per-shell mint for the BUILT-IN provider):
#   .\use-meta-model.ps1 -Bridge "hello"        # mints via pi auth.json
#
# Route 2 mints a ~24h Model API key LIVE from pi's OAuth identity token
# (addons/jcode/bin/meta-muse-key.mjs replays pi's own mint) and exports it as
# META_MUSE_API_KEY — the exact credential the BUILT-IN `meta-muse` provider
# reads (env var or ~/.config/jcode/meta-muse.env). No [providers.meta] custom
# profile needed: jcode ships meta-muse natively (-p meta-muse). The key lives
# only in this shell's environment — nothing is written to config.toml.
# 401/403 from the mint means the pi session lapsed: /login meta in pi again,
# or use Route 1.
param(
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Prompt,
  [switch]$Bridge
)

$RepoRoot = Split-Path $PSScriptRoot -Parent
$Minter = Join-Path $PSScriptRoot 'bin\meta-muse-key.mjs'
$NativeCreds = Join-Path $HOME '.jcode\muse_subscription.json'

function Start-Jcode($ExtraArgs) {
  $jcode = Get-Command jcode -ErrorAction SilentlyContinue
  if (-not $jcode) { $jcode = 'C:\Users\hyper\AppData\Local\jcode\bin\jcode.exe' }
  if ($Prompt -and $Prompt.Count -gt 0) {
    # One-shot: jcode run -p <provider> -m <model> -- <prompt>. Bare flags +
    # prompt is TUI syntax and jcode rejects the trailing words as a subcommand.
    & $jcode run @ExtraArgs -- $Prompt
  } else {
    & $jcode @ExtraArgs
  }
}

if (-not $Bridge) {
  # Route 1: native subscription. Presence-check the jcode-owned credential;
  # never read or print token contents.
  if (Test-Path $NativeCreds) {
    Write-Host '[hypernexus] native muse-subscription credential found. Starting jcode on muse-spark-1.3-contributor (subscription billing via jcode native route) ...'
    $env:JCODE_EXPERIMENTAL_MUSE_SUBSCRIPTION = '1'
    Start-Jcode @('-p', 'muse-subscription', '-m', 'muse-spark-1.3-contributor')
    return
  }
  Write-Host '[hypernexus] no native muse-subscription credential yet.'
  Write-Host '  1) $env:JCODE_EXPERIMENTAL_MUSE_SUBSCRIPTION = ''1'''
  Write-Host '  2) jcode login --provider muse-subscription   # one-time device flow, approves in browser'
  Write-Host '  3) re-run .\use-meta-model.ps1'
  Write-Host ''
  Write-Host 'Alternatively, bridge pi''s live OAuth session for this shell only: .\use-meta-model.ps1 -Bridge'
  exit 1
}

# Route 2: bridge — mint a live key from pi auth.json into THIS SHELL ONLY.
Write-Host '[hypernexus] bridging pi Meta OAuth session (mint is live, ~24h, shell-local) ...'
$minted = & node $Minter 2>$null
if ([string]::IsNullOrEmpty($minted)) {
  Write-Error 'Meta key mint failed (see [meta-muse-key] message above). Run /login meta in pi, or use the native route instead.'
  exit 1
}
$env:META_MUSE_API_KEY = $minted
$minted = $null
Write-Host '[hypernexus] META_MUSE_API_KEY is set for this shell only (value hidden). Starting jcode with meta/muse-spark-1.3-contributor ...'
Start-Jcode @('-p', 'meta-muse', '-m', 'muse-spark-1.3-contributor')
