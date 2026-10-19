# End-to-end proof: model calls HyperNexus plugin tools and they execute against the kernel.
# Captures BOTH the tool call (stderr) and the tool result (stdout answer).
$ErrorActionPreference = 'Continue'
Remove-Item Env:\MIMOCODE_CONFIG_DIR -ErrorAction SilentlyContinue

$mimo  = 'C:\Users\hyper\.mimocode\bin\mimo.exe'
$kn    = 'http://127.0.0.1:7778'
$out   = Join-Path $PSScriptRoot 'e2e2'
$errF  = "$out.err"
$outF  = "$out.out"
Remove-Item $errF,$outF -Force -ErrorAction SilentlyContinue

Write-Output '=== A) kernel baseline ==='
try {
  $h = Invoke-WebRequest -Uri "$kn/health" -UseBasicParsing -TimeoutSec 5
  Write-Output ("GET /health -> {0} : {1}" -f $h.StatusCode, $h.Content)
} catch { Write-Output ("GET /health FAILED: {0}" -f $_.Exception.Message) }
try {
  $s = Invoke-WebRequest -Uri "$kn/api/tools/search?query=file&limit=3" -UseBasicParsing -TimeoutSec 8
  $sj = $s.Content | ConvertFrom-Json
  $n = 0; if ($sj.data) { $n = @($sj.data).Count }
  Write-Output ("GET /api/tools/search?query=file -> {0} : dataCount={1}" -f $s.StatusCode, $n)
} catch { Write-Output ("GET /api/tools/search FAILED: {0}" -f $_.Exception.Message) }

Write-Output '=== B) mimo run: call hypernexus_search_tools and return raw result ==='
$prompt = 'Use the hypernexus_search_tools tool with query "file". Return ONLY the raw JSON string the tool returns, nothing else.'
$args = @('run', $prompt)
$p = Start-Process -FilePath $mimo -ArgumentList $args -NoNewWindow -PassThru -RedirectStandardError $errF -RedirectStandardOutput $outF
for ($i = 0; $i -lt 130; $i++) {
  if ($p.HasExited) { break }
  Start-Sleep -Seconds 1
}
if (-not $p.HasExited) { try { $p.Kill() } catch {}; Write-Output ("[e2e] KILLED at {0}s (still running)" -f $i) }
else { Write-Output ("[e2e] completed after {0}s" -f $i) }
Start-Sleep -Seconds 1

Write-Output '=== C) tool CALLS observed (stderr) ==='
if (Test-Path $errF) {
  Get-Content $errF | Select-String -Pattern 'hypernexus' | ForEach-Object { $_.Line }
} else { Write-Output '(no stderr file)' }

Write-Output '=== D) tool RESULT / answer (stdout) ==='
if (Test-Path $outF) {
  $raw = Get-Content $outF -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) { Write-Output '(stdout empty)' }
  else { Write-Output $raw }
} else { Write-Output '(no stdout file)' }
Write-Output '=== DONE ==='
