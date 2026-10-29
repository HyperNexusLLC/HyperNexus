@echo off
setlocal enabledelayedexpansion
:: Interrupt hook — pass-through, never block the interrupt.
set /p STDIN=
echo {"continue": true}
exit /b 0
