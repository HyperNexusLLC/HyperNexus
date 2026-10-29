$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if ([string]::IsNullOrWhiteSpace($env:COPILOT_PROVIDER_API_KEY) -and
    [string]::IsNullOrWhiteSpace($env:COPILOT_PROVIDER_BEARER_TOKEN)) {
  [Console]::Error.WriteLine("Meta OAuth subscription keys are restricted to Muse Code requests and cannot authorize Copilot's tool declarations (HTTP 403). Set COPILOT_PROVIDER_API_KEY to a Meta pay-as-you-go key to use this launcher.")
  exit 2
}

$env:COPILOT_PROVIDER_TYPE = 'openai'
$env:COPILOT_PROVIDER_BASE_URL = 'https://api.meta.ai/v1'
$env:COPILOT_PROVIDER_WIRE_API = 'responses'
Remove-Item Env:COPILOT_PROVIDER_API_KEY_COMMAND -ErrorAction SilentlyContinue
$env:COPILOT_PROVIDER_MODEL_ID = 'meta/muse-spark-1.3-contributor'
$env:COPILOT_PROVIDER_WIRE_MODEL = 'muse-spark-1.3-contributor'
$env:COPILOT_PROVIDER_MAX_PROMPT_TOKENS = '1048576'
$env:COPILOT_PROVIDER_MAX_OUTPUT_TOKENS = '131072'
$env:COPILOT_MODEL = 'meta/muse-spark-1.3-contributor'

$Copilot = Get-Command copilot -ErrorAction Stop
$Plugin = Join-Path $RepoRoot 'addons\copilot\plugin\hypernexus'
& $Copilot.Source --plugin-dir $Plugin @args
exit $LASTEXITCODE
