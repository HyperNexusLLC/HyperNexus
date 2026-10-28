# Sync Pi Meta OAuth -> Codewhale secret store (run after Pi token refresh)
# Idempotent: checks secret-store before writing; logs to .hypernexus/meta-sync.log
$ErrorActionPreference = 'Stop'
$piAuthPath = "$env:USERPROFILE\.pi\agent\auth.json"
$logPath = "$env:USERPROFILE\workspace\HyperNexus\.hypernexus\meta-sync.log"
try {
  $piAuth = Get-Content $piAuthPath -Raw | ConvertFrom-Json
  $token = $piAuth.meta.access
  if (-not $token) { throw "No meta access in Pi auth.json" }
  $sec = Get-Content "$env:USERPROFILE\.codewhale\secrets\secrets.json" -Raw | ConvertFrom-Json
  $existing = $sec.entries.meta
  if ($existing -eq $token) {
    $msg = "[meta-sync] $(Get-Date -Format o) already in sync (len $($token.Length), expires $($piAuth.meta.expires))"
    Write-Host $msg
    Add-Content $logPath $msg -ErrorAction SilentlyContinue
    exit 0
  }
  $token | codewhale auth set --provider meta --api-key-stdin 2>&1 | Out-String | Write-Host
  [Environment]::SetEnvironmentVariable('META_MUSE_API_KEY', $token, 'User')
  [Environment]::SetEnvironmentVariable('MODEL_API_KEY', $token, 'User')
  $env:META_MUSE_API_KEY = $token
  $env:MODEL_API_KEY = $token
  $msg = "[meta-sync] $(Get-Date -Format o) synced (len $($token.Length), expires $($piAuth.meta.expires))"
  Write-Host $msg
  Add-Content $logPath $msg -ErrorAction SilentlyContinue
} catch {
  $msg = "[meta-sync] $(Get-Date -Format o) FAILED: $_"
  Write-Host $msg -ForegroundColor Red
  Add-Content $logPath $msg -ErrorAction SilentlyContinue
  exit 1
}
