# HyperNexus AI Client Scanner
Write-Host "=== Scanning for AI Tools ===" -ForegroundColor Cyan
Write-Host ""

# Define AI tool patterns
$patterns = @(
    "claude", "cursor", "windsurf", "copilot", "code", "zed", "continue",
    "antigravity", "lmstudio", "ollama", "aider", "openai", "anthropic",
    "gemini", "mistral", "deepseek", "bolt", "replit", "perplexity",
    "phind", "blackbox", "tabnine", "codeium", "supermaven", "cursorless",
    "roo", "cline", "cody", "sourcegraph", "github", "jetbrains",
    "intellij", "pycharm", "webstorm", "phpstorm", "rider", "goland",
    "clion", "fleet", "marimo", "gradio", "streamlit", "chainlit",
    "openwebui", "textgen", "kobold", "sillytavern", "jan", "gpt4all",
    "localai", "vllm", "llamafile", "koboldcpp", "chatbox", "chatgpt",
    "qwen", "zhipu", "moonshot", "kimi", "baichuan", "minimax",
    "spark", "sky", "glm", "llama", "mixtral", "gemma", "phi", "yi",
    "internlm", "chatglm", "lobechat", "nextchat", "chatbox", "dify",
    "coze", "fastgpt", "maxkb", "ragflow", "anythingllm", "librechat",
    "chathub", "chatall", "neural", "turbo", "poe", "you", "bard",
    "claude-dev", "roo-cline", "cline-dev", "supermaven", "codeium",
    "continue-dev", "tabnine", "blackbox", "phind", "perplexity",
    "bolt.new", "v0.dev", "replit", "windsurf", "codeium"
)

$regex = ($patterns | ForEach-Object { [regex]::Escape($_) }) -join "|"

Write-Host "=== AppData Roaming ===" -ForegroundColor Yellow
Get-ChildItem "$env:APPDATA" -Directory -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match $regex } |
    ForEach-Object { Write-Host "  FOUND: $($_.Name)" -ForegroundColor Green }

Write-Host ""
Write-Host "=== AppData Local ===" -ForegroundColor Yellow
Get-ChildItem "$env:LOCALAPPDATA" -Directory -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match $regex } |
    ForEach-Object { Write-Host "  FOUND: $($_.Name)" -ForegroundColor Green }

Write-Host ""
Write-Host "=== User Profile ===" -ForegroundColor Yellow
Get-ChildItem "$env:USERPROFILE" -Directory -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match $regex } |
    ForEach-Object { Write-Host "  FOUND: $($_.Name)" -ForegroundColor Green }

Write-Host ""
Write-Host "=== Program Files ===" -ForegroundColor Yellow
Get-ChildItem "C:\Program Files" -Directory -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match $regex } |
    ForEach-Object { Write-Host "  FOUND: $($_.Name)" -ForegroundColor Green }

Write-Host ""
Write-Host "=== Program Files (x86) ===" -ForegroundColor Yellow
Get-ChildItem "C:\Program Files (x86)" -Directory -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match $regex } |
    ForEach-Object { Write-Host "  FOUND: $($_.Name)" -ForegroundColor Green }

Write-Host ""
Write-Host "=== Running AI Processes ===" -ForegroundColor Yellow
Get-Process -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match $regex } |
    ForEach-Object { Write-Host "  RUNNING: $($_.Name)" -ForegroundColor Green }

Write-Host ""
Write-Host "=== CLI Tools in PATH ===" -ForegroundColor Yellow
$cliTools = @(
    "claude", "codex", "aider", "copilot", "ollama", "lmstudio", "continue",
    "gh", "cursor", "windsurf", "zed", "jan", "kobold", "gpt4all", "localai",
    "vllm", "llamafile", "dify", "coze", "fastgpt", "nextchat", "lobechat",
    "chatbox", "neural", "turbo", "poe", "you"
)
foreach ($tool in $cliTools) {
    $found = Get-Command $tool -ErrorAction SilentlyContinue
    if ($found) {
        Write-Host "  FOUND: $tool -> $($found.Source)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== .config directory ===" -ForegroundColor Yellow
$configDir = "$env:USERPROFILE\.config"
if (Test-Path $configDir) {
    Get-ChildItem $configDir -Directory -ErrorAction SilentlyContinue | 
        Where-Object { $_.Name -match $regex } |
        ForEach-Object { Write-Host "  FOUND: $($_.Name)" -ForegroundColor Green }
}

Write-Host ""
Write-Host "=== Desktop Shortcuts ===" -ForegroundColor Yellow
Get-ChildItem "$env:USERPROFILE\Desktop" -Filter "*.lnk" -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match $regex } |
    ForEach-Object { Write-Host "  SHORTCUT: $($_.Name)" -ForegroundColor Green }

Write-Host ""
Write-Host "=== Start Menu ===" -ForegroundColor Yellow
Get-ChildItem "$env:APPDATA\Microsoft\Windows\Start Menu\Programs" -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -match $regex } |
    ForEach-Object { Write-Host "  SHORTCUT: $($_.Name)" -ForegroundColor Green }

Write-Host ""
Write-Host "=== npm global packages ===" -ForegroundColor Yellow
npm list -g --depth=0 2>$null | Select-String -Pattern $regex | ForEach-Object { Write-Host "  NPM: $_" -ForegroundColor Green }

Write-Host ""
Write-Host "=== pip packages ===" -ForegroundColor Yellow
pip list 2>$null | Select-String -Pattern $regex | ForEach-Object { Write-Host "  PIP: $_" -ForegroundColor Green }

Write-Host ""
Write-Host "=== Scan Complete ===" -ForegroundColor Cyan
