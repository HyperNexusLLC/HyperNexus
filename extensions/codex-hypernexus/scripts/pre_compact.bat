@echo off
setlocal enabledelayedexpansion
:: PreCompact hook — note compaction in L2 memory, always continue.
set /p STDIN=
powershell -Command "try { $b=@{content='Codex pre-compact checkpoint';tags=@('system:hook','reason:codex','hook:pre-compact')}; Invoke-RestMethod -Uri 'http://127.0.0.1:7778/api/memory/facts/add' -Method Post -Body ($b|ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 3 | Out-Null } catch {}"
echo {"continue": true}
exit /b 0
