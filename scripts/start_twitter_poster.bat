@echo off
echo ========================================
echo  HyperNexus Twitter CDP Auto-Poster
echo ========================================
echo.
echo Step 1: Close ALL Edge windows first!
echo Step 2: Press any key to launch Edge with CDP enabled
echo.
pause

:: Kill any existing Edge processes
taskkill /F /IM msedge.exe 2>nul
timeout /t 2 >nul

:: Launch Edge with CDP enabled
echo Starting Edge with CDP...
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
  --remote-debugging-port=9222 ^
  --remote-allow-origins=* ^
  --user-data-dir="%USERPROFILE%\edge-cdp-profile" ^
  https://twitter.com

echo.
echo Waiting for Edge to start...
timeout /t 5 >nul

echo.
echo Step 3: Log into Twitter/X in the Edge window that opened
echo Step 4: Once logged in, press any key to start the auto-poster
echo.
pause

:: Run the Python script
echo Starting auto-poster...
python "%~dp0twitter_cdp_poster.py"

pause
