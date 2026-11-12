@echo off
powershell -Command "Get-MpPreference | Select-Object -ExpandProperty ExclusionPath" > C:\Users\hyper\workspace\HyperNexus\bin\defender-paths.txt 2>&1
powershell -Command "Get-MpPreference | Select-Object -ExpandProperty ExclusionProcess" > C:\Users\hyper\workspace\HyperNexus\bin\defender-procs.txt 2>&1
echo DONE > C:\Users\hyper\workspace\HyperNexus\bin\defender-verify-done.txt
