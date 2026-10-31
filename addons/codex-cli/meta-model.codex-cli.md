# Meta model for Codex CLI

Provider `meta`, model `muse-spark-1.3-contributor`.
OAuth subscription lives in pi (`~/.pi/agent/auth.json`); this harness consumes it via env/key reference.

## Mint a key (pi owns refresh, nothing stored)

```powershell
node addons/codex-cli/bin/meta-muse-key.mjs          # prints minted key to stdout only
node addons/codex-cli/bin/meta-muse-key.mjs --check  # verify mint works (no key printed)
node addons/codex-cli/bin/meta-muse-key.mjs --doctor # diagnose reauth-vs-mint failures
node addons/codex-cli/bin/meta-muse-key.mjs --help   # usage
```

The shim delegates to the canonical minter
(`addons/shared/bin/meta-muse-key.mjs`): it reads the identity token from
`~/.pi/agent/auth.json` (`meta.refresh`) and mints a short-lived Model API key
per call. Set the result into the current shell only:

```powershell
$env:MODEL_API_KEY = "$(node addons/codex-cli/bin/meta-muse-key.mjs)"
```

Env overrides: `META_AUTH_PATH`, `META_KEY_MINT_URL` (see `--help`).

## Wiring

- `install.mjs` ensures in `~/.codex/config.toml`:
  `model = "muse-spark-1.3-contributor"` + `model_provider = "meta"` plus a
  `[model_providers.meta]` block whose `base_url` is the kernel proxy
  (`http://127.0.0.1:7778/v1`) with `env_key = "MODEL_API_KEY"`, and a
  `[mcp_servers.hypernexus]` block (kernel exe + workspace root resolved
  dynamically: `HYPERNEXUS_BIN` > `<repo>/bin/` > `~/.hypernexus/bin/` > `PATH`;
  `HYPERNEXUS_WORKSPACE_ROOT` env overrides the root). It also installs the
  3 core skills + orchestrator + 8 `hn-*` command-skills and 3 hooks from
  `addons/codex/` (`CODEX_HOME/skills/`, `CODEX_HOME/hooks/`).
- `use-meta-model.ps1` best-effort mints `MODEL_API_KEY` into the process
  environment via the shim, then runs install + check. Mint needs a live pi
  login (`/login meta` in pi); without it the script warns and continues with
  model/MCP/skills wiring only.
- `mcp.json` is a portable sample (command `hypernexus` resolved via `PATH`,
  `<absolute-path-to-repo>` placeholder for the workspace root).

## Verify

```powershell
node addons/codex-cli/install.mjs --check
node addons/codex-cli/bin/test-codex-cli-ext.mjs
```
