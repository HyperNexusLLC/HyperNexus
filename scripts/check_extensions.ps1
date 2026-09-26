# Check VS Code extensions
Write-Host "=== VS Code Extensions ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "VS Code:" -ForegroundColor Yellow
code --list-extensions 2>$null | ForEach-Object {
    if ($_ -match 'cline|roo|continue|gemini|codex|copilot|cody|tabnine|supermaven|blackbox') {
        Write-Host "  INSTALLED: $_" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "VS Code Insiders:" -ForegroundColor Yellow
code-insiders --list-extensions 2>$null | ForEach-Object {
    if ($_ -match 'cline|roo|continue|gemini|codex|copilot|cody|tabnine|supermaven|blackbox') {
        Write-Host "  INSTALLED: $_" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Extension IDs ===" -ForegroundColor Cyan
Write-Host "Cline: saoudrizwan.claude-dev" -ForegroundColor Gray
Write-Host "Roo Code: rooveterinaryinc.roo-cline" -ForegroundColor Gray
Write-Host "Continue: Continue.continue" -ForegroundColor Gray
Write-Host "Gemini CLI Companion: Google.gemini-cli-companion" -ForegroundColor Gray
Write-Host "Gemini Code Assist: Google.geminicodeassist" -ForegroundColor Gray
Write-Host "Codex: openai.codex" -ForegroundColor Gray
Write-Host "GitHub Copilot: GitHub.copilot" -ForegroundColor Gray
