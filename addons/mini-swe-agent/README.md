# mini-swe-agent HyperNexus integration

Routes mini-swe-agent through the HyperNexus kernel (Go, `http://127.0.0.1:7778`)
with Meta `muse-spark-1.3-contributor`.

## What you get

| Surface | Mechanism | Detail |
|---|---|---|
| **Model** | global `.env` (dotenv-loaded) | `MSWEA_MODEL_NAME=openai/muse-spark-1.3-contributor` + `OPENAI_API_BASE=http://127.0.0.1:7778/v1` |
| **Meta OAuth** | live read from pi | `install.mjs` mints from `~/.pi/agent/auth.json` (`meta.refresh` → `https://api.meta.ai/muse-code/key`); pi owns refresh, re-run install after pi re-login |
| **MCP server** | `mcp.json` | `mcpServers.hypernexus` stdio via `bin/hypernexus.exe mcp` |
| **Skills** | `skills/` (9) | hypernexus, hypernexus-agents, hypernexus-l2, hypernexus-mcp-routing, hypernexus-memory, hypernexus-ops, hypernexus-sessions, hypernexus-status-billing, hypernexus-workflows |
| **Hooks** | `hooks/hooks.json` + `hypernexus-hook.mjs` | 8 lifecycle events, fail-open, budgeted |
| **Commands** | `commands/` (16 `hn-*.md`) | status/store/search/session/context/summary/tools/plan/purge/remember/restore + plugin variants |
| **Plugin manifest** | `config/hypernexus.plugin.json` | points at `../skills/*`, `../hooks/hooks.json`, `../mcp.json` |
| **Headless check** | `scripts/mini-swe-agent-meta-test.py` | model bypass probe |

## Install

```powershell
node addons/mini-swe-agent/install.mjs            # writes %LOCALAPPDATA%/mini-swe-agent/mini-swe-agent/.env
node addons/mini-swe-agent/install.mjs --check    # verify model + endpoint
.\addons\mini-swe-agent\use-meta-model.ps1           # mint fresh key + refresh .env + check
```

## Tests

```powershell
python addons/mini-swe-agent/tests/test_miniswe_ext.py
```

## Notes

- `.env` holds a live-minted key copy (dotenv cannot reference env vars); refresh with `install.mjs` after pi re-login.
- Kernel down ⇒ calls fail fast with a clear error, never fiction (degradation contract).
