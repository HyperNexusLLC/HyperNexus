# harness2 (google-research): ensure meta/muse-spark-1.3-contributor wiring.
# Best-effort mints META_API_KEY LIVE from pi auth.json (pi owns refresh)
# into the process environment only — never written to config files or setx.
# Without a pi login the mint warns and install/check still run (model env only).
$minter = Join-Path $PSScriptRoot 'bin\meta-muse-key.mjs'
if ([string]::IsNullOrEmpty($env:META_API_KEY) -and (Test-Path $minter)) {
  try {
    $minted = & node $minter 2>$null
    if (($LASTEXITCODE -eq 0) -and (-not [string]::IsNullOrEmpty($minted))) {
      $env:META_API_KEY = $minted
      $env:HARNESS2_JUDGE_API_KEY = $minted
      Remove-Variable -Name minted -ErrorAction SilentlyContinue
      Write-Host '[hypernexus-harness2] minted META_API_KEY from pi OAuth (value hidden).'
    } else {
      Write-Warning '[hypernexus-harness2] live mint unavailable (pi login?). Continuing without META_API_KEY.'
    }
  } catch {
    Write-Warning '[hypernexus-harness2] live mint failed. Continuing without META_API_KEY.'
  }
}
node "$PSScriptRoot\install.mjs"
node "$PSScriptRoot\install.mjs" --check
