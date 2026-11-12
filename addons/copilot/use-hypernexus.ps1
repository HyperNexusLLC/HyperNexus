$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Copilot = Get-Command copilot -ErrorAction Stop
$Plugin = Join-Path $RepoRoot 'addons\copilot\plugin\hypernexus'

& $Copilot.Source --plugin-dir $Plugin @args --excluded-tools bash powershell
exit $LASTEXITCODE
