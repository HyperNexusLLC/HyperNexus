# mini-swe-agent: ensure meta/muse-spark-1.3-contributor wiring (MINTER PATTERN).
# Mints a FRESH Meta Model API key on every run from pi's auth.json identity
# (pi owns OAuth refresh), refreshes the dotenv snapshot install.mjs manages
# (dotenv cannot reference env vars), then verifies. Never stores the key
# anywhere else; minted keys die in ~24h, so re-run before long sessions.
$ErrorActionPreference = 'Stop'
$Minter = Join-Path $PSScriptRoot 'bin\meta-muse-key.mjs'

Write-Host '[hypernexus] minting fresh Meta Model API key (live, ~24h, value hidden) ...'
& node $Minter --check 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Error 'Meta key mint failed. Run /login meta in pi first (identity tokens are not renewable; pi owns refresh), then re-run this script.'
  exit 1
}

node "$PSScriptRoot\install.mjs"
if ($LASTEXITCODE -ne 0) {
  Write-Error 'install.mjs failed; .env snapshot was not refreshed.'
  exit 1
}
node "$PSScriptRoot\install.mjs" --check
# Key dies with the .env snapshot's ~24h TTL. Next run mints fresh again.
