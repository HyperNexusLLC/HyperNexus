@echo off
setlocal enabledelayedexpansion
:: Stop hook — log session end to HyperNexus L2 memory.
set /p STDIN=
if "!STDIN!"=="" exit /b 0
set "HOOKTMP=%TEMP%\hn_hook_%RANDOM%%RANDOM%.json"
> "!HOOKTMP!" echo(!STDIN!
powershell -Command "try { $j = Get-Content $env:HOOKTMP -Raw | ConvertFrom-Json; $body=@{content=('Session ended: ' + $j.session_id);tags=@('system:session_end','reason:codex');category='session';timestamp=(Get-Date -Format o)}; Invoke-RestMethod -Uri 'http://127.0.0.1:7778/api/memory/facts/add' -Method Post -Body ($body|ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 3 | Out-Null } catch {}; Remove-Item $env:HOOKTMP -ErrorAction SilentlyContinue"
echo {"continue": true}
exit /b 0
