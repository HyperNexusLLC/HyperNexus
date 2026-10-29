@echo off
setlocal enabledelayedexpansion
:: HyperNexus Codex installer — registers MCP stdio server, installs the
:: plugin hooks/skill, and verifies with `codex mcp list` / `codex mcp get`.
:: Port 7778 is authoritative; 8080 is stale and unused.

:: Repo root = two levels above this script (extensions\codex-hypernexus\scripts)
set "PLUGIN_DIR=%~dp0.."
for %%I in ("%PLUGIN_DIR%") do set "PLUGIN_DIR=%%~fI"
for %%I in ("%PLUGIN_DIR%\..\..") do set "ROOT=%%~fI"
set "EXE=%ROOT%\bin\hypernexus.exe"

if not exist "%EXE%" (
  echo ERROR: hypernexus binary not found at "%EXE%"
  echo Build the Go kernel first, then re-run this installer.
  exit /b 1
)

where codex >nul 2>nul
if %errorlevel% neq 0 (
  echo ERROR: `codex` CLI not found on PATH. Install Codex CLI first.
  exit /b 1
)

echo === 1/4: Register HyperNexus MCP server (stdio) ===
codex mcp add hypernexus --env HYPERNEXUS_WORKSPACE_ROOT="%ROOT%" --env HYPERNEXUS_URL="http://127.0.0.1:7778" -- "%EXE%" mcp
if !errorlevel! neq 0 echo (MCP entry may already exist — continuing)

echo.
echo === 2/4: Install skills (hypernexus, hypernexus-ops, hypernexus-workflows) ===
for %%S in (hypernexus hypernexus-ops hypernexus-workflows) do (
  if not exist "%USERPROFILE%\.codex\skills\%%S" mkdir "%USERPROFILE%\.codex\skills\%%S"
  xcopy /E /I /Y "%PLUGIN_DIR%\skills\%%S" "%USERPROFILE%\.codex\skills\%%S\" >nul
  if !errorlevel! neq 0 (
    echo ERROR: skill copy failed for %%S.
    exit /b 1
  )
)
echo Skills installed to %%USERPROFILE%%\.codex\skills\hypernexus*\

echo.
echo === 3/4: Install plugin (hooks) ===
for %%I in ("%PLUGIN_DIR%\..\..\.codex\marketplace\plugins") do set "MKT=%%~fI"
if not exist "%MKT%\codex-hypernexus" mkdir "%MKT%\codex-hypernexus"
xcopy /E /I /Y "%PLUGIN_DIR%" "%MKT%\codex-hypernexus\" >nul
codex plugin marketplace add "%MKT%\.." >nul 2>nul
codex plugin add codex-hypernexus@hypernexus-marketplace >nul 2>nul
echo Plugin staged at %MKT%\codex-hypernexus

echo.
echo === 4/4: Verify ===
codex mcp list
codex mcp get hypernexus
echo.
echo Done. In Codex, run /mcp — hypernexus tools should be listed.
exit /b 0
