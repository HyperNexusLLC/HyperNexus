@echo off
REM HyperNexus maki installer (Windows): prerequisite check only.
REM Installs nothing by itself; copy the extension trees per README.md,
REM then /trust the project and /reload in maki.
setlocal
where maki >nul 2>nul
if errorlevel 1 (
  echo maki CLI not found on PATH. Install maki first.
  exit /b 1
)
if not exist "%~dp0..\..\bin\hypernexus.exe" (
  echo hypernexus kernel binary not found under bin\hypernexus.exe.
  exit /b 1
)
curl.exe -s -m 5 http://127.0.0.1:7778/health
echo.
echo Prerequisites OK. Copy per README.md, then /trust and /reload in maki.
