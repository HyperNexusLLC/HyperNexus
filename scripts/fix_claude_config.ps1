# Fix Claude Desktop config
$configPath = "$env:APPDATA\Claude\claude_desktop_config.json"

# Read existing config
$config = Get-Content $configPath -Raw | ConvertFrom-Json

# Add hypernexus MCP server
$hypernexus = [PSCustomObject]@{
    url = "http://localhost:8080/mcp"
}

# Add to mcpServers
if (-not $config.mcpServers) {
    $config | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue ([PSCustomObject]@{}) -Force
}

$config.mcpServers | Add-Member -NotePropertyName "hypernexus" -NotePropertyValue $hypernexus -Force

# Save config
$config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8 -Force

# Verify
Write-Host "Fixed! Current config:"
Get-Content $configPath
