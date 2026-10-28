@echo off
REM hn-session.cmd — Crush SessionStart shim (routes to Git Bash; never blocks).
set "GBASH=C:\Program Files\Git\bin\bash.exe"
if exist "%GBASH%" (
  "%GBASH%" "%~dp0hn-session.sh"
  exit /b 0
)
echo {"hookSpecificOutput":{"additionalContext":"HyperNexus discipline: RECALL via hypernexus MCP search_memory, DISCOVER via mcp_list_tools, PERSIST via add_memory, VERIFY via system_status."}}
exit /b 0
