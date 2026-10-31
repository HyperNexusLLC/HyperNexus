# Codex CLI: ensure meta/muse-spark-1.3-contributor wiring.
# Best-effort mints MODEL_API_KEY LIVE from pi auth.json (pi owns refresh)
# into the process environment only — never written to config files. Without a
# pi login the mint warns and install/check still run (MCP + skills only).
$minter = Join-Path $PSScriptRoot 'bin\meta-muse-key.mjs'
if ([string]::IsNullOrEmpty($env:MODEL_API_KEY) -and (Test-Path $minter)) {
  try {
    $minted = & node $minter 2>$null
    if (($LASTEXITCODE -eq 0) -and (-not [string]::IsNullOrEmpty($minted))) {
      $env:MODEL_API_KEY = $minted
      Remove-Variable -Name minted -ErrorAction SilentlyContinue
      Write-Host '[hypernexus-codex-cli] minted MODEL_API_KEY from pi OAuth (value hidden).'
    } else {
      Write-Warning '[hypernexus-codex-cli] live mint unavailable (pi login?). Continuing without MODEL_API_KEY.'
    }
  } catch {
    Write-Warning '[hypernexus-codex-cli] live mint failed. Continuing without MODEL_API_KEY.'
  }
}
node "$PSScriptRoot\install.mjs"
node "$PSScriptRoot\install.mjs" --check
