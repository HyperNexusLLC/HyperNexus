# HyperNexus x harness2 (google-research)

Native meta/muse-spark-1.3-contributor via pi OAuth subscription plus full HyperNexus integration (MCP server, skills where the harness supports personal skill dirs, hooks where supported).

- Config: `HARNESS2_* env vars`
- Install: `node install.mjs` · verify: `node install.mjs --check` · remove: `node install.mjs --uninstall`
- Notes: Needs ~/workspace/harness2 + 'harness2-setup jb'.
- Token policy: the judge key is minted live from `~/.pi/agent/auth.json` via `bin/meta-muse-key.mjs` into `META_API_KEY`/`HARNESS2_JUDGE_API_KEY` (pi owns refresh; process env only, never setx/stored — `.meta.access` is short-lived and must not be copied); see `meta-model.harness2.md`.
- MCP/hooks: harness2 has no MCP/skill/command/hook runtime — kernel over HTTP proxy + `mcp.json` sample for bridges; hooks are not registered. Verify manually: `node bin/test-harness2-ext.mjs`.
