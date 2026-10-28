# HyperNexus x Copilot CLI

Native meta/muse-spark-1.3-contributor via pi OAuth subscription plus full HyperNexus integration (MCP server, skills where the harness supports personal skill dirs, hooks where supported).

- Config: `~/.copilot/mcp-config.json`
- Install: `node install.mjs` · verify: `node install.mjs --check` · remove: `node install.mjs --uninstall`
- Notes: Login is interactive: 'copilot login --device-code'. Models are GitHub-side.
- Token policy: keys are read live from `~/.pi/agent/auth.json` (pi owns refresh); nothing secret is stored here.
