# HyperNexus Plugin for Claude Code

AI control plane: persistent multi-tier memory (L1/L2/L3), semantic MCP tool
discovery, knowledge graph, kernel ops, and cross-harness session continuity —
backed by the local HyperNexus Go kernel (`http://127.0.0.1:7778`).

- **Commands** — `/hn-status`, `/hn-store`, `/hn-search`, `/hn-tools`,
  `/hn-session`, `/hn-context`, `/hn-summary`, `/hn-purge` (see `commands/`)
- **Skills** — `hypernexus`, `hypernexus-ops`, `hypernexus-workflows` (see `skills/`)
- **Agent** — `hypernexus-orchestrator` (see `agents/`)
- **Hooks** — session-activity logging to the kernel (see `hooks/`,
  `hooks/scripts/hn-log.mjs`)
- **MCP server** — `hypernexus` stdio via `bin/hypernexus.exe mcp`
  (see `.mcp.json`, filled with absolute paths by `install.mjs`)

Docs: [hypernexus.site](https://hypernexus.site). Installer and Meta-model
launcher live one level up (`install.mjs`, `use-meta-model.ps1`, `README.md`).
