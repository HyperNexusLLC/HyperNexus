# use-meta-model.ps1 -- verify pi is pinned to Meta contributor model (dual-model).
# Pi owns its model config (settings.json); this script never edits it, only
# verifies the pin and shows the exact fix when drifted.
# META_MODEL env selects the expected pin: meta/muse-spark-1.3-contributor
# (default) or meta/muse-wonder-1.0-contributor (opt-in).
$settings = Join-Path $HOME ".pi\agent\settings.json"
$auth = Join-Path $HOME ".pi\agent\auth.json"
$fail = $false
# Dual-model: META_MODEL env selects expected pin (default spark, opt-in wonder).
$MetaWanted = if ($env:META_MODEL) { $env:META_MODEL.Replace('meta/','') } else { 'muse-spark-1.3-contributor' }
$Model = if ($MetaWanted -in 'muse-spark-1.3-contributor', 'muse-wonder-1.0-contributor') { $MetaWanted } else { 'muse-spark-1.3-contributor' }
if (-not (Test-Path $settings)) { Write-Error "missing $settings"; exit 1 }
$s = Get-Content $settings -Raw
if ($s -notmatch '"defaultProvider"\s*:\s*"meta"') {
  Write-Error 'settings.json: defaultProvider is not "meta" -- set "defaultProvider": "meta"'
  $fail = $true
}
$Actual = $null
if ($s -match '"defaultModel"\s*:\s*"([^"]+)"') { $Actual = $Matches[1] }
if ($Actual -notin 'muse-spark-1.3-contributor', 'muse-wonder-1.0-contributor') {
  Write-Error ("settings.json: defaultModel is not a Meta contributor model (found '" + $Actual + "', expected " + $Model + " per META_MODEL)")
  $fail = $true
} elseif ($Actual -ne $Model) {
  Write-Error ("settings.json: defaultModel is '" + $Actual + "' but META_MODEL expects '" + $Model + "' -- set defaultModel to '" + $Model + "' or unset META_MODEL")
  $fail = $true
}
if (-not (Test-Path $auth)) { Write-Error "missing $auth"; exit 1 }
$a = Get-Content $auth -Raw | ConvertFrom-Json
if (-not $a.meta.refresh) { Write-Error "auth.json: no meta.refresh -- run /login meta in pi"; $fail = $true }
if ($fail) { exit 1 }
Write-Host ("[hypernexus-pi] model pin OK: meta/" + $Model + " (pi owns OAuth refresh).")