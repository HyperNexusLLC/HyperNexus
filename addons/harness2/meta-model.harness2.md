# Meta model for harness2 (google-research)

Provider `meta`, model `muse-spark-1.3-contributor`.
OAuth subscription lives in pi (`~/.pi/agent/auth.json`); this harness consumes it via env/key reference.

## Mint a key (pi owns refresh, nothing stored)

```powershell
node addons/harness2/bin/meta-muse-key.mjs          # prints minted key to stdout only
node addons/harness2/bin/meta-muse-key.mjs --check  # verify mint works (no key printed)
node addons/harness2/bin/meta-muse-key.mjs --doctor # diagnose reauth-vs-mint failures
node addons/harness2/bin/meta-muse-key.mjs --help   # usage
```

The shim delegates to the canonical minter
(`addons/shared/bin/meta-muse-key.mjs`): it reads the identity token from
`~/.pi/agent/auth.json` (`meta.refresh`) and mints a short-lived Model API key
per call. Set the result into the current shell only:

```powershell
$env:META_API_KEY = "$(node addons/harness2/bin/meta-muse-key.mjs)"
$env:HARNESS2_JUDGE_API_KEY = $env:META_API_KEY
```

Env overrides: `META_AUTH_PATH`, `META_KEY_MINT_URL` (see `--help`).

Do NOT copy `~/.pi/agent/auth.json` `.meta.access` into env: it is a
short-lived token (minutes). Always mint via the shim above.

## Wiring

- `install.mjs` persists the solver/improver/codex/judge model env
  (`HARNESS2_SOLVER_MODEL`, `HARNESS2_IMPROVER_MODEL`,
  `HARNESS2_CODEX_MODEL`, `HARNESS2_JUDGE_MODEL` =
  `meta/muse-spark-1.3-contributor`, judge via kernel proxy
  `HARNESS2_JUDGE_BASE_URL=http://127.0.0.1:7778/v1`) and mints
  `HARNESS2_JUDGE_API_KEY` live into the process env (never setx — the key
  is short-lived).
- `use-meta-model.ps1` best-effort mints `META_API_KEY` (union key) into the
  process environment via the shim, then runs install + check. Mint needs a
  live pi login (`/login meta` in pi); without it the script warns and
  continues with model-env wiring only.
- `mcp.json` is the portable stdio MCP sample for bridges that can host one
  (`hypernexus` on `PATH`, `<absolute-path-to-repo>` placeholder); harness2
  itself has no MCP runtime and consumes the kernel over HTTP.
- Hooks: harness2 has no hook API — hooks are not registered. Skills and
  `/hn-*` commands are consumed via the kernel HTTP API (no skill/command
  loader); verify manually with `node bin/test-harness2-ext.mjs`.

## Verify

```powershell
node addons/harness2/install.mjs --check
node addons/harness2/bin/test-harness2-ext.mjs
```
