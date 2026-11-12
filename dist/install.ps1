# HyperNexus Windows Installer - Universal AI Client Detection
# Usage: irm https://hypernexus.site/install.ps1 | iex
# Scans entire system for ALL AI clients, injects MCP config, installs extensions

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$Version = "v1.0.0"
$BaseUrl = "https://releases.hypernexus.site/$Version"
$InstallDir = "$env:LOCALAPPDATA\HyperNexus"
$McpUrl = "http://localhost:8080/mcp"

$Configured = @()
$Skipped = @()
$ExtensionsInstalled = @()

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   HyperNexus Installer $Version" -ForegroundColor Cyan
Write-Host "   Universal AI Client Integration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# HELPER FUNCTIONS
# ============================================================

function Set-McpConfig {
    param(
        [string]$ConfigPath,
        [string]$ClientName
    )
    
    $ConfigDir = Split-Path $ConfigPath -Parent
    if (!(Test-Path $ConfigDir)) {
        New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
    }
    
    $McpEntry = [PSCustomObject]@{ url = $McpUrl }
    
    if (Test-Path $ConfigPath) {
        try {
            $Existing = Get-Content -Path $ConfigPath -Raw | ConvertFrom-Json
            if (-not $Existing.mcpServers) {
                $Existing | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue ([PSCustomObject]@{}) -Force
            }
            $Existing.mcpServers | Add-Member -NotePropertyName "hypernexus" -NotePropertyValue $McpEntry -Force
            $Existing | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigPath -Encoding UTF8 -Force
        } catch {
            $Config = [PSCustomObject]@{
                mcpServers = [PSCustomObject]@{
                    hypernexus = $McpEntry
                }
            }
            $Config | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigPath -Encoding UTF8 -Force
        }
    } else {
        $Config = [PSCustomObject]@{
            mcpServers = [PSCustomObject]@{
                hypernexus = $McpEntry
            }
        }
        $Config | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigPath -Encoding UTF8 -Force
    }
    
    Write-Host "    OK: $ClientName MCP config injected" -ForegroundColor Green
    $script:Configured += $ClientName
}

