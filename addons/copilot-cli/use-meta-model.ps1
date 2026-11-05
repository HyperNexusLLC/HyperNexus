# Copilot CLI: ensure meta model wiring (dual-model: spark default, wonder opt-in).
# Best-effort mints META_API_KEY LIVE from pi auth.json (pi owns refresh)
# into the process environment only — never written to config files. Without a
# pi login the mint warns and install/check still run (MCP + skills only).
# META_MODEL env selects the intended Meta model: meta/muse-spark-1.3-contributor
# (default) or meta/muse-wonder-1.0-contributor (opt-in). The minted key is
# model-agnostic; META_MODEL declares session intent for downstream consumers.
$MetaWanted = if ($env:META_MODEL) { $env:META_MODEL.Replace('meta/','') } else { 'muse-spark-1.3-contributor' }
$Model = if ($MetaWanted -in 'muse-spark-1.3-contributor', 'muse-wonder-1.0-contributor') { $MetaWanted } else { 'muse-spark-1.3-contributor' }
$env:META_MODEL = $Model
$minter = Join-Path $PSScriptRoot 'bin\meta-muse-key.mjs'
if ([string]::IsNullOrEmpty($env:META_API_KEY) -and (Test-Path $minter)) {
  try {
    $minted = & node $minter 2>$null
    if (($LASTEXITCODE -eq 0) -and (-not [string]::IsNullOrEmpty($minted))) {
      $env:META_API_KEY = $minted
      Remove-Variable -Name minted -ErrorAction SilentlyContinue
      Write-Host '[hypernexus-copilot-cli] minted META_API_KEY from pi OAuth (value hidden).'
    } else {
      Write-Warning '[hypernexus-copilot-cli] live mint unavailable (pi login?). Continuing without META_API_KEY.'
    }
  } catch {
    Write-Warning '[hypernexus-copilot-cli] live mint failed. Continuing without META_API_KEY.'
  }
}
Write-Host ('[hypernexus-copilot-cli] Meta model intent: meta/' + $Model + ' (per META_MODEL).')
node "$PSScriptRoot\install.mjs"
node "$PSScriptRoot\install.mjs" --check