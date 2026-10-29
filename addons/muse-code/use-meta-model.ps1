# Muse Code: ensure meta/muse-spark-1.3-contributor wiring (token minted LIVE from pi auth.json; pi owns refresh).
node "$PSScriptRoot\install.mjs"
node "$PSScriptRoot\install.mjs" --check
# Mint a live Meta key into this shell only (never stored; dies in ~24h):
$env:META_API_KEY = node "$PSScriptRoot\bin\meta-muse-key.mjs"
if ($env:META_API_KEY) { Write-Output "META_API_KEY live for this shell (pi owns refresh; /login meta in pi when it expires)." }
