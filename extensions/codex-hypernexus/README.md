# HyperNexus for Codex (`codex-hypernexus`)

Connects Codex CLI to the HyperNexus AI control plane (Go kernel) via
**MCP stdio** (`hypernexus.exe mcp`) with session lifecycle hooks and a
bundled skill covering memory, tool routing, agent dispatch,
status/billing, and sessions.

> **Port note:** the kernel listens on **`http://127.0.0.1:7778`** — this
> is authoritative. Port **8080 is stale** (no Go listener); the old
> `skills/codex/SKILL.md` `:8080` URL is superseded by this plugin.

## Layout

| Path | Purpose |
|---|---|
| `plugin.json` | Portable manifest (`codex-hypernexus`, pins kernel `1.0.21`); keeps a legacy `tools.mcpServers` stdio entry for compat |
| `mcp/config.toml` | Canonical MCP config: `[mcp_servers.hypernexus]` stdio |
| `mcp-servers.toml` | Same block as a drop-in snippet for `~/.codex/config.toml` |
| `mcp/config.legacy.toml` | Legacy `[mcp.servers.*]` form, documented only — installer never writes it |
| `marketplace.json` | Marketplace manifest (`hypernexus-marketplace` → local `codex-hypernexus`) |
| `hooks/hooks.json` | Stable 5 lifecycle events (`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, matcher `.*`) — previous default, kept for rollback |
| `hooks/hooks.extended.json` | Full set (default): stable 5 plus `PermissionRequest`, `PreCompact`, `PostCompact`, `SubagentStart`, `SubagentStop`, `SessionEnd` (main session only), `Interrupt` |
| `skills/hypernexus/SKILL.md` | stdio-first onboarding + full capability map |
| `skills/hypernexus-ops/SKILL.md` | kernel health, MCP inventory, billing, verify-before/after discipline |
| `skills/hypernexus-workflows/SKILL.md` | MEM-FIRST / DISCOVER / HARVEST / HANDOFF loops + contributor coordination |
| `skills/*/agents/openai.yaml` | Harness-native skill manifests (`$skill` invocation, UI display, implicit-invocation policy); installer syncs whole skill dirs so these ship to `~/.codex/skills/` |
| `scripts/session_start.*` | `POST /api/memory/add` on session start |
| `scripts/user_prompt_submit.*` | `POST /api/memory/user-prompts/capture` per prompt |
| `scripts/pre_tool_use.*` | Pass-through guard |
| `scripts/post_tool_use.*` | `POST /api/memory/tool-context` after tool use |
| `scripts/stop.*` | `POST /api/memory/add` on session end |
| `scripts/install.*` | Registers MCP + skill + plugin, then verifies |

## Install

Windows:

```bat
extensions\codex-hypernexus\scripts\install.bat
```

POSIX:

```sh
sh extensions/codex-hypernexus/scripts/install.sh
```

The installer derives the repo root from its own location, registers the
server with **both** `HYPERNEXUS_WORKSPACE_ROOT` and `HYPERNEXUS_URL`
(`http://127.0.0.1:7778`), copies the skill to
`~/.codex/skills/hypernexus/`, stages the plugin under
`<root>/.codex/marketplace/plugins/codex-hypernexus` (manifest read at
`<root>/.codex/marketplace/.agents/plugins/marketplace.json`; see
`marketplace.json`), and verifies.

Env contract: `HYPERNEXUS_WORKSPACE_ROOT` is **required** (workspace
scope). `HYPERNEXUS_URL` is an **optional override** defaulting to
`http://127.0.0.1:7778` (kernel resolves the port from its lockfile when
unset). Both are shipped so the entry works with and without a running
kernel override.

MCP config form: canonical is `[mcp_servers.hypernexus]` with implied
stdio transport (`mcp/config.toml`). `mcp/config.legacy.toml` documents
the legacy `[mcp.servers.hypernexus]` + `type = "stdio"` form only — the
installer never writes it.

Hooks: `hooks/hooks.json` (stable 5) is the default. To opt into the
extended 12-event set, point your plugin at `hooks/hooks.extended.json`
(same matchers, same `{"continue": true}` output schema; hook scripts
read `PLUGIN_ROOT`/`PLUGIN_DATA` from the environment when Codex sets
them and degrade gracefully when absent). `SessionEnd` fires for the main
session only; `PermissionRequest` and `Interrupt` are pass-through and
never block.

Manual equivalent:

```bash
codex mcp add hypernexus \
  --env HYPERNEXUS_WORKSPACE_ROOT="<root>" \
  --env HYPERNEXUS_URL="http://127.0.0.1:7778" \
  -- "<root>/bin/hypernexus.exe" mcp
```

## Verify

```bash
codex mcp list     # hypernexus ... enabled
codex mcp get hypernexus
```

Then inside Codex run `/mcp` — `hypernexus` tools should be listed — and
confirm the kernel answers:

```bash
curl http://127.0.0.1:7778/health
```

## What Codex gets

- **Memory:** L2 facts/search/scratchpad, agent memory + handoff, session
  bootstrap + summaries (`/api/memory/*`, `/api/agent-memory/*`)
- **MCP routing:** list servers/tools, `mcp_call_tool` fan-out, status
  (`/api/mcp/*`, `POST /api/agent/tool`)
- **Agent dispatch:** chat, swarm, A2A broadcast, supervisor/director,
  workflows (`/api/agent/*`, `/api/workflows/*`)
- **Status/billing:** health, system overview, quotas, cost history,
  Stripe plans/subscription (`/health`, `/api/system/status`,
  `/api/billing/*`)
- **Sessions:** list/summary/context, supervised sessions, imported
  sessions (`/api/sessions/*`)
