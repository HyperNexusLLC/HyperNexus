# Start serve with captured stdout/stderr to diagnose the crash.
$ErrorActionPreference = "Continue"
$bin = "C:\Users\hyper\workspace\HyperNexus\bin"
$root = "C:\Users\hyper\workspace\HyperNexus"
$lock = "C:\Users\hyper\.hypernexus\lock"

Write-Output "=== existing hypernexus processes ==="
Get-CimInstance Win32_Process -Filter "Name='hypernexus.exe'" | ForEach-Object { "PID $($_.ProcessId): [$($_.CommandLine)]" }

Write-Output "=== clear orphan lock ==="
if (Test-Path $lock) {
  try {
    $lp = (Get-Content $lock -Raw | ConvertFrom-Json).pid
    $listening = $false
    try {
      $c = Get-NetTCPConnection -LocalPort 7778 -State Listen -ErrorAction SilentlyContinue
      if ($c) { $listening = $true }
    } catch {}
    if (-not $listening) {
      Remove-Item $lock -Force
      Write-Output "cleared orphan lock (pid $lp)"
    } else { Write-Output "port listening - lock kept" }
  } catch { Write-Output "lock: $($_.Exception.Message)" }
}

Write-Output "=== start serve with log capture ==="
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "$bin\hypernexus.exe"
$psi.Arguments = "serve"
$psi.WorkingDirectory = $root
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true
$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $psi
$outFile = "$bin\serve-diag-out.log"
$errFile = "$bin\serve-diag-err.log"
$proc.Start() | Out-Null
$procId = $proc.Id
Write-Output "started PID $procId"

# Drain output async to files
$outJob = Register-ObjectEvent -InputObject $proc -EventName OutputDataReceived -Action {
  if ($EventArgs.Data) { [System.IO.File]::AppendAllText("C:\Users\hyper\workspace\HyperNexus\bin\serve-diag-out.log", $EventArgs.Data + "`n") }
}
$errJob = Register-ObjectEvent -InputObject $proc -EventName ErrorDataReceived -Action {
  if ($EventArgs.Data) { [System.IO.File]::AppendAllText("C:\Users\hyper\workspace\HyperNexus\bin\serve-diag-err.log", $EventArgs.Data + "`n") }
}
$proc.BeginOutputReadLine()
$proc.BeginErrorReadLine()

Start-Sleep -Seconds 15
Write-Output "=== after 15s: exited=$($proc.HasExited) code=$(if ($proc.HasExited) { $proc.ExitCode } else { 'n/a' }) ==="
try {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:7778/health" -Method Get -TimeoutSec 5
  Write-Output "HEALTH: $($h | ConvertTo-Json -Compress)"
} catch { Write-Output "health ERR: $($_.Exception.Message)" }

Write-Output "=== stdout log ==="
if (Test-Path $outFile) { Get-Content $outFile | Select-Object -Last 30 } else { "(none)" }
Write-Output "=== stderr log ==="
if (Test-Path $errFile) { Get-Content $errFile | Select-Object -Last 30 } else { "(none)" }
