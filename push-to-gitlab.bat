@echo off
echo Pushing all changes to GitLab...
echo.

REM Stage all changes
git add -A

REM Commit with descriptive message (uses latest if uncommitted)
git diff --cached --quiet || git commit -m "chore: sync workspace and push to GitLab"

REM Push to GitLab remote on clean-main branch
git push gitlab clean-main

echo.
echo Done!
pause
