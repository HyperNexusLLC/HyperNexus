@echo off
REM hn-pre-tool.cmd — Crush PreToolUse gate shim (routes to Git Bash; never blocks).
REM Crush runs hook commands without a shell on Windows, so the .sh needs an
REM explicit interpreter. Fail-open: any error exits 0 (allows the tool call).
set "GBASH=C:\Program Files\Git\bin\bash.exe"
if exist "%GBASH%" (
  "%GBASH%" "%~dp0hn-pre-tool.sh"
  exit /b 0
)
echo {"decision":"allow"}
exit /b 0
