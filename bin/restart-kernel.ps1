$conn = Get-NetTCPConnection -LocalPort 7778 -State Listen -ErrorAction SilentlyContinue
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
$env:HYPERNEXUS_WORKSPACE_ROOT = 'C:\Users\hyper\workspace\HyperNexus'
Start-Process -FilePath 'C:\Users\hyper\workspace\HyperNexus\bin\hypernexus.exe' -ArgumentList 'serve' -WorkingDirectory 'C:\Users\hyper\workspace\HyperNexus' -WindowStyle Hidden
