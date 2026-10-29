# use-meta-model.ps1 — launch Codewhale on Meta muse-spark-1.3-contributor.
# KERNEL-PROXY PATTERN (no snapshot key — nothing is pasted or stored).
#
# Codewhale cannot read pi's auth.json natively (external-consent reports
# "meta has no supported external CLI credential source"), so the native path
# is the HyperNexus kernel proxy: providers.meta.base_url =
# http://127.0.0.1:7778/v1, which re-reads pi's OAuth token per request.
# This launcher (1) ensures the proxy route is set, (2) refreshes the
# secret-store fast-lane key via scripts/sync-meta-oauth-codewhale.ps1, then
# (3) launches Codewhale on meta/muse-spark-1.3-contributor.
#
#   .\addons\codewhale\use-meta-model.ps1 "your prompt here"   # or no args for TUI
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Prompt)

$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$kernel = Join-Path $root 'bin\hypernexus.exe'

# 1. Kernel must be up — it owns the proxy route.
try {
  $h = Invoke-RestMethod -Uri 'http://127.0.0.1:7778/health' -TimeoutSec 5
  Write-Host "[hypernexus] kernel OK (v$($h.version))."
} catch {
  Write-Host '[hypernexus] starting kernel...'
  Start-Process -FilePath $kernel -ArgumentList 'serve' -WindowStyle Hidden
  $ok = $false
  for ($i = 0; $i -lt 30 -and -not $ok; $i++) {
    Start-Sleep -Seconds 1
    try { $null = Invoke-RestMethod -Uri 'http://127.0.0.1:7778/health' -TimeoutSec 3; $ok = $true } catch {}
  }
  if (-not $ok) { Write-Error 'Kernel did not become ready. Start it with: bin\hypernexus.exe serve'; exit 1 }
}

# 2. Refresh the secret-store fast-lane key (idempotent; no-op when in sync).
& (Join-Path $root 'scripts\sync-meta-oauth-codewhale.ps1') 2>&1 | ForEach-Object { Write-Host $_ }

# 3. Launch Codewhale on the subscriber model (proxy route from config.toml).
Write-Host '[hypernexus] launching codewhale on meta/muse-spark-1.3-contributor ...'
if ($Prompt -and $Prompt.Count -gt 0) {
  & codewhale --provider meta --model muse-spark-1.3-contributor -- $Prompt
} else {
  & codewhale --provider meta --model muse-spark-1.3-contributor
}
