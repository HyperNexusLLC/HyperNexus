---
name: hypernexus
description: HyperNexus AI control plane for Meta Code — persistent L2 vector memory, MCP tool routing, agent dispatch, kernel status/billing, and session management. Use when the task benefits from cross-session memory, tool discovery, agent dispatch, or kernel health/billing state.
---

# HyperNexus for Meta Code

HyperNexus is a local AI control plane (Go kernel, **port 7778 — authoritative**).
Port 8080 is stale: no Go listener exists there, so never use it.

## Connect (stdio-first)

The bundled MCP server speaks stdio (`hypernexus.exe mcp`) via `mcp/stdio.sh`:

```sh
sh extensions/hypernexus-metacode/mcp/stdio.sh
```

Env contract: `HYPERNEXUS_WORKSPACE_ROOT` is required (workspace scope);
`HYPERNEXUS_URL` is an optional override defaulting to
`http://127.0.0.1:7778`. Both are shipped in the stock configs.

HTTP fallback (kernel must be running): `http://127.0.0.1:7778`.

## Memory (L2, persistent)

MCP tools (namespace `hypernexus`, bare names over stdio):

- `memory_scratchpad_get/set/append` — L1 working memory (persona, goal)
- `memory_extract_relations` / `memory_extract_relations_batch` — knowledge graph
- `add_memory` / `search_memory` / `delete_memory` — L2 vault
- `memory_stats` — tier counts
- `add_bookmark` — save URLs with tags

Key HTTP endpoints (`http://127.0.0.1:7778`):

- `POST /api/memory/facts/add` — store a structured fact
- `GET /api/memory/search?query=` — semantic search
- `POST /api/agent-memory/add`, `GET /api/agent-memory/search` — agent memory
- `POST /api/agent-memory/handoff|pickup` — cross-agent handoff
- `GET /api/memory/session-bootstrap` — session bootstrap context
- `POST /api/memory/session-summaries/capture`, `GET .../recent|search`

## MCP tool routing

- `mcp_list_servers` / `mcp_list_tools` — discover capabilities
- `mcp_call_tool` — route a call through the kernel to 20+ MCP servers
- `mcp_status` / `mcp_server_test` — runtime health, probe one server
- HTTP: `GET /api/mcp/status`, `GET /api/mcp/servers`, `POST /api/agent/tool`

## Agent dispatch

- `POST /api/agent/tool` — run one tool call
- `POST /api/agent/chat` — agent chat turn
- `POST /api/agent/swarm/start`, transcript via `/api/agent/swarm/transcript`
- `GET /api/agent/a2a/agents`, `POST /api/agent/a2a/broadcast` — agent-to-agent
- `POST /api/agent/supervisor/evaluate`, `/api/agent/director/start`
- `POST /api/workflows/start`, `GET /api/workflows`, `/api/workflows/executions`

## Status & billing

- `system_status` / `get_system_stats` — kernel health overview
- HTTP: `GET /health`, `GET /api/system/status`, `GET /api/billing/status`
- Billing detail: `/api/billing/provider-quotas`, `/api/billing/cost-history`,
  `/api/billing/model-pricing`, `/api/billing/fallback-chain`,
  `/api/billing/stripe/plans`, `/api/billing/stripe/subscription`

## Sessions

- HTTP: `GET /api/sessions`, `/api/sessions/summary`, `/api/sessions/context`
- Supervised: `/api/sessions/supervisor/list|create|start|stop|logs|health`
- Imported (claude-code, cursor, opencode, aider, windsurf, continue,
  copilot): `/api/sessions/imported/list|get|scan`

## Best practices

1. Before significant work: check scratchpad memory and session bootstrap.
2. During development: use `repomap` for orientation; `mcp_list_tools`
   when unsure what is available.
3. After decisions: persist patterns via scratchpad/facts; capture a
   session summary for cross-session continuity.
4. Complex work: dispatch through the kernel (`mcp_call_tool`,
   `/api/agent/tool`) instead of reimplementing tools.
5. Never stall on kernel-down: continue locally, note the gap in one line.