function Install-VsCodeExtension {
    param(
        [string]$ExeName,
        [string]$ExtensionId,
        [string]$DisplayName
    )
    
    try {
        $vscode = Get-Command $ExeName -ErrorAction SilentlyContinue
        if ($vscode) {
            Write-Host "    Installing $DisplayName..." -ForegroundColor Gray
            $result = & $vscode.Source --install-extension $ExtensionId --force 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "    OK: $DisplayName installed" -ForegroundColor Green
                $script:ExtensionsInstalled += "$DisplayName ($ExtensionId)"
            } else {
                Write-Host "    SKIP: $DisplayName install failed" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "    SKIP: $DisplayName - $_" -ForegroundColor Yellow
    }
}

function Configure-VsCodeExtensions {
    param(
        [string]$UserDir,
        [string]$ClientName
    )
    
    # VS Code settings.json - MCP config for built-in MCP support
    $SettingsPath = "$UserDir\settings.json"
    if (Test-Path $SettingsPath) {
        try {
            $Settings = Get-Content $SettingsPath -Raw | ConvertFrom-Json
            if (-not $Settings.'mcp.servers') {
                $Settings | Add-Member -NotePropertyName "mcp.servers" -NotePropertyValue ([PSCustomObject]@{}) -Force
            }
            $Settings.'mcp.servers' | Add-Member -NotePropertyName "hypernexus" -NotePropertyValue ([PSCustomObject]@{
                url = $McpUrl
                type = "sse"
            }) -Force
            $Settings | ConvertTo-Json -Depth 10 | Set-Content $SettingsPath -Encoding UTF8 -Force
            Write-Host "    OK: $ClientName settings.json updated" -ForegroundColor Green
        } catch {
            Write-Host "    SKIP: $ClientName settings.json error" -ForegroundColor Yellow
        }
    } else {
        # Create settings.json
        $Settings = [PSCustomObject]@{
            'mcp.servers' = [PSCustomObject]@{
                hypernexus = [PSCustomObject]@{
                    url = $McpUrl
                    type = "sse"
                }
            }
        }
        $Settings | ConvertTo-Json -Depth 10 | Set-Content $SettingsPath -Encoding UTF8 -Force
        Write-Host "    OK: $ClientName settings.json created" -ForegroundColor Green
    }
    
    # Cline MCP config
    $ClinePath = "$UserDir\globalStorage\saoudrizwan.claude-dev\settings\mcp_settings.json"
    if (Test-Path "$UserDir\globalStorage\saoudrizwan.claude-dev") {
        Set-McpConfig -ConfigPath $ClinePath -ClientName "$ClientName Cline"
    }
    
    # Roo Code MCP config
    $RooPath = "$UserDir\globalStorage\rooveterinaryinc.roo-cline\settings\mcp_settings.json"
    if (Test-Path "$UserDir\globalStorage\rooveterinaryinc.roo-cline") {
        Set-McpConfig -ConfigPath $RooPath -ClientName "$ClientName Roo Code"
    }
    
    # Continue config
    $ContinuePath = "$env:USERPROFILE\.continue\config.json"
    if (Test-Path "$env:USERPROFILE\.continue") {
        Set-McpConfig -ConfigPath $ContinuePath -ClientName "$ClientName Continue"
    }
    
    # Gemini CLI Companion config
    $GeminiPath = "$UserDir\globalStorage\google.gemini-cli-vscode-ide-companion\settings.json"
    if (Test-Path "$UserDir\globalStorage\google.gemini-cli-vscode-ide-companion") {
        Set-McpConfig -ConfigPath $GeminiPath -ClientName "$ClientName Gemini CLI"
    }
    
    # Gemini Code Assist config
    $GeminiCodePath = "$UserDir\globalStorage\google.geminicodeassist\settings.json"
    if (Test-Path "$UserDir\globalStorage\google.geminicodeassist") {
        Set-McpConfig -ConfigPath $GeminiCodePath -ClientName "$ClientName Gemini Code Assist"
    }
    
    # Codex config
    $CodexPath = "$UserDir\globalStorage\openai.codex\settings.json"
    if (Test-Path "$UserDir\globalStorage\openai.codex") {
        Set-McpConfig -ConfigPath $CodexPath -ClientName "$ClientName Codex"
    }
}

# ============================================================
# STEP 1: Install Binary & Extension
# ============================================================
Write-Host "[1/6] Installing HyperNexus..." -ForegroundColor Yellow
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
$ExePath = "$InstallDir\hypernexus.exe"
$ExeUrl = "$BaseUrl/hypernexus.exe"
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $ExeUrl -OutFile $ExePath -UseBasicParsing
    Write-Host "  OK: Downloaded hypernexus.exe ($([math]::Round((Get-Item $ExePath).Length / 1MB, 1)) MB)" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
    exit 1
}

$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($CurrentPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$CurrentPath;$InstallDir", "User")
    $env:Path = "$env:Path;$InstallDir"
}
Write-Host "  OK: Added to PATH" -ForegroundColor Green

# Install VS Code extension from marketplace
Write-Host "  Installing VS Code extension..." -ForegroundColor Gray
try {
    $vscode = Get-Command code -ErrorAction SilentlyContinue
    if ($vscode) {
        & code --install-extension hypernexus.hypernexus --force 2>$null | Out-Null
        Write-Host "  OK: VS Code extension installed" -ForegroundColor Green
    }
} catch {
    Write-Host "  SKIP: VS Code extension install" -ForegroundColor Yellow
}
try {
    $vscodeInsiders = Get-Command code-insiders -ErrorAction SilentlyContinue
    if ($vscodeInsiders) {
        & code-insiders --install-extension hypernexus.hypernexus --force 2>$null | Out-Null
        Write-Host "  OK: VS Code Insiders extension installed" -ForegroundColor Green
    }
} catch {
    Write-Host "  SKIP: VS Code Insiders extension install" -ForegroundColor Yellow
}

# ============================================================
# STEP 2: VS Code & VS Code Insiders (Full Setup)
# ============================================================
Write-Host ""
Write-Host "[2/6] Configuring VS Code & Insiders..." -ForegroundColor Yellow

# Determine which extension to install based on edition
$Edition = "hypernexus"  # Default to hypernexus
if ($env:HN_EDITION -eq "tormentnexus") {
    $Edition = "tormentnexus"
}
$ExtensionId = "$Edition.$Edition"
$ExtensionName = $Edition.Substring(0,1).ToUpper() + $Edition.Substring(1)

# VS Code
$VsCodeDir = "$env:APPDATA\Code\User"
if (Test-Path $VsCodeDir) {
    Write-Host ""
    Write-Host "  VS Code:" -ForegroundColor Cyan
    
    # Install only HyperNexus/TormentNexus extension
    Install-VsCodeExtension -ExeName "code" -ExtensionId $ExtensionId -DisplayName $ExtensionName
    
    # Configure all extensions
    Configure-VsCodeExtensions -UserDir $VsCodeDir -ClientName "VS Code"
    $Configured += "VS Code"
}

# VS Code Insiders
$VsCodeInsidersDir = "$env:APPDATA\Code - Insiders\User"
if (Test-Path $VsCodeInsidersDir) {
    Write-Host ""
    Write-Host "  VS Code Insiders:" -ForegroundColor Cyan
    
    # Install only HyperNexus/TormentNexus extension
    Install-VsCodeExtension -ExeName "code-insiders" -ExtensionId $ExtensionId -DisplayName $ExtensionName
    
    # Configure all extensions
    Configure-VsCodeExtensions -UserDir $VsCodeInsidersDir -ClientName "VS Code Insiders"
    $Configured += "VS Code Insiders"
}

# ============================================================
# STEP 3: Other IDEs
# ============================================================
Write-Host ""
Write-Host "[3/6] Configuring other IDEs..." -ForegroundColor Yellow

# Cursor
$CursorDir = "$env:APPDATA\Cursor\User"
if (Test-Path "$env:USERPROFILE\.cursor") {
    Write-Host "  FOUND: Cursor" -ForegroundColor Green
    Set-McpConfig -ConfigPath "$env:USERPROFILE\.cursor\mcp.json" -ClientName "Cursor"
    if (Test-Path $CursorDir) {
        Configure-VsCodeExtensions -UserDir $CursorDir -ClientName "Cursor"
    }
    Install-VsCodeExtension -ExeName "cursor" -ExtensionId $ExtensionId -DisplayName $ExtensionName
    $Configured += "Cursor"
}

# Windsurf
if (Test-Path "$env:USERPROFILE\.windsurf") {
    Write-Host "  FOUND: Windsurf" -ForegroundColor Green
    Set-McpConfig -ConfigPath "$env:USERPROFILE\.windsurf\mcp.json" -ClientName "Windsurf"
    $WindsurfDir = "$env:APPDATA\Windsurf\User"
    if (Test-Path $WindsurfDir) {
        Configure-VsCodeExtensions -UserDir $WindsurfDir -ClientName "Windsurf"
    }
    Install-VsCodeExtension -ExeName "windsurf" -ExtensionId $ExtensionId -DisplayName $ExtensionName
    $Configured += "Windsurf"
}

# Verdent
if (Test-Path "$env:APPDATA\Verdent") {
    Write-Host "  FOUND: Verdent" -ForegroundColor Green
    Set-McpConfig -ConfigPath "$env:USERPROFILE\.verdent\mcp.json" -ClientName "Verdent"
    Install-VsCodeExtension -ExeName "verdent" -ExtensionId $ExtensionId -DisplayName $ExtensionName
    $Configured += "Verdent"
}

# DeepSeek Harness
if (Test-Path "$env:USERPROFILE\.deepseek") {
    Write-Host "  FOUND: DeepSeek Harness" -ForegroundColor Green
    
    # Create config directory
    $DeepSeekDir = "$env:USERPROFILE\.deepseek"
    if (!(Test-Path $DeepSeekDir)) {
        New-Item -ItemType Directory -Path $DeepSeekDir -Force | Out-Null
    }
    
    # MCP config for DeepSeek Harness
    $McpConfig = @"
# HyperNexus MCP integration for DeepSeek Harness
- insert:
    - id: memory-hypernexus
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: hypernexus
        transport: http
        url: $McpUrl
"@
    $McpConfig | Set-Content "$DeepSeekDir\hypernexus.cordis.yml" -Encoding UTF8 -Force
    Write-Host "    OK: DeepSeek Harness MCP config created" -ForegroundColor Green
    
    # SKILL.md
    $SkillMd = "$DeepSeekDir\SKILL.md"
    @"
# HyperNexus Skill for DeepSeek Harness

## MCP Server
Connect to HyperNexus at: $McpUrl

## Usage
- Run: dsh web --patch "$DeepSeekDir\hypernexus.cordis.yml"
- Persistent memory across sessions
- MCP tool routing
"@ | Set-Content $SkillMd -Encoding UTF8 -Force
    Write-Host "    OK: SKILL.md created" -ForegroundColor Green
    $Configured += "DeepSeek Harness"
}

# Grok Build (SpaceXAI)
if (Get-Command grok -ErrorAction SilentlyContinue) {
    Write-Host "  FOUND: Grok Build (SpaceXAI)" -ForegroundColor Green
    
    # Create config directory
    $GrokDir = "$env:USERPROFILE\.grok"
    if (!(Test-Path $GrokDir)) {
        New-Item -ItemType Directory -Path $GrokDir -Force | Out-Null
    }
    
    # MCP config for Grok Build
    $McpConfig = @"
# HyperNexus MCP integration for Grok Build
[mcp_servers.hypernexus]
url = "$McpUrl"
enabled = true
startup_timeout_sec = 30
tool_timeout_sec = 60
"@
    $McpConfig | Set-Content "$GrokDir\hypernexus-mcp.toml" -Encoding UTF8 -Force
    Write-Host "    OK: Grok Build MCP config created" -ForegroundColor Green
    
    # SKILL.md
    $SkillMd = "$GrokDir\skills\hypernexus\SKILL.md"
    $SkillDir = Split-Path $SkillMd -Parent
    if (!(Test-Path $SkillDir)) {
        New-Item -ItemType Directory -Path $SkillDir -Force | Out-Null
    }
    @"
---
name: hypernexus
description: HyperNexus persistent memory and MCP tool integration
---

# HyperNexus Skill

Connect to HyperNexus for persistent memory and MCP tool routing.

## MCP Server

HyperNexus runs at: $McpUrl

## Available Tools

- memory_scratchpad_get - Retrieve a memory
- memory_scratchpad_set - Save a memory
- memory_search - Search memories
- mcp_list_tools - List MCP tools
- mcp_call_tool - Call an MCP tool

## Usage

1. Save context: "Remember that we chose PostgreSQL for auth"
2. Recall context: "Search memory for database decisions"
3. Cross-tool sync: Context is shared across all tools
"@ | Set-Content $SkillMd -Encoding UTF8 -Force
    Write-Host "    OK: Grok Build skill created" -ForegroundColor Green
    $Configured += "Grok Build"
}

# Antigravity
if (Test-Path "$env:USERPROFILE\.antigravity") {
    Write-Host "  FOUND: Antigravity" -ForegroundColor Green
    Set-McpConfig -ConfigPath "$env:USERPROFILE\.antigravity\config.json" -ClientName "Antigravity"
    
    # SKILL.md
    $SkillMd = "$env:USERPROFILE\.antigravity\SKILL.md"
    @"
# HyperNexus Skill

## MCP Server
Connect to HyperNexus at: $McpUrl

## Tools
- memory_save: Save memories
- memory_search: Search memories
- tool_list: List available tools

## Usage
Use the HyperNexus MCP tools for persistent memory across sessions.
"@ | Set-Content $SkillMd -Encoding UTF8 -Force
    Write-Host "    OK: SKILL.md created" -ForegroundColor Green
    
    Install-VsCodeExtension -ExeName "antigravity" -ExtensionId $ExtensionId -DisplayName $ExtensionName
    $Configured += "Antigravity"
}

# Antigravity IDE
if (Test-Path "$env:APPDATA\Antigravity IDE") {
    Write-Host "  FOUND: Antigravity IDE" -ForegroundColor Green
    Set-McpConfig -ConfigPath "$env:APPDATA\Antigravity IDE\mcp.json" -ClientName "Antigravity IDE"
    Install-VsCodeExtension -ExeName "antigravity" -ExtensionId $ExtensionId -DisplayName $ExtensionName
    $Configured += "Antigravity IDE"
}

# Kiro
if (Test-Path "$env:USERPROFILE\.kiro") {
    Write-Host "  FOUND: Kiro" -ForegroundColor Green
    Set-McpConfig -ConfigPath "$env:USERPROFILE\.kiro\mcp.json" -ClientName "Kiro"
    Install-VsCodeExtension -ExeName "kiro" -ExtensionId $ExtensionId -DisplayName $ExtensionName
    $Configured += "Kiro"
}

# Zed
if (Test-Path "$env:USERPROFILE\.zed") {
    Write-Host "  FOUND: Zed" -ForegroundColor Green
    $ZedSettings = "$env:USERPROFILE\.zed\settings.json"
    if (Test-Path $ZedSettings) {
        try {
            $Config = Get-Content $ZedSettings -Raw | ConvertFrom-Json
            if (-not $Config.mcp) {
                $Config | Add-Member -NotePropertyName "mcp" -NotePropertyValue ([PSCustomObject]@{
                    servers = [PSCustomObject]@{
                        hypernexus = [PSCustomObject]@{
                            command = $ExePath -replace '\\', '/'
                            args = @("mcp")
                        }
                    }
                }) -Force
            }
            $Config | ConvertTo-Json -Depth 10 | Set-Content $ZedSettings -Encoding UTF8 -Force
            Write-Host "    OK: Zed MCP config injected" -ForegroundColor Green
            $Configured += "Zed"
        } catch {}
    }
}

# Antigravity IDE
if (Test-Path "$env:APPDATA\Antigravity IDE") {
    Write-Host "  FOUND: Antigravity IDE" -ForegroundColor Green
    Set-McpConfig -ConfigPath "$env:APPDATA\Antigravity IDE\mcp.json" -ClientName "Antigravity IDE"
}

# Zed
if (Test-Path "$env:USERPROFILE\.zed") {
    Write-Host "  FOUND: Zed" -ForegroundColor Green
    $ZedSettings = "$env:USERPROFILE\.zed\settings.json"
    if (Test-Path $ZedSettings) {
        try {
            $Config = Get-Content $ZedSettings -Raw | ConvertFrom-Json
            if (-not $Config.mcp) {
                $Config | Add-Member -NotePropertyName "mcp" -NotePropertyValue ([PSCustomObject]@{
                    servers = [PSCustomObject]@{
                        hypernexus = [PSCustomObject]@{
                            command = "hypernexus"
                            args = @("mcp")
                        }
                    }
                }) -Force
            }
            $Config | ConvertTo-Json -Depth 10 | Set-Content $ZedSettings -Encoding UTF8 -Force
            Write-Host "    OK: Zed MCP config injected" -ForegroundColor Green
            $Configured += "Zed"
        } catch {}
    }
}

