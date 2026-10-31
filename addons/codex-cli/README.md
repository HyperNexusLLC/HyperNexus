# HyperNexus x Codex CLI

Native meta/muse-spark-1.3-contributor via pi OAuth subscription plus full HyperNexus integration (MCP server, skills where the harness supports personal skill dirs, hooks where supported).

- Config: `~/.codex/config.toml`
- Install: `node install.mjs` · verify: `node install.mjs --check` · remove: `node install.mjs --uninstall`
- Key: `MODEL_API_KEY` env, minted live per run via `bin/meta-muse-key.mjs` (thin shim over the canonical shared minter; pi owns refresh).
- Token policy: keys are minted live from `~/.pi/agent/auth.json` (pi owns refresh); nothing secret is stored here.
- Sample MCP config: `mcp.json` (portable: `hypernexus` on `PATH`, `<absolute-path-to-repo>` placeholder).
