# HyperNexus x Maki

Native meta/muse-spark-1.3-contributor via pi OAuth subscription plus full HyperNexus integration (MCP server, skills where the harness supports personal skill dirs, hooks where supported).

- Config: `%APPDATA%/maki/` (extension tree) + project `.maki/` — never `providers.toml` (maki-owned live store)
- Install: `node install.mjs` (syncs `extensions/maki-hypernexus/` tree to both scopes) · verify: `node install.mjs --check` · remove: `node install.mjs --uninstall`
- Notes: Routes through the HN kernel (hypernexus serve must run); key via META_MUSE_API_KEY.
- Token policy: keys are read live from `~/.pi/agent/auth.json` (pi owns refresh); nothing secret is stored here. Full wiring: `meta-model.maki.md` (`bin/meta-muse-key.mjs --check` to verify; primary auth is the native device-code flow in `lua/meta_oauth.lua`).

- Dual-model: META_MODEL env (default muse-spark-1.3-contributor, opt-in muse-wonder-1.0-contributor).
