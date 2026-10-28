# HyperNexus x Codex CLI

Native meta/muse-spark-1.3-contributor via pi OAuth subscription plus full HyperNexus integration (MCP server, skills where the harness supports personal skill dirs, hooks where supported).

- Config: `~/.codex/config.toml`
- Install: `node install.mjs` · verify: `node install.mjs --check` · remove: `node install.mjs --uninstall`
- Notes: Key via MODEL_API_KEY env (synced from pi).
- Token policy: keys are read live from `~/.pi/agent/auth.json` (pi owns refresh); nothing secret is stored here.
