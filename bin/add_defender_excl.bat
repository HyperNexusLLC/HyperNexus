@echo off
powershell -Command "Add-MpPreference -ExclusionPath 'C:\Users\hyper\workspace\HyperNexus'"
powershell -Command "Add-MpPreference -ExclusionPath 'C:\Users\hyper\.hypernexus'"
powershell -Command "Add-MpPreference -ExclusionProcess 'hypernexus.exe'"
powershell -Command "Add-MpPreference -ExclusionProcess 'mimo.exe'"
powershell -Command "Add-MpPreference -ExclusionProcess 'ffmpeg.exe'"
echo DONE > C:\Users\hyper\workspace\HyperNexus\bin\defender-excl-done.txt
