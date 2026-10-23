Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*kernel-watchdog.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
Start-Process pwsh -ArgumentList '-NoProfile','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File','C:\Users\hyper\workspace\HyperNexus\scripts\kernel-watchdog.ps1' -WindowStyle Hidden
Start-Sleep -Seconds 3
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*kernel-watchdog.ps1*' } | Select-Object -First 1 ProcessId | Format-Table -AutoSize
