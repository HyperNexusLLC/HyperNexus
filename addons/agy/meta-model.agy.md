# Meta model for agy

Provider `meta`, model `muse-spark-1.3-contributor`.
OAuth subscription lives in pi (`~/.pi/agent/auth.json`); this harness consumes it via env/key reference.

agy models need interactive agy sign-in; the Meta path below is opt-in for
bridges that accept an env key.

## Mint a key (pi owns refresh, nothing stored)

```powershell
node addons/agy/bin/meta-muse-key.mjs          # prints minted key to stdout only
node addons/agy/bin/meta-muse-key.mjs --check  # verify mint works (no key printed)
node addons/agy/bin/meta-muse-key.mjs --doctor # diagnose reauth-vs-mint failures
node addons/agy/bin/meta-muse-key.mjs --help   # usage
```

The shim delegates to the canonical minter
(`addons/shared/bin/meta-muse-key.mjs`): it reads the identity token from
`~/.pi/agent/auth.json` (`meta.refresh`) and mints a short-lived Model API key
per call. Set the result into the current shell only:

```powershell
$env:META_API_KEY = "$(node addons/agy/bin/meta-muse-key.mjs)"
```

Env overrides: `META_AUTH_PATH`, `META_KEY_MINT_URL` (see `--help`).

## Wiring

- `install.mjs` registers the kernel stdio MCP server via `agy mcp add`
  (kernel exe + workspace root resolved dynamically: `HYPERNEXUS_BIN` >
  `<repo>/bin/` > `~/.hypernexus/bin/` > `PATH`; `HYPERNEXUS_URL` env
  overrides the kernel URL).
- `use-meta-model.ps1` best-effort mints `META_API_KEY` (union key) into the
  process environment via the shim, then runs install + check. Mint needs a
  live pi login (`/login meta` in pi); without it the script warns and
  continues with MCP wiring only.
- `mcp.json` is a portable sample (command `hypernexus` resolved via `PATH`,
  `<absolute-path-to-repo>` placeholder for the workspace root).
- Hooks: agy has no hook API — hooks are not registered. Skills and `/hn-*`
  commands are MCP-only via the `hypernexus` server (no skill/command
  loader); verify manually with `node bin/test-agy-ext.mjs`.

## Verify

```powershell
node addons/agy/install.mjs --check
node addons/agy/bin/test-agy-ext.mjs
```
