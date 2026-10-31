# Meta model for Copilot CLI

Provider `meta`, model `muse-spark-1.3-contributor`, endpoint `https://api.meta.ai/v1`.
OAuth subscription lives in pi (`~/.pi/agent/auth.json`); this harness consumes it via env/key reference.

## Mint a key (pi owns refresh, nothing stored)

```powershell
node addons/copilot-cli/bin/meta-muse-key.mjs          # prints minted key to stdout only
node addons/copilot-cli/bin/meta-muse-key.mjs --check  # verify mint works (no key printed)
node addons/copilot-cli/bin/meta-muse-key.mjs --doctor # diagnose reauth-vs-mint failures
node addons/copilot-cli/bin/meta-muse-key.mjs --help   # usage
```

The shim delegates to the canonical minter
(`addons/shared/bin/meta-muse-key.mjs`): it reads the identity token from
`~/.pi/agent/auth.json` (`meta.refresh`) and mints a short-lived Model API key
per call. Set the result into the current shell only:

```powershell
$env:META_MUSE_API_KEY = "$(node addons/copilot-cli/bin/meta-muse-key.mjs)"
```

Env overrides: `META_AUTH_PATH`, `META_KEY_MINT_URL` (see `--help`).

## Wiring

- `install.mjs` registers the kernel stdio MCP server in
  `~/.copilot/mcp-config.json` (kernel exe + workspace root resolved
  dynamically: `HYPERNEXUS_BIN` > `<repo>/bin/` > `~/.hypernexus/bin/` > `PATH`)
  and copies the three `hypernexus*` skills from
  `addons/copilot/plugin/hypernexus/skills/`.
- `use-meta-model.ps1` best-effort mints `META_MUSE_API_KEY` into the process
  environment via the shim, then runs install + check. Mint needs a live pi
  login (`/login meta` in pi); without it the script warns and continues with
  MCP/skills wiring only.

Note: Copilot CLI login itself is interactive (`copilot login --device-code`)
and Copilot models are GitHub-side; the Meta provider above is opt-in.
