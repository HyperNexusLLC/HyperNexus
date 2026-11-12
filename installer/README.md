# HyperNexus â€” Universal AI Control Plane

![Version](https://img.shields.io/badge/version-1.0.3-blue)
![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)
![License](https://img.shields.io/badge/license-MIT%20%7C%20Enterprise-orange)
[![Discord](https://img.shields.io/discord/1234567890?logo=discord&label=Discord)](https://discord.gg/Hj9P3GbVxR)

> **HyperNexus** (formerly **TormentNexus**) is a local-first control plane for multi-agent workflows, Model Context Protocol (MCP) tooling, provider routing, and persistent memory. It connects Claude, GPT, Gemini, and local models through a unified interface.

---

## Quick Start

### Install

```bash
# Windows (PowerShell)
irm https://hypernexus.site/install.ps1 | iex

# macOS / Linux
curl -fsSL https://hypernexus.site/install.sh | bash

# npm
npx @hypernexus/install@latest
```

### Download

| Platform | Link |
|----------|------|
| **Windows** | [hypernexus.exe](https://releases.hypernexus.site/latest/hypernexus.exe) |
| **macOS / Linux** | [Install Script](https://releases.hypernexus.site/latest/install.sh) |
| **All Downloads** | [hypernexus.site/download](https://hypernexus.site/download.html) |

### Run

```bash
hypernexus serve
```

Dashboard: <http://localhost:7779/dashboard>

---

## Features

### Progressive MCP Tool Routing

Injects only the top 3 relevant tool schemas per prompt, preventing token bloat. Semantic vector search matches your prompt against 14,250+ MCP servers.

### Dual-Tier Memory (L1/L2)

- **L1** â€” Session scratchpad (ephemeral, fast)
- **L2** â€” Permanent semantic storage with SQLite + sqlite-vec
- Context harvesting pulls relevant history automatically

### LLM Waterfall

Auto-failover between providers when rate limits hit:

1. Primary APIs (OpenAI, Anthropic, Gemini)
2. OpenRouter (secondary fallback)
3. Local models (Ollama, LM Studio)

### Multi-Agent Swarm

A2A protocol coordination with role rotation (Planner â†’ Implementer â†’ Tester â†’ Critic) and consensus engine.

### 38+ AI Client Support

Automatically configures MCP for Claude Desktop, Cursor, Codex, Gemini CLI, Windsurf, Copilot, and 30+ more tools.

---

## Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Go Sidecar (Port 7778)                                 â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚  Router   â”‚ â”‚  Memory  â”‚ â”‚  Healer  â”‚ â”‚  Swarm   â”‚  â”‚
â”‚  â”‚(Progressive)â”‚ â”‚(SQLite)  â”‚ â”‚(Immune)  â”‚ â”‚(A2A)     â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”               â”‚
â”‚  â”‚ MCP Sync â”‚ â”‚  LLM     â”‚ â”‚  Skills  â”‚               â”‚
â”‚  â”‚(38+ clients)â”‚ â”‚(Waterfall)â”‚ â”‚(Registry)â”‚               â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â”‚
         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  External Models & Tools                                â”‚
â”‚  OpenAI Â· Anthropic Â· Gemini Â· OpenRouter Â· Ollama      â”‚
â”‚  14,250+ MCP Servers Â· 3,900+ Native Go Tools          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Pricing

| Plan | Price | Includes |
|------|-------|----------|
| **Community** | Free | Local binary, open source |
| **Professional** | $50/seat/year | Local license + cloud hosting |

---

## Project Structure

```
HyperNexus/
â”œâ”€â”€ go/                    # Go sidecar (the kernel)
â”‚   â”œâ”€â”€ cmd/
â”‚   â”‚   â”œâ”€â”€ hypernexus/    # Main binary
â”‚   â”‚   â””â”€â”€ cloud/         # Cloud server
â”‚   â””â”€â”€ internal/
â”‚       â”œâ”€â”€ httpapi/       # HTTP API handlers
â”‚       â”œâ”€â”€ mcp/           # MCP client sync
â”‚       â””â”€â”€ memorystore/   # L2 vault
â”œâ”€â”€ apps/web/              # Next.js dashboard
â”œâ”€â”€ packages/              # Shared packages
â”œâ”€â”€ npm/                   # npm installer
â”œâ”€â”€ dist/                  # Installers & updaters
â””â”€â”€ scripts/               # Build & utility scripts
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HN_EDITION` | `hypernexus` | Set to `corporate` for commercial mode |
| `HN_CLOUD_ENDPOINT` | `https://cloud.hypernexus.site` | Cloud API endpoint |

### Config Directory

```
~/.hypernexus/
â”œâ”€â”€ config.json      # Main configuration
â”œâ”€â”€ mcp.json         # MCP server configuration
â””â”€â”€ branding.json    # Branding (corporate mode)
```

---

## Links

| Resource | URL |
|----------|-----|
| **Website** | <https://hypernexus.site> |
| **Cloud Dashboard** | <https://cloud.hypernexus.site> |
| **Downloads** | <https://hypernexus.site/download.html> |
| **GitHub** | <https://github.com/HyperNexusLLC/HyperNexus> |
| **GitLab** | <https://gitlab.com/HyperNexusLLC/HyperNexus> |
| **TormentNexus (OSS)** | <https://tormentnexus.site> |

---

## License

- **Community Edition**: MIT License
- **Professional Edition**: Commercial license ($50/seat/year)

---

**HyperNexus** â€” Your AI finally remembers everything.