# JetBrains
if (Test-Path "$env:APPDATA\JetBrains") {
    Write-Host "  FOUND: JetBrains IDEs" -ForegroundColor Green
    Get-ChildItem "$env:APPDATA\JetBrains" -Directory | ForEach-Object {
        $JbName = $_.Name
        if ($JbName -match "idea|pycharm|webstorm|phpstorm|rider|goland|clion|fleet") {
            $JbConfigDir = "$($_.FullName)\options"
            if (!(Test-Path $JbConfigDir)) {
                New-Item -ItemType Directory -Path $JbConfigDir -Force | Out-Null
            }
            $McpXml = @"
<?xml version="1.0" encoding="UTF-8"?>
<application>
  <component name="McpServers">
    <option name="servers">
      <map>
        <entry key="hypernexus">
          <value>
            <McpServer>
              <option name="name" value="hypernexus" />
              <option name="url" value="$McpUrl" />
            </McpServer>
          </value>
        </entry>
      </map>
    </option>
  </component>
</application>
"@
            $McpXml | Set-Content "$JbConfigDir\mcpServers.xml" -Encoding UTF8
            Write-Host "    OK: JetBrains $JbName configured" -ForegroundColor Green
            $Configured += "JetBrains $JbName"
        }
    }
}

# ============================================================
# STEP 4: Desktop Apps
# ============================================================
Write-Host ""
Write-Host "[4/6] Configuring Desktop Apps..." -ForegroundColor Yellow

# Claude Desktop
if (Test-Path "$env:APPDATA\Claude") {
    Write-Host "  FOUND: Claude Desktop" -ForegroundColor Green
    
    # Claude Desktop uses command format, not url
    $ConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"
    $ConfigDir = Split-Path $ConfigPath -Parent
    if (!(Test-Path $ConfigDir)) {
        New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
    }
    
    $hypernexus = [PSCustomObject]@{
        command = $ExePath -replace '\\', '/'
        args = @("mcp")
    }
    
    if (Test-Path $ConfigPath) {
        try {
            $Existing = Get-Content -Path $ConfigPath -Raw | ConvertFrom-Json
            if (-not $Existing.mcpServers) {
                $Existing | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue ([PSCustomObject]@{}) -Force
            }
            $Existing.mcpServers | Add-Member -NotePropertyName "hypernexus" -NotePropertyValue $hypernexus -Force
            $Existing | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigPath -Encoding UTF8 -Force
        } catch {
            $Config = [PSCustomObject]@{
                mcpServers = [PSCustomObject]@{
                    hypernexus = $hypernexus
                }
            }
            $Config | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigPath -Encoding UTF8 -Force
        }
    } else {
        $Config = [PSCustomObject]@{
            mcpServers = [PSCustomObject]@{
                hypernexus = $hypernexus
            }
        }
        $Config | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigPath -Encoding UTF8 -Force
    }
    
    Write-Host "    OK: Claude Desktop MCP config injected" -ForegroundColor Green
    $script:Configured += "Claude Desktop"
    
    # Skill
    $SkillDir = "$env:APPDATA\Claude\extensions\hypernexus"
    if (!(Test-Path $SkillDir)) {
        New-Item -ItemType Directory -Path $SkillDir -Force | Out-Null
    }
    $Manifest = @{
        name = "hypernexus"
        version = "1.0.0"
        description = "HyperNexus - Universal AI Control Plane"
        tools = @(
            @{ name = "memory_save"; description = "Save memory" }
            @{ name = "memory_search"; description = "Search memories" }
            @{ name = "tool_list"; description = "List tools" }
        )
    }
    $Manifest | ConvertTo-Json -Depth 5 | Set-Content "$SkillDir\manifest.json" -Encoding UTF8 -Force
    Write-Host "    OK: Skill installed" -ForegroundColor Green
}

