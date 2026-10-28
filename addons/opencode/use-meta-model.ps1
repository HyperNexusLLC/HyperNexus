# use-meta-model.ps1 — launch OpenCode on Meta muse-spark-1.3-contributor.
# USER-RUN ONLY. This script never reads auth.json / token files and never
# prints the key. It only presence-checks the VARIABLE NAME, then launches.
#
#   1. $env:META_MUSE_API_KEY = '<paste-your-token-here>'  # you set this
#   2. .\use-meta-model.ps1 "your prompt here"             # or no args for TUI
#   3. # optional default model for TUI: merge meta-model.opencode.jsonc
#      # "provider" block into opencode.json(c), then /models in the TUI.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Prompt)

if ([string]::IsNullOrEmpty($env:META_MUSE_API_KEY)) {
  Write-Error 'META_MUSE_API_KEY is not set. Set the variable in this shell first, then re-run. The value is never displayed or stored by this script.'
  exit 1
}
Write-Host '[hypernexus] META_MUSE_API_KEY is set (value hidden). Starting OpenCode with meta/muse-spark-1.3-contributor ...'

$opencode = Get-Command opencode -ErrorAction SilentlyContinue
if (-not $opencode) { $opencode = 'C:\Users\hyper\AppData\Roaming\npm\opencode.ps1' }

if ($Prompt -and $Prompt.Count -gt 0) {
  & $opencode run --model 'meta/muse-spark-1.3-contributor' -- $Prompt
} else {
  $env:OPENCODE_MODEL = 'meta/muse-spark-1.3-contributor'
  & $opencode
}
