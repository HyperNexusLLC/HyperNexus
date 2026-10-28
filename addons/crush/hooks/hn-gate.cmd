@echo off
REM hn-gate.cmd — HyperNexus PreToolUse gate for Crush (pure-cmd, zero stdin/sh deps).
REM Exit 0 allow (+ optional JSON); exit 2 + stderr denies. Reads ONLY env vars
REM (CRUSH_TOOL_NAME, CRUSH_TOOL_INPUT_COMMAND) per the hooks spec — never touches
REM stdin, never shells to bash. Fail-open: any internal error exits 0.
setlocal
set "TOOL=%CRUSH_TOOL_NAME%"
set "CMD_TXT=%CRUSH_TOOL_INPUT_COMMAND%"
if "%TOOL%"=="" goto :allow
if /I not "%TOOL%"=="bash" if /I not "%TOOL%"=="run_shell_command" goto :allow
echo %CMD_TXT% | findstr /R /I /C:"rm  *-rf  */" /C:"rm  *-rf  *~" /C:"mkfs" >nul 2>&1
if %ERRORLEVEL%==0 (
  echo blocked: destructive shell pattern denied by hypernexus-gate 1>&2
  exit /b 2
)
:allow
echo {"decision":"allow"}
exit /b 0
