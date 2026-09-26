# HyperNexus Quick Start Guide

Get up and running with HyperNexus in 5 minutes.

## What is HyperNexus?

HyperNexus is a local-first AI control plane that connects Claude, GPT, Gemini, and local models through a unified interface. It provides:

- **MCP Tool Routing** — Progressive tool injection across 60+ MCP servers
- **Persistent Memory** — L1/L2 semantic storage that survives across sessions
- **Multi-Agent Swarm** — A2A protocol coordination with role rotation
- **Provider Waterfall** — Auto-failover between LLM providers

## Installation

### Windows
```powershell
irm https://hypernexus.site/install.ps1 | iex
```

### macOS / Linux
```bash
curl -fsSL https://hypernexus.site/install.sh | bash
```

### From Source
```bash
git clone https://gitlab.com/HyperNexusLLC/HyperNexus.git
cd HyperNexus
cd go && go build -o ../bin/hypernexus ./cmd/tormentnexus
cd ../apps/web && pnpm install && pnpm run build
```

## Start the Services

```bash
# Start Go kernel (port 7778)
bin/hypernexus serve --port 7778

# Start Dashboard (port 7779) — in another terminal
cd apps/web && pnpm start
```

Open [http://localhost:7779/dashboard](http://localhost:7779/dashboard)

## Configure MCP Servers

Edit `mcp.jsonc` in the project root:

```jsonc
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "my-mcp-server"],
      "env": {}
    }
  }
}
```

Restart the kernel to pick up changes.

## Connect an AI Client

### MiMoCode
Add to `~/.config/mimocode/mimocode.jsonc`:
```jsonc
{
  "mcp": {
    "hypernexus": {
      "type": "local",
      "command": ["path/to/hypernexus", "mcp"]
    }
  }
}
```

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "hypernexus": {
      "command": "path/to/hypernexus",
      "args": ["mcp"]
    }
  }
}
```

### Cursor / Windsurf
Add to `.cursor/mcp.json` or `.windsurf/mcp.json`:
```json
{
  "mcpServers": {
    "hypernexus": {
      "command": "path/to/hypernexus",
      "args": ["mcp"]
    }
  }
}
```

## API Access

```bash
# Health check
curl http://localhost:7778/health

# Search memory
curl "http://localhost:7778/api/memory/search?query=my+search"

# List MCP tools
curl http://localhost:7778/api/mcp/tools

# Write endpoint (requires API key)
curl -X POST http://localhost:7778/api/config/upsert \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"key":"test","value":"test"}'
```

See [API_ENDPOINTS.md](API_ENDPOINTS.md) for the full API reference.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 7778 in use | `lsof -i :7778` to find and kill the process |
| MCP server not connecting | Check `mcp.jsonc` syntax and server command |
| Dashboard blank | Run `pnpm run build` in `apps/web/` |
| Memory not persisting | Check `.hypernexus/` directory permissions |

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Check [API_ENDPOINTS.md](API_ENDPOINTS.md) for full API reference
- Join the [Discord](https://discord.gg/Hj9P3GbVxR) for support

---

*Praise the LORD! Keep on going! Don't ever stop!*
