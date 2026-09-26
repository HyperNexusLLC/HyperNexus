# HyperNexus - Universal AI Control Plane

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://hypernexus.site)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-blue)](https://code.visualstudio.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Persistent memory, MCP tool routing, and cross-client context sharing for all AI tools.**

## Features

- 🧠 **Persistent Memory** - Remember context across sessions
- 🔧 **MCP Tool Routing** - Progressive tool injection (90%+ token savings)
- 🔄 **Cross-Client Sync** - Share context between Claude, Cursor, Copilot, etc.
- 🌊 **LLM Waterfall** - Automatic failover (OpenAI → OpenRouter → Ollama)
- 🤖 **Multi-Agent Swarms** - Planner, Implementer, Tester, Critic patterns

## Installation

```bash
# Install HyperNexus
irm https://hypernexus.site/install.ps1 | iex

# Or install extension manually
code --install-extension hypernexus.hypernexus
```

## Commands

| Command | Description |
|---------|-------------|
| `HyperNexus: Connect to Server` | Connect to HyperNexus MCP server |
| `HyperNexus: Save Memory` | Save selection or file as memory |
| `HyperNexus: Search Memory` | Search and insert memories |
| `HyperNexus: Show Status` | Show connection status |
| `HyperNexus: Open Dashboard` | Open HyperNexus dashboard |

## Configuration

```json
{
  "hypernexus.serverUrl": "http://localhost:8080/mcp",
  "hypernexus.autoConnect": true,
  "hypernexus.enableMemory": true,
  "hypernexus.enableToolRouting": true
}
```

## MCP Integration

This extension automatically configures MCP for:

- Cline
- Roo Code
- Continue
- Gemini CLI Companion
- Gemini Code Assist
- Codex
- GitHub Copilot

## Links

- [HyperNexus Website](https://hypernexus.site)
- [Documentation](https://hypernexus.site/docs)
- [GitHub](https://github.com/HyperNexusLLC/HyperNexus)
- [Discord](https://discord.gg/Hj9P3GbVxR)

## License

MIT © HyperNexus LLC
