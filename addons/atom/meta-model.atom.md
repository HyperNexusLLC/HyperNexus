# Meta model for AtomCode

Provider `meta`, model `muse-spark-1.3-contributor`.
OAuth subscription lives in pi (`~/.pi/agent/auth.json`); this harness consumes it via env/key reference.

## Mint a key (pi owns refresh, nothing stored)

```powershell
node addons/atom/bin/meta-muse-key.mjs          # prints minted key to stdout only
node addons/atom/bin/meta-muse-key.mjs --check  # verify mint works (no key printed)
node addons/atom/bin/meta-muse-key.mjs --doctor # diagnose reauth-vs-mint failures
node addons/atom/bin/meta-muse-key.mjs --help   # usage
```

The shim delegates to the canonical minter
(`addons/shared/bin/meta-muse-key.mjs`): it reads the identity token from
`~/.pi/agent/auth.json` (`meta.refresh`) and mints a short-lived Model API key
per call. Set the result into the current shell only:

```powershell
$env:META_API_KEY = "$(node addons/atom/bin/meta-muse-key.mjs)"
```

Env overrides: `META_AUTH_PATH`, `META_KEY_MINT_URL` (see `--help`).

## Wiring

- `install.mjs` writes `~/.atomcode/config.toml` (only when missing) with a
  `[providers.meta]` block: `type = "openai-compatible"`,
  `model = "muse-spark-1.3-contributor"`, `api_key = "${META_API_KEY}"`
  (union key), `base_url = "http://127.0.0.1:7778/v1"` (kernel proxy). It
  also registers the kernel stdio MCP server in `~/.atomcode/mcp.json`
  (kernel exe + workspace root resolved dynamically: `HYPERNEXUS_BIN` >
  `<repo>/bin/` > `~/.hypernexus/bin/` > `PATH`) and copies 4 skills from
  `plugins/hypernexus/skills/`.
- `use-meta-model.ps1` best-effort mints `META_API_KEY` into the process
  environment via the shim, then runs install + check. Mint needs a live pi
  login (`/login meta` in pi); without it the script warns and continues with
  MCP/skills wiring only.
- `mcp.json` is a portable sample (command `hypernexus` resolved via `PATH`,
  `<absolute-path-to-repo>` placeholder for the workspace root).
- Hooks: AtomCode has no hook API — hooks are not registered. `/hn-*`
  commands are consumed MCP-only via the `hypernexus` server (no command
  loader); verify manually with `node bin/test-atom-ext.mjs`.

## Verify

```powershell
node addons/atom/install.mjs --check
node addons/atom/bin/test-atom-ext.mjs
```
