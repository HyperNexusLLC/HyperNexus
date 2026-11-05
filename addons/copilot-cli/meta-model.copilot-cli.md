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
$env:META_API_KEY = "$(node addons/copilot-cli/bin/meta-muse-key.mjs)"
```

Env overrides: `META_AUTH_PATH`, `META_KEY_MINT_URL` (see `--help`).

## Wiring

- `install.mjs` registers the kernel stdio MCP server in
  `~/.copilot/mcp-config.json` (kernel exe + workspace root resolved
  dynamically: `HYPERNEXUS_BIN` > `<repo>/bin/` > `~/.hypernexus/bin/` > `PATH`)
  and copies the three `hypernexus*` skills from
  `addons/copilot/plugin/hypernexus/skills/`.
- `use-meta-model.ps1` best-effort mints `META_API_KEY` (union key) into the
  process environment via the shim, then runs install + check. Mint needs a
  live pi login (`/login meta` in pi); without it the script warns and
  continues with MCP/skills wiring only.

Note: Copilot CLI login itself is interactive (`copilot login --device-code`)
and Copilot models are GitHub-side; the Meta provider above is opt-in.

## Dual-model (spark default, wonder opt-in)

`use-meta-model.ps1` resolves META_MODEL env: default
meta/muse-spark-1.3-contributor, opt-in meta/muse-wonder-1.0-contributor
(meta/ prefix optional) and exports the resolved short name back into
`$env:META_MODEL` as session intent. The minted `META_API_KEY` is
model-agnostic (pi identity union key); META_MODEL declares which Meta model
the session targets. Copilot-side models stay GitHub-side; the Meta provider
above remains opt-in.