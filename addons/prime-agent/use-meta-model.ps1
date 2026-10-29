# use-meta-model.ps1 — launch Prime Agent on Meta muse-spark-1.3-contributor.
# USER-RUN ONLY. This script never reads auth.json / token files and never
# prints the key. It only presence-checks the VARIABLE NAME, then launches.
#
#   1. $env:MODEL_API_KEY = '<paste-your-token-here>'  # you set this
#   2. .\use-meta-model.ps1 "your prompt here"          # one-shot via -p
#   3. .\use-meta-model.ps1                             # interactive TUI
#   # optional persistent wiring: merge the "meta" block from
#   # meta-model.prime.json into ~/.prime/agent/models.json under "providers",
#   # then: prime-agent --provider meta --model muse-spark-1.3-contributor
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Prompt)

if ([string]::IsNullOrEmpty($env:MODEL_API_KEY)) {
  Write-Error 'MODEL_API_KEY is not set. Set the variable in this shell first, then re-run. The value is never displayed or stored by this script.'
  exit 1
}
Write-Host '[hypernexus] MODEL_API_KEY is set (value hidden). Starting prime-agent with meta/muse-spark-1.3-contributor ...'

$cli = Get-Command prime-agent -ErrorAction SilentlyContinue
$bin = if ($cli) { 'prime-agent' } else { Join-Path $HOME '.local\bin\prime-agent.cmd' }

if ($Prompt -and $Prompt.Count -gt 0) {
  & $bin --provider meta --model 'muse-spark-1.3-contributor' -p -- $Prompt
} else {
  & $bin --provider meta --model 'muse-spark-1.3-contributor'
}
