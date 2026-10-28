# HyperNexus x Maki

Native meta/muse-spark-1.3-contributor via pi OAuth subscription plus full HyperNexus integration (MCP server, skills where the harness supports personal skill dirs, hooks where supported).

- Config: `%APPDATA%/maki/providers.toml`
- Install: `node install.mjs` · verify: `node install.mjs --check` · remove: `node install.mjs --uninstall`
- Notes: Routes through the HN kernel (hypernexus serve must run); key via META_MUSE_API_KEY.
- Token policy: keys are read live from `~/.pi/agent/auth.json` (pi owns refresh); nothing secret is stored here.
