# HyperNexus x agy

Native meta/muse-spark-1.3-contributor via pi OAuth subscription plus full HyperNexus integration (MCP server, skills where the harness supports personal skill dirs, hooks where supported).

- Config: `agy MCP store`
- Install: `node install.mjs` · verify: `node install.mjs --check` · remove: `node install.mjs --uninstall`
- Notes: Models need interactive agy sign-in.
- Token policy: keys are minted live from `~/.pi/agent/auth.json` via `bin/meta-muse-key.mjs` into `META_API_KEY` (union key; pi owns refresh; stdout only, never stored); see `meta-model.agy.md`.
- Skills/commands are MCP-only (agy has no skill/command/hook loader); hooks are not registered. Verify manually: `node bin/test-agy-ext.mjs`.
