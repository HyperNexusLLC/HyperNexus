# pi-hypernexus — HyperNexus companion extension for Pi

Installable companion to `addons/pi/hypernexus.ts` (the full bridge).
Kernel baseline: Go kernel `http://127.0.0.1:7778` (port 7778 authoritative).

## Contents

| Path | What |
|---|---|
| `pi-hypernexus.ts` | Extension entry: MCP stdio registration, hooks, 8 tools, 5 commands, 2 flags, 1 shortcut, status bar |
| `skills/hypernexus-memory/` | Store/recall/`@memory:` skill |
| `skills/hypernexus-l2/` | L2 vault + L3 archive skill |
| `skills/hypernexus-mcp-routing/` | MCP routing skill |
| `skills/hypernexus-agents/` | Agent dispatch skill |
| `skills/hypernexus-status-billing/` | Status + billing skill |
| `skills/hypernexus-sessions/` | Session lifecycle skill |
| `skills/hypernexus-ops/` | Ops + smoke tests skill |
| `skills/hypernexus-workflows/` | Workflows skill |
| `mcp.json` | MCP server config (stdio to `bin/hypernexus.exe mcp`) |

## Capability coverage

- **Tools**: `hn_memory_store/search`, `hn_mcp_call`, `hn_system_status`,
  `hn_billing_status`, `hn_session_list`, `hn_agent_dispatch`, `hn_workflow_status`
- **Hooks/events**: session start/shutdown, before_agent_start, context,
  tool_call (guard + record), tool_result, user_bash (audit), model_select,
  input (`@memory:`), turn_end, compaction — all logging to
  `POST /api/memory/facts/add` with tags arrays
- **Commands**: `/hn-status`, `/hn-remember`, `/hn-recall`, `/hn-dispatch`, `/hn-workflow`
- **MCP config**: stdio `bin/hypernexus.exe mcp` with `HYPERNEXUS_WORKSPACE_ROOT` + `HYPERNEXUS_URL`
- **Skills**: 8 skills via `resources_discover` (memory, L2, routing, dispatch, status/billing, sessions, ops, workflows)
- **Reminders/agents**: pi exposes no native reminder/agent API; the portable
  equivalent is L2 task facts (`agent:dispatch` tags) — see `hypernexus-agents`

## Model (Meta, env reference only)

This package never reads `auth.json`, token files, or secret values.
Wire Meta `muse-spark-1.3-contributor` by env reference; the user runs:

```powershell
pi --provider meta --model meta/muse-spark-1.3-contributor -e C:/Users/hyper/workspace/HyperNexus/extensions/pi-hypernexus/pi-hypernexus.ts
```

(Verify presence only: check that the provider env var name is set — never print its value.)

## Validate

```powershell
pi --no-session --print "hn smoke" -e C:/Users/hyper/workspace/HyperNexus/extensions/pi-hypernexus/pi-hypernexus.ts
curl.exe -s -m 5 http://127.0.0.1:7778/health
```

Hooks must exit 0 with `continue:true` semantics (never stall a turn);
MCP stdio `initialize` must return server capabilities.
