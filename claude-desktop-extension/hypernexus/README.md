# HyperNexus Claude Desktop Extension

This extension provides persistent memory, tool orchestration, and cloud sync for Claude Desktop.

## Features

### Memory Skill

- **Persistent Memory**: Remember decisions, preferences, and architectural choices across sessions
- **Context Harvesting**: Automatically pull in relevant historical context
- **Memory Search**: Search through your memories by query
- **Memory Export**: Export and import memories for backup or sharing

### Tools Skill

- **38+ AI Tool Integrations**: File system, terminal, search, git, web, and more
- **Progressive Tool Routing**: Only the most relevant tools are loaded per request
- **Tool Execution**: Execute tools directly from Claude Desktop

### Cloud Skill

- **Cloud Sync**: Sync memories and contexts across devices
- **Team Collaboration**: Share contexts with team members
- **Backup & Restore**: Create and restore backups of your data

## Installation

The extension is automatically installed when you install HyperNexus using the installer scripts:

```bash
# Windows (PowerShell)
irm https://hypernexus.site/install.ps1 | iex

# macOS / Linux
curl -fsSL https://hypernexus.site/install.sh | bash

# npm
npx @hypernexus/install
```

## Configuration

The extension is configured through the Claude Desktop configuration file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

Example configuration:

```json
{
  "mcpServers": {
    "hypernexus": {
      "command": "hypernexus",
      "args": ["mcp"],
      "env": {
        "HN_EDITION": "corporate",
        "HN_CLOUD_ENDPOINT": "https://cloud.hypernexus.site",
        "HN_UPDATE_URL": "https://releases.hypernexus.site/latest/version.json"
      }
    }
  }
}
```

## Usage

Once installed, the extension provides the following commands in Claude Desktop:

### Memory Commands

- `memory_save`: Save a memory to persistent storage
- `memory_search`: Search memories by query
- `memory_list`: List all memories

### Tool Commands

- `tool_list`: List all available tools
- `tool_execute`: Execute a tool with parameters

### Cloud Commands

- `cloud_sync`: Sync local data with cloud
- `cloud_share`: Share context with team members
- `cloud_backup`: Create a backup of local data

## Auto-Updates

The extension includes an auto-updater that checks for updates daily. You can also manually check for updates:

```bash
hypernexus-update --check
```

## Pricing

- **Community Edition**: Free (local binary, open source)
- **Professional Edition**: $50/seat/year (local license + cloud hosting)

## Links

- [Website](https://hypernexus.site)
- [Cloud Dashboard](https://cloud.hypernexus.site)
- [GitHub](https://github.com/HyperNexusLLC/HyperNexus)
- [GitLab](https://gitlab.com/HyperNexusLLC/HyperNexus)

## Support

For support, please visit:

- [Documentation](https://hypernexus.site/docs)
- [Discord](https://discord.gg/hypernexus)
- [Email](mailto:support@hypernexus.site)
