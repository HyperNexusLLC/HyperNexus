# use-meta-model.ps1 — launch OpenCode on Meta muse-spark-1.3-contributor.
# USER-MINTED KEY ONLY. This script mints a Model API key LIVE from the pi
# Meta OAuth identity (pi owns refresh) into the CURRENT SHELL's environment —
# it never writes the key to config files, logs, or transcripts, and never
# prints it. Falls back to a pre-set $env:META_MUSE_API_KEY when minting is
# unavailable (e.g. pi not logged in).
#
#   1. (pi, once) /login meta          # sign the pi Meta OAuth subscription in
#   2. .\use-meta-model.ps1 "prompt"   # TUI when no prompt args are given
#
# Env overrides: META_AUTH_PATH, META_KEY_MINT_URL (see bin/meta-muse-key.mjs).
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Prompt)

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$minter = Join-Path $here 'bin\meta-muse-key.mjs'

if ([string]::IsNullOrEmpty($env:META_MUSE_API_KEY)) {
  if (Test-Path $minter) {
    try {
      $minted = & node $minter 2>$null
      if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($minted)) {
        $env:META_MUSE_API_KEY = $minted
        Remove-Variable -Name minted -ErrorAction SilentlyContinue
        Write-Host '[hypernexus] minted Meta Model API key from pi OAuth (value hidden).'
      }
    } catch { }
  }
}
if ([string]::IsNullOrEmpty($env:META_MUSE_API_KEY)) {
  Write-Error 'META_MUSE_API_KEY is not set and live mint from pi auth.json failed. Run /login meta in pi, or set $env:META_MUSE_API_KEY in this shell, then re-run. The value is never displayed or stored by this script.'
  exit 1
}
Write-Host '[hypernexus] META_MUSE_API_KEY is set (value hidden). Starting OpenCode with meta/muse-spark-1.3-contributor ...'

$opencode = Get-Command opencode -ErrorAction SilentlyContinue
if (-not $opencode) { $opencode = 'C:\Users\hyper\AppData\Roaming\npm\opencode.cmd' }

if ($Prompt -and $Prompt.Count -gt 0) {
  & $opencode run --model 'meta/muse-spark-1.3-contributor' -- $Prompt
} else {
  $env:OPENCODE_MODEL = 'meta/muse-spark-1.3-contributor'
  & $opencode
}
