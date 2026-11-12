---
name: hypernexus
description: HyperNexus AI control plane for VS Code — persistent L2 vector memory, MCP tool routing, agent dispatch, kernel status/billing, and session management. Use when the task benefits from cross-session memory, tool discovery, agent dispatch, or kernel health/billing state.
---

# HyperNexus for VS Code

HyperNexus is a local AI control plane (Go kernel, **port 7778 — authoritative**).
Port 8080 is stale: no Go listener exists there, so never use it.

## Connect (stdio-first)

The bundled MCP server speaks stdio (`hypernexus mcp`, see `package.json`
`mcpServers`). Env contract: `HYPERNEXUS_WORKSPACE_ROOT` scopes the
workspace; `HYPERNEXUS_URL` overrides the kernel base URL (default
`http://127.0.0.1:7778`).

HTTP fallback (kernel must be running): `http://127.0.0.1:7778`.

## Memory (L2, persistent)

- `memory_scratchpad_get/set/append` — L1 working memory (persona, goal)
- `add_memory` / `search_memory` / `delete_memory` — L2 vault
- `memory_stats` — tier counts
- Key HTTP endpoints: `POST /api/memory/facts/add`,
  `GET /api/memory/search?query=`, `POST /api/agent-memory/handoff|pickup`,
  `GET /api/memory/session-bootstrap`

## MCP tool routing

- `mcp_list_servers` / `mcp_list_tools` — discover capabilities
- `mcp_call_tool` — route a call through the kernel
- `mcp_status` / `mcp_server_test` — runtime health

## Agent dispatch

- `POST /api/agent/tool`, `POST /api/agent/chat`,
  `POST /api/agent/swarm/start`, `POST /api/agent/a2a/broadcast`
- Default model: `meta/muse-spark-1.3-contributor`
  (`hypernexus.modelProvider` / `hypernexus.model` settings).

## Status & billing

- `GET /health`, `GET /api/system/status`, `GET /api/billing/status`
- VS Code commands: `hypernexus.showStatus`, `hypernexus.showBilling`,
  `hypernexus.runOpsCheck` (union checklist, 12 commands in `package.json`).

## Best practices

1. Before significant work: check scratchpad memory and session bootstrap.
2. After decisions: persist patterns via scratchpad/facts.
3. Never stall on kernel-down: continue locally, note the gap in one line.
