# HyperNexus x Muse Code

Native meta/muse-spark-1.3-contributor via pi OAuth subscription plus full HyperNexus native plugin (Muse Code 1.4.14).

- Config: `~/.config/muse/settings.json` (`provider: meta`, `model: muse-spark-1.3-contributor`)
- Plugin bundle: `plugin/hypernexus/` (`.muse-plugin/plugin.json`, native manifest)
- Install: `node install.mjs` · verify: `node install.mjs --check` · remove: `node install.mjs --uninstall`
- Model env: `.\use-meta-model.ps1` (mints live `META_API_KEY` for the shell)
- Battery: `node bin/test-muse-code-ext.mjs`

## What the bundle carries (all 5 supported families attempted, 4 validate clean)

| Family | Contents |
|---|---|
| skills (3) | hypernexus, hypernexus-ops, hypernexus-workflows (`muse skills validate`: valid, no diagnostics) |
| commands (11) | hn-status/store/search/tools/session/context/plan/summary/remember/restore/purge |
| hooks (5) | SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop → `hooks/scripts/hn-*.mjs` (fire-and-forget kernel logging, exit 0, stdin-JSON, 3s budgets) |
| mcpServers (1) | `hypernexus` stdio via `mcp/hn-mcp.mjs` → `bin/hypernexus.exe mcp` (initialize + tools/list verified live) |
| reminders | duty file `reminders/hypernexus-recall.md` SHIPS but is not referenced: Muse Code 1.4.14 rejects every `memoryEvidence` source shape including its own shipped example (10 probe shapes tried) — re-probe after a muse upgrade |

`agents`/`tools`/`outputStyles`/`settings` are rejected by the muse validator by design (not attempted).

## Token policy

OAuth stays in pi auth.json. `bin/meta-muse-key.mjs` replays pi's mint
(`POST https://api.meta.ai/muse-code/key`, stdout only) — `muse-spark-1.3-contributor`
at `https://api.meta.ai/v1`. `META_API_KEY` always takes priority over account
login; pi owns refresh (401/403 = `/login meta` in pi). Nothing secret is
stored, printed, or committed — `--check` prints key-hidden confirmation only.

## Activation (verified live)

- Skills: `hypernexus`, `hypernexus-ops`, `hypernexus-workflows` installed
  user-scope (`muse skills list` shows `activation: on`, zero diagnostics).
- MCP: `mcpServers.hypernexus` stdio entry in settings.json; `muse exec` drove
  `system_status` through it and returned the live kernel version.
- Model: `muse exec` answers on meta/muse-spark-1.3-contributor, workspace trusted.

## Known product blockers (Muse Code 1.4.14, this box)

- `muse plugins install` fails deterministically with `plugin-store-write-failed`
  (os error 32) for ANY capability-bearing bundle (proven with a 1-skill probe;
  the failing `package` file never even appears — manual writes to the exact
  path work, no locker process exists). The bundle is validator-clean, commands
  (11) and hooks (5) ship ready, but load only after a muse upgrade fixes the
  store — trust/approve (`muse plugins approve hypernexus`) is your action anyway.
- Kernel FTS lags fresh writes under load (verified 200-persisted writes read
  back 0 until index catches up) — hooks are ACK-verified, not read-back gated.

## Binary
`muse` = `C:\Users\hyper\AppData\Local\Programs\muse\muse.cmd` (Meta distribution, not npm, not on PATH by default). Headless: `muse.cmd exec "<prompt>"`. Verified live: MUSE-CODE-OK (meta/muse-spark-1.3-contributor) + MUSE-MCP-OK (hypernexus MCP system_status via native MCP client). MCP OAuth (if needed): `muse mcp login hypernexus`.
