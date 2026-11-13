@echo off
echo Pushing all changes to GitLab...
echo.

REM Stage changes safely (unstage live kernel DB churn, >100MB DBs, secrets, and Windows NUL)
git add -A
git reset HEAD -- catalog.db hypernexus.db .tormentnexus/skills.db data/tormentnexus.db data/provider_metrics.db data/provider_metrics.db.local-backup go/NUL >nul 2>nul

REM Commit with descriptive message (uses latest if uncommitted)
git diff --cached --quiet || git commit -m "chore: sync workspace and push to GitLab"

REM Push to GitLab remote on main branch
git push gitlab main

echo.
echo Done!
pause