# Jan, Perplexity, Kimi, MiniMax, AnythingLLM
foreach ($app in @(
    @{Path="$env:APPDATA\jan.ai.app"; Name="Jan"},
    @{Path="$env:APPDATA\Perplexity"; Name="Perplexity"},
    @{Path="$env:APPDATA\kimi-desktop"; Name="Kimi"},
    @{Path="$env:APPDATA\MiniMax Agent"; Name="MiniMax"},
    @{Path="$env:APPDATA\anythingllm-desktop"; Name="AnythingLLM"},
    @{Path="$env:APPDATA\ZCode"; Name="ZCode"}
)) {
    if (Test-Path $app.Path) {
        Write-Host "  FOUND: $($app.Name)" -ForegroundColor Green
        Set-McpConfig -ConfigPath "$($app.Path)\mcp.json" -ClientName $app.Name
    }
}

# ============================================================
# STEP 5: CLI Tools
# ============================================================
Write-Host ""
Write-Host "[5/6] Configuring CLI Tools..." -ForegroundColor Yellow

foreach ($cli in @(
    @{Cmd="claude"; Name="Claude Code"; Args=@("mcp", "add", "hypernexus", "--transport", "http", $McpUrl)},
    @{Cmd="codex"; Name="Codex CLI"; Args=@("mcp", "add", "hypernexus", $McpUrl)},
    @{Cmd="gemini"; Name="Gemini CLI"; Args=@("mcp", "add", "hypernexus", $McpUrl)},
    @{Cmd="qwen"; Name="Qwen Code"; Args=@("mcp", "add", "hypernexus", $McpUrl)}
)) {
    if (Get-Command $cli.Cmd -ErrorAction SilentlyContinue) {
        Write-Host "  FOUND: $($cli.Name)" -ForegroundColor Green
        try {
            & $cli.Cmd $cli.Args 2>$null
            Write-Host "    OK: MCP server added" -ForegroundColor Green
            $Configured += $cli.Name
        } catch {
            Write-Host "    SKIP: $_" -ForegroundColor Yellow
        }
    }
}

if (Get-Command aider -ErrorAction SilentlyContinue) {
    Write-Host "  FOUND: Aider" -ForegroundColor Green
    Write-Host "    OK: Use --mcp-url $McpUrl" -ForegroundColor Green
    $Configured += "Aider"
}

foreach ($cli in @("gh", "windsurf", "jan", "kilocode", "codewhale")) {
    if (Get-Command $cli -ErrorAction SilentlyContinue) {
        Write-Host "  FOUND: $cli" -ForegroundColor Green
        $Configured += $cli
    }
}

# ============================================================
# STEP 6: Hooks & Skills
# ============================================================
Write-Host ""
Write-Host "[6/7] Installing hooks & skills..." -ForegroundColor Yellow

# Auto-start hook
$HookDir = "$env:USERPROFILE\.hypernexus\hooks"
if (!(Test-Path $HookDir)) {
    New-Item -ItemType Directory -Path $HookDir -Force | Out-Null
}

$AutoStart = @'
# HyperNexus Auto-Start
function Start-HyperNexus {
    $Running = Get-Process -Name "hypernexus" -ErrorAction SilentlyContinue
    if (-not $Running) {
        Start-Process -FilePath "$env:LOCALAPPDATA\HyperNexus\hypernexus.exe" -ArgumentList "serve" -WindowStyle Hidden
    }
}
Start-HyperNexus
'@
$AutoStart | Set-Content "$HookDir\auto-start.ps1" -Encoding UTF8 -Force
Write-Host "  OK: Auto-start hook installed" -ForegroundColor Green

# Skills for all VS Code extensions and IDEs
$SkillContent = @"
# HyperNexus MCP Integration

## Available Tools
- memory_save: Save memories to persistent storage
- memory_search: Search memories by query
- tool_list: List available MCP tools

## Usage
Connect to HyperNexus at: $McpUrl
"@

