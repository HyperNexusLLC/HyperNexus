@echo off
setlocal enabledelayedexpansion
:: UserPromptSubmit hook — capture prompt to HyperNexus for context.
set /p STDIN=
if "!STDIN!"=="" exit /b 0
set "HOOKTMP=%TEMP%\hn_hook_%RANDOM%%RANDOM%.json"
> "!HOOKTMP!" echo(!STDIN!
powershell -Command "try { $j = Get-Content $env:HOOKTMP -Raw | ConvertFrom-Json; $body=@{content=('User prompt submitted in session ' + $j.session_id);tags=@('system:user-prompt','reason:codex');category='session';timestamp=(Get-Date -Format o)}; Invoke-RestMethod -Uri 'http://127.0.0.1:7778/api/memory/user-prompts/capture' -Method Post -Body ($body|ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 3 | Out-Null } catch {}; Remove-Item $env:HOOKTMP -ErrorAction SilentlyContinue"
echo {"continue": true}
exit /b 0
