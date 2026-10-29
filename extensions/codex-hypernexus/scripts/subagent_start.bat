@echo off
setlocal enabledelayedexpansion
:: SubagentStart hook — log subagent spawn, always continue.
set /p STDIN=
powershell -Command "try { $b=@{content='Codex subagent started';tags=@('system:hook','reason:codex','hook:subagent-start')}; Invoke-RestMethod -Uri 'http://127.0.0.1:7778/api/memory/facts/add' -Method Post -Body ($b|ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 3 | Out-Null } catch {}"
echo {"continue": true}
exit /b 0
