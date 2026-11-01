# Sync Pi Meta OAuth -> Codewhale secret store (run after Pi token refresh)
# Idempotent: mints via the shared minter (reads meta.refresh -> POST
# api.meta.ai/muse-code/key, stdout=key only); logs to .hypernexus/meta-sync.log
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$minter = Join-Path $root 'addons\shared\bin\meta-muse-key.mjs'
$logPath = Join-Path $root '.hypernexus\meta-sync.log'
try {
  $key = (node $minter) | Out-String
  $key = $key.Trim()
  if (-not $key) { throw "Shared minter returned empty key (run /login meta in pi first)" }
  $key | codewhale auth set --provider meta --api-key-stdin 2>&1 | Out-String | Write-Host
  [Environment]::SetEnvironmentVariable('META_MUSE_API_KEY', $key, 'User')
  [Environment]::SetEnvironmentVariable('MODEL_API_KEY', $key, 'User')
  $env:META_MUSE_API_KEY = $key
  $env:MODEL_API_KEY = $key
  $msg = "[meta-sync] $(Get-Date -Format o) synced via shared minter (len $($key.Length))"
  Write-Host $msg
  Add-Content $logPath $msg -ErrorAction SilentlyContinue
} catch {
  $msg = "[meta-sync] $(Get-Date -Format o) FAILED: $_"
  Write-Host $msg -ForegroundColor Red
  Add-Content $logPath $msg -ErrorAction SilentlyContinue
  exit 1
}
