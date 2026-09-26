@echo off
echo ========================================
echo HyperNexus Outreach Automation
echo ========================================
echo.

cd /d "%~dp0"

echo Running outreach automation...
python outreach_automation.py

pause
