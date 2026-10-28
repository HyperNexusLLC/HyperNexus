# HyperNexus x AtomCode

Native meta/muse-spark-1.3-contributor via pi OAuth subscription plus full HyperNexus integration (MCP server, skills where the harness supports personal skill dirs, hooks where supported).

- Config: `~/.atomcode/config.toml`
- Install: `node install.mjs` · verify: `node install.mjs --check` · remove: `node install.mjs --uninstall`
- Notes: Direct binary if npm launcher hangs; 'atomcode mcp add' also works.
- Token policy: keys are read live from `~/.pi/agent/auth.json` (pi owns refresh); nothing secret is stored here.
