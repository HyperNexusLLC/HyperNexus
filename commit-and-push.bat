@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Git Commit and Push to GitLab
echo ========================================
echo.

REM Check if git is available
where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git is not installed or not in PATH
    pause
    exit /b 1
)

REM Show current status
echo Current git status:
echo ----------------------------------------
git status --short
echo ----------------------------------------
echo.

REM Stage all changes (excluding live runtime SQLite churn, >100MB DBs, secrets, and Windows device names)
echo Staging changes safely...
git add -A
if errorlevel 1 (
    echo [ERROR] Failed to stage changes
    pause
    exit /b 1
)
git reset HEAD -- catalog.db hypernexus.db .tormentnexus/skills.db data/tormentnexus.db data/provider_metrics.db data/provider_metrics.db.local-backup go/NUL >nul 2>nul
echo Done staging changes.
echo.

REM Show what will be committed
echo Changes to be committed:
echo ----------------------------------------
git diff --cached --stat
echo ----------------------------------------
echo.

REM Get commit message
set /p COMMIT_MSG="Enter commit message (or press Enter for default): "
if "%COMMIT_MSG%"=="" (
    set "COMMIT_MSG=chore: sync workspace and push all remotes"
)

REM Commit changes
echo.
echo Committing changes...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo [ERROR] Failed to commit changes
    pause
    exit /b 1
)
echo Commit successful!
echo.

REM Check remote configuration
echo Checking remote configuration...
echo ----------------------------------------
git remote -v
echo ----------------------------------------
echo.

REM Confirm push
echo.
echo This will push to both GitLab and GitHub (main).
set /p CONFIRM="Continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Push cancelled.
    pause
    exit /b 0
)

REM Push to both remotes
echo.
echo Pushing to GitLab (primary)...
git push gitlab main
if errorlevel 1 (
    echo [WARNING] Push to gitlab failed
)

echo Pushing to GitHub...
git push github main
if errorlevel 1 (
    echo [WARNING] Push to github failed
)

echo.
echo ========================================
echo   All done! Changes pushed to GitLab.
echo ========================================
echo.
pause