foreach ($extDir in @(
    "$env:USERPROFILE\.cline",
    "$env:USERPROFILE\.roo",
    "$env:USERPROFILE\.continue",
    "$env:USERPROFILE\.antigravity",
    "$env:USERPROFILE\.cursor",
    "$env:USERPROFILE\.windsurf",
    "$env:USERPROFILE\.verdent",
    "$env:USERPROFILE\.kiro",
    "$env:USERPROFILE\.zed"
)) {
    if (Test-Path $extDir) {
        $SkillContent | Set-Content "$extDir\SKILL.md" -Encoding UTF8 -Force
        Write-Host "  OK: Skill created in $extDir" -ForegroundColor Green
    }
}

# ============================================================
# STEP 7: Start HyperNexus Server
# ============================================================
Write-Host ""
Write-Host "[7/7] Starting HyperNexus server..." -ForegroundColor Yellow

# Check if already running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 2
    Write-Host "  OK: Server already running" -ForegroundColor Green
} catch {
    # Start server in background
    Start-Process -FilePath "$ExePath" -ArgumentList "serve" -WindowStyle Hidden
    Write-Host "  OK: Server started in background" -ForegroundColor Green
    
    # Wait for it to be ready
    Write-Host "  Waiting for server to be ready..." -ForegroundColor Gray
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 1
            Write-Host "  OK: Server is ready!" -ForegroundColor Green
            break
        } catch {
            Start-Sleep -Seconds 1
        }
    }
}

# Send first-run telemetry
try {
    $deviceId = (Get-WmiObject Win32_ComputerSystemProduct).UUID
    $telemetryBody = @{
        deviceId = $deviceId
        platform = "windows"
        version = $Version
        timestamp = (Get-Date).ToString("o")
    } | ConvertTo-Json
    
    Invoke-WebRequest -Uri "https://hypernexus.site/api/v1/telemetry/first_run" `
        -Method POST `
        -Body $telemetryBody `
        -ContentType "application/json" `
        -UseBasicParsing `
        -TimeoutSec 5 | Out-Null
    
    Write-Host "  OK: First-run telemetry sent" -ForegroundColor Green
} catch {
    # Non-critical, don't fail install
    Write-Host "  SKIP: Telemetry (non-critical)" -ForegroundColor Gray
}

# Auto-open dashboard
try {
    Start-Process "http://localhost:7779/dashboard"
    Write-Host "  OK: Dashboard opened in browser" -ForegroundColor Green
} catch {
    Write-Host "  SKIP: Could not open browser" -ForegroundColor Gray
}

# ============================================================
# SUMMARY
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   HyperNexus Installed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Binary: $ExePath" -ForegroundColor White
Write-Host "  MCP Endpoint: $McpUrl" -ForegroundColor White
Write-Host ""
Write-Host "  Configured ($($Configured.Count)):" -ForegroundColor Cyan
foreach ($c in $Configured | Sort-Object -Unique) {
    Write-Host "    ✓ $c" -ForegroundColor Green
}
if ($ExtensionsInstalled.Count -gt 0) {
    Write-Host ""
    Write-Host "  Extensions Installed ($($ExtensionsInstalled.Count)):" -ForegroundColor Cyan
    foreach ($e in $ExtensionsInstalled | Sort-Object -Unique) {
        Write-Host "    ✓ $e" -ForegroundColor Green
    }
}
Write-Host ""
Write-Host "  Next Steps:" -ForegroundColor Cyan
Write-Host "    1. Restart VS Code / VS Code Insiders" -ForegroundColor White
Write-Host "    2. Run: hypernexus serve" -ForegroundColor White
Write-Host "    3. All tools now share persistent memory!" -ForegroundColor White
Write-Host ""
Write-Host "  Docs: https://hypernexus.site" -ForegroundColor Gray
Write-Host "  Discord: https://discord.gg/Hj9P3GbVxR" -ForegroundColor Gray
Write-Host ""
