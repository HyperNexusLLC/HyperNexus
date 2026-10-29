# use-meta-model.ps1 — launch Reasonix on Meta muse-spark-1.3-contributor.
# USER-RUN ONLY. This script never reads auth.json / token files and never
# prints the key. It only presence-checks the VARIABLE NAME, then launches.
#
#   1. $env:META_MUSE_API_KEY = '<paste-your-token-here>'  # you set this
#   2. .\use-meta-model.ps1 "your prompt here"             # one-shot via run
#   3. .\use-meta-model.ps1                                # interactive TUI
#   # optional persistent wiring: merge meta-model.reasonix.toml [[providers]]
#   # block into %APPDATA%\reasonix\config.toml, then /model in the TUI.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Prompt)

if ([string]::IsNullOrEmpty($env:META_MUSE_API_KEY)) {
  Write-Error 'META_MUSE_API_KEY is not set. Set the variable in this shell first, then re-run. The value is never displayed or stored by this script.'
  exit 1
}
Write-Host '[hypernexus] META_MUSE_API_KEY is set (value hidden). Starting reasonix with meta/muse-spark-1.3-contributor ...'

$reasonix = Get-Command reasonix -ErrorAction SilentlyContinue
if (-not $reasonix) { $reasonix = 'reasonix' }

if ($Prompt -and $Prompt.Count -gt 0) {
  & $reasonix run --model 'meta/muse-spark-1.3-contributor' -- $Prompt
} else {
  $env:REASONIX_MODEL = 'meta/muse-spark-1.3-contributor'
  & $reasonix --model 'meta/muse-spark-1.3-contributor'
}
