# use-meta-model.ps1 — verify pi is pinned to Meta muse-spark-1.3-contributor.
# Pi owns its model config (settings.json); this script never edits it, only
# verifies the pin and shows the exact fix when drifted.
$settings = Join-Path $HOME ".pi\agent\settings.json"
$auth = Join-Path $HOME ".pi\agent\auth.json"
$fail = $false
if (-not (Test-Path $settings)) { Write-Error "missing $settings"; exit 1 }
$s = Get-Content $settings -Raw
if ($s -notmatch '"defaultProvider"\s*:\s*"meta"') {
  Write-Error 'settings.json: defaultProvider is not "meta" — set "defaultProvider": "meta"'
  $fail = $true
}
if ($s -notmatch '"defaultModel"\s*:\s*"muse-spark-1\.3-contributor"') {
  Write-Error 'settings.json: defaultModel is not "muse-spark-1.3-contributor"'
  $fail = $true
}
if (-not (Test-Path $auth)) { Write-Error "missing $auth"; exit 1 }
$a = Get-Content $auth -Raw | ConvertFrom-Json
if (-not $a.meta.refresh) { Write-Error "auth.json: no meta.refresh — run /login meta in pi"; $fail = $true }
if ($fail) { exit 1 }
Write-Host "[hypernexus-pi] model pin OK: meta/muse-spark-1.3-contributor (pi owns OAuth refresh)."
