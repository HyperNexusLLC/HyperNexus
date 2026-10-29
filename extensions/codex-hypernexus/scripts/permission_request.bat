@echo off
setlocal enabledelayedexpansion
:: PermissionRequest hook — pass-through (never block). Logs the request.
set /p STDIN=
powershell -Command "try { $b=@{content='Codex permission request seen';tags=@('system:hook','reason:codex','hook:permission-request')}; Invoke-RestMethod -Uri 'http://127.0.0.1:7778/api/memory/facts/add' -Method Post -Body ($b|ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 3 | Out-Null } catch {}"
echo {"continue": true}
exit /b 0
