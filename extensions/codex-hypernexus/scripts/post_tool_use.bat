@echo off
setlocal enabledelayedexpansion
:: PostToolUse hook — record tool result context to HyperNexus.
set /p STDIN=
if "!STDIN!"=="" exit /b 0
set "HOOKTMP=%TEMP%\hn_hook_%RANDOM%%RANDOM%.json"
> "!HOOKTMP!" echo(!STDIN!
powershell -Command "try { $j = Get-Content $env:HOOKTMP -Raw | ConvertFrom-Json; $tool = $j.tool_name; if (-not $tool) { $tool = $j.toolName }; if (-not $tool) { $tool = 'unknown' }; $body=@{content=('Codex tool used: ' + $tool);toolName=$tool;type='tool-use';namespace='project'}; Invoke-RestMethod -Uri 'http://127.0.0.1:7778/api/memory/observations/record' -Method Post -Body ($body|ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 3 | Out-Null } catch {}; Remove-Item $env:HOOKTMP -ErrorAction SilentlyContinue"
echo {"continue": true}
exit /b 0
