# HyperNexus x AtomCode

Native meta/muse-spark-1.3-contributor via pi OAuth subscription plus full HyperNexus integration (MCP server, skills where the harness supports personal skill dirs, hooks where supported).

- Config: `~/.atomcode/config.toml`
- Install: `node install.mjs` · verify: `node install.mjs --check` · remove: `node install.mjs --uninstall`
- Notes: Direct binary if npm launcher hangs; 'atomcode mcp add' also works.
- Token policy: keys are minted live from `~/.pi/agent/auth.json` via `bin/meta-muse-key.mjs` into `META_API_KEY` (union key; pi owns refresh; stdout only, never stored); see `meta-model.atom.md`.
- Hooks: AtomCode has no hook API — hooks are not registered. `/hn-*` commands are MCP-only. Verify manually: `node bin/test-atom-ext.mjs`.
