$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$KernelUrl = 'http://127.0.0.1:7778'

$Copilot = Get-Command copilot -ErrorAction Stop
$Plugin = Join-Path $RepoRoot 'addons\copilot\plugin\hypernexus'
$ProviderVariables = @(
  'COPILOT_PROVIDER_TYPE',
  'COPILOT_PROVIDER_BASE_URL',
  'COPILOT_PROVIDER_WIRE_API',
  'COPILOT_PROVIDER_API_KEY',
  'COPILOT_PROVIDER_API_KEY_COMMAND',
  'COPILOT_PROVIDER_BEARER_TOKEN',
  'COPILOT_PROVIDER_MODEL_ID',
  'COPILOT_PROVIDER_WIRE_MODEL',
  'COPILOT_PROVIDER_MAX_PROMPT_TOKENS',
  'COPILOT_PROVIDER_MAX_OUTPUT_TOKENS',
  'COPILOT_MODEL'
)
$PreviousEnvironment = @{}
$ExitCode = 1
foreach ($Name in $ProviderVariables) {
  $PreviousEnvironment[$Name] = [Environment]::GetEnvironmentVariable($Name, 'Process')
}

try {
  $env:COPILOT_PROVIDER_TYPE = 'openai'
  $env:COPILOT_PROVIDER_BASE_URL = "$KernelUrl/v1"
  $env:COPILOT_PROVIDER_WIRE_API = 'responses'
  $env:COPILOT_PROVIDER_API_KEY = 'hypernexus-local'
  Remove-Item Env:COPILOT_PROVIDER_API_KEY_COMMAND -ErrorAction SilentlyContinue
  Remove-Item Env:COPILOT_PROVIDER_BEARER_TOKEN -ErrorAction SilentlyContinue
  $env:COPILOT_PROVIDER_MODEL_ID = 'meta/muse-spark-1.3-contributor'
  $env:COPILOT_PROVIDER_WIRE_MODEL = 'muse-spark-1.3-contributor'
  $env:COPILOT_PROVIDER_MAX_PROMPT_TOKENS = '1048576'
  $env:COPILOT_PROVIDER_MAX_OUTPUT_TOKENS = '131072'
  $env:COPILOT_MODEL = 'meta/muse-spark-1.3-contributor'

  & $Copilot.Source --plugin-dir $Plugin @args
  $ExitCode = $LASTEXITCODE
} finally {
  foreach ($Name in $ProviderVariables) {
    $Value = $PreviousEnvironment[$Name]
    if ($null -eq $Value) {
      Remove-Item "Env:$Name" -ErrorAction SilentlyContinue
    } else {
      [Environment]::SetEnvironmentVariable($Name, $Value, 'Process')
    }
  }
}

exit $ExitCode
