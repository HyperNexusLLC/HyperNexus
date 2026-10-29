@echo off
setlocal enabledelayedexpansion
:: SessionEnd hook (main session only) — archive session to L2 memory.
set /p STDIN=
powershell -Command "try { $b=@{content='Codex session ended';tags=@('system:session','reason:codex','hook:session-end')}; Invoke-RestMethod -Uri 'http://127.0.0.1:7778/api/memory/facts/add' -Method Post -Body ($b|ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 3 | Out-Null } catch {}"
echo {"continue": true}
exit /b 0
