# use-meta-model.ps1 -- launch Codex on Meta muse-spark-1.3-contributor.
# USER-RUN ONLY. This script never reads auth.json / token files and never
# prints the key. It only presence-checks the VARIABLE NAME, then launches.
#
#   1. $env:MODEL_API_KEY = 'paste-your-token-here'  # you set this (mint via bin/meta-muse-key.mjs)
#   2. .\use-meta-model.ps1 'your prompt here'             # or no args for the TUI
#
# Meta subscription keys are attested DENIED (403 client_attestation_denied)
# when the request carries shell-named tools, so codex's shell surfaces are
# disabled here (verified against `codex features list`). Shell-equivalent
# work goes through the hypernexus MCP tools instead (wired in config.toml).
param([Parameter(ValueRemainingArguments = $true)][string[]]$Prompt)
if ([string]::IsNullOrEmpty($env:MODEL_API_KEY)) {
  Write-Error 'MODEL_API_KEY is not set. Mint one with: node addons/codex/bin/meta-muse-key.mjs  (pi owns OAuth refresh), set the variable in this shell first, then re-run. The value is never displayed or stored by this script.'
  exit
}
Write-Host '[hypernexus] MODEL_API_KEY is set (value hidden). Starting codex with meta/muse-spark-1.3-contributor ...'
$codex = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codex) { Write-Error 'codex CLI not found on PATH. Install Codex CLI first, then re-run.'; exit 1 }
$DisableFeatures = @('--disable', 'shell_tool', '--disable', 'unified_exec', '--disable', 'goals')
if ($Prompt -and $Prompt.Count -gt 0) {
  & $codex @DisableFeatures $Prompt
} else {
  & $codex @DisableFeatures
}
