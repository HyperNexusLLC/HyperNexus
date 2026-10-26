@echo off
REM ============================================================
REM  LLM Priority Setup - Run as Administrator
REM  Sets all LLM inference processes to BelowNormal priority
REM  so they never cause audio stutter or system slowdown.
REM ============================================================
echo.
echo Setting LLM processes to BelowNormal priority...
echo.

REM Set priority for all LLM inference processes
for %%P in (llama-server.exe ollama.exe ollama-runner.exe LMS.exe lmstudio.exe) do (
    wmic process where "name='%%P'" call setpriority 16384 >nul 2>&1
    if not errorlevel 1 echo   %%P -^> BelowNormal
)

REM Also set Python and Node tool-call processes
for %%P in (python.exe node.exe) do (
    wmic process where "name='%%P'" call setpriority 16384 >nul 2>&1
)

echo.
echo Done. LLM processes will no longer starve audio playback.
echo.
echo TIP: Run this script again whenever you notice audio stutter.
echo      The kernel-watchdog will also enforce this automatically.
echo.
pause
