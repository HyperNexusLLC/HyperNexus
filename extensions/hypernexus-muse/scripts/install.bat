@echo off
REM HyperNexus Muse installer (Windows): prerequisite check only.
setlocal
where muse >nul 2>nul
if errorlevel 1 (
  echo muse CLI not found on PATH. Install Muse first.
  exit /b 1
)
if not exist "%~dp0..\..\bin\hypernexus.exe" (
  echo hypernexus kernel binary not found under bin\hypernexus.exe.
  exit /b 1
)
curl.exe -s -m 5 http://127.0.0.1:7778/health
echo.
echo Prerequisites OK.
exit /b 0
