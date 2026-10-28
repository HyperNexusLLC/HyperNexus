@echo off
REM hn-rbac.cmd — HyperNexus RBAC guard for Crush (deny-list for destructive patterns).
REM Wire as a SECOND PreToolUse hook AFTER hn-pre-tool.cmd (config order = first
REM deny decides). Exit 2 blocks (stderr = reason); exit 0 allows. Fail-open on
REM any internal error: a broken guard must never brick sessions.
REM Input: Crush sets CRUSH_TOOL_NAME + CRUSH_TOOL_INPUT_COMMAND in the env
REM (per the hooks spec) — this shim reads the env only, never parses stdin.
setlocal
set "TOOL=%CRUSH_TOOL_NAME%"
set "CMD_TXT=%CRUSH_TOOL_INPUT_COMMAND%"
if "%TOOL%"=="" goto :allow
if /I not "%TOOL%"=="bash" if /I not "%TOOL%"=="run_shell_command" goto :allow
echo %CMD_TXT% | findstr /R /I /C:"rm  *-rf" /C:"rm  *-fr" /C:"mkfs" /C:"format  *[A-Za-z]:" >nul 2>&1
if %ERRORLEVEL%==0 (
  echo blocked by hypernexus-rbac: destructive shell pattern denied 1>&2
  exit /b 2
)
:allow
echo {"decision":"allow"}
exit /b 0
