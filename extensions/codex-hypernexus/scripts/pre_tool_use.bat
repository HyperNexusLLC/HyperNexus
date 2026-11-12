@echo off
setlocal enabledelayedexpansion
:: PreToolUse hook — pass-through guard. Reads JSON from stdin, allows the call.
set /p STDIN=
if "!STDIN!"=="" exit /b 0
echo {"continue": true}
exit /b 0
