# Sync Pi Meta OAuth -> Reasonix .env (run after Pi token refresh)
# Idempotent: checks the live access token presence in pi auth.json, then
# refreshes the User-level META_MUSE_API_KEY the reasonix global config points
# at via api_key_env. This script handles the TOKEN VALUE (unlike
# use-meta-model.ps1, which never touches values) — run it in your own shell.
# Logs to .hypernexus/meta-sync-reasonix.log
$ErrorActionPreference = 'Stop'
$piAuthPath = "$env:USERPROFILE\.pi\agent\auth.json"
$reasonixEnv = "$env:APPDATA\reasonix\.env"
$logPath = "$env:USERPROFILE\workspace\HyperNexus\.hypernexus\meta-sync-reasonix.log"
try {
  $piAuth = Get-Content $piAuthPath -Raw | ConvertFrom-Json
  $token = $piAuth.meta.access
  if (-not $token) { throw "No meta access in Pi auth.json" }
  # Reasonix global .env is KEY=VALUE lines; api_key_env = META_MUSE_API_KEY.
  $lines = @()
  if (Test-Path $reasonixEnv) { $lines = @(Get-Content $reasonixEnv -Raw -ErrorAction SilentlyContinue -Encoding UTF8 | ForEach-Object { $_ -split "`r?`n" }) }
  $found = $false
  $lines = @($lines | ForEach-Object {
    if ($_ -match '^META_MUSE_API_KEY=') { $found = $true; "META_MUSE_API_KEY=$token" } else { $_ }
  } | Where-Object { $_ -ne $null -and $_ -ne '' })
  if (-not $found) { $lines += "META_MUSE_API_KEY=$token" }
  [IO.File]::WriteAllLines($reasonixEnv, $lines, [Text.UTF8Encoding]::new($false))
  [Environment]::SetEnvironmentVariable('META_MUSE_API_KEY', $token, 'User')
  $env:META_MUSE_API_KEY = $token
  $msg = "[meta-sync-reasonix] $(Get-Date -Format o) synced (len $($token.Length), expires $($piAuth.meta.expires))"
  Write-Host $msg
  Add-Content $logPath $msg -ErrorAction SilentlyContinue
} catch {
  $msg = "[meta-sync-reasonix] $(Get-Date -Format o) FAILED: $_"
  Write-Host $msg -ForegroundColor Red
  Add-Content $logPath $msg -ErrorAction SilentlyContinue
  exit 1
}
