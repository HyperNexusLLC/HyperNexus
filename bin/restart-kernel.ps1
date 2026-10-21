# Graceful HyperNexus kernel restart — stops via /api/shutdown so the tray icon
# is removed (no Windows ghost icon). Force-kill only as a last resort.
$ErrorActionPreference = "SilentlyContinue"
$Port = 7778
$Kernel = 'C:\Users\hyper\workspace\HyperNexus\bin\hypernexus.exe'
$env:HYPERNEXUS_WORKSPACE_ROOT = 'C:\Users\hyper\workspace\HyperNexus'

# 1) Graceful shutdown (removes tray icon via systray NIM_DELETE)
try {
    Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/shutdown" -Method POST -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {}

# 2) Wait for the port to free (graceful exit)
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    $listening = netstat -ano | Select-String ":$Port .*LISTENING"
    if (-not $listening) { break }
}

# 3) Force-kill only if still bound (last resort — may leave a ghost)
$still = netstat -ano | Select-String ":$Port .*LISTENING"
if ($still) {
    $pidToKill = ($still -split '\s+')[-1]
    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# 4) Start the (new) kernel
Start-Process -FilePath $Kernel -ArgumentList 'serve' -WorkingDirectory 'C:\Users\hyper\workspace\HyperNexus' -WindowStyle Hidden
Start-Sleep -Seconds 1
Write-Output "kernel restarted"
