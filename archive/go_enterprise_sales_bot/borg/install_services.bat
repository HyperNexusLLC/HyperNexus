@echo off
cd /d "C:\Users\hyper\workspace\hypernexus"
echo ========================================
echo  HyperNexus Service Registration
echo  Run this as Administrator!
echo ========================================
echo.

echo Registering Go Sidecar (port 7778)...
sc create "HyperNexusSidecar" binPath="\"C:\Users\hyper\workspace\hypernexus\hypernexus.exe\" serve" start=auto displayname="HyperNexus Sidecar"
if %errorlevel%==0 (echo ✅) else (echo ⚠️ may already exist)
echo.

echo Registering Dashboard (port 7779)...
sc create "HyperNexusDashboard" binPath="\"C:\Program Files\nodejs\node.exe\" \"C:\Users\hyper\workspace\hypernexus\apps\web\node_modules\.bin\next.cmd\" dev -p 7779" start=auto displayname="HyperNexus Dashboard"
if %errorlevel%==0 (echo ✅) else (echo ⚠️ may already exist)
echo.

echo Registering Watchdog...
sc create "HyperNexusWatchdog" binPath="\"C:\Python314\pythonw.exe\" -u \"C:\Users\hyper\workspace\hypernexus\watchdog.py\"" start=auto displayname="HyperNexus Watchdog"
if %errorlevel%==0 (echo ✅) else (echo ⚠️ may already exist)
echo.

echo ========================================
echo  Done! Starting services...
echo ========================================
sc start HyperNexusSidecar
sc start HyperNexusDashboard
sc start HyperNexusWatchdog

echo.
echo Services registered and starting.
pause
