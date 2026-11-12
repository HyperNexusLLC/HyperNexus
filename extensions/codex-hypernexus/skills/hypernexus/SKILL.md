---
name: "hypernexus"
description: "HyperNexus AI control plane — persistent L2 vector memory, MCP tool routing, agent dispatch, status/billing, and session management. Use when the task benefits from cross-session memory, tool discovery, agent dispatch, or kernel health/billing state."
---

# HyperNexus for Codex

HyperNexus is a local AI control plane (Go kernel, **port 7778 — authoritative**).
Port 8080 is stale: no Go listener exists there, so never use it.

## Connect (stdio-first)

Register the MCP server over stdio — this is the in-repo Codex transport:

```bash
codex mcp add hypernexus \
  --env HYPERNEXUS_WORKSPACE_ROOT="<root>" \
  --env HYPERNEXUS_URL="http://127.0.0.1:7778" \
  -- "<root>/bin/hypernexus.exe" mcp
```

Verify:

```bash
codex mcp list     # hypernexus ... enabled
codex mcp get hypernexus
```

Or run `scripts/install.bat` (`install.sh` on POSIX) to register the
server, copy this skill to `~/.codex/skills/hypernexus/`, and verify.

Env contract: `HYPERNEXUS_WORKSPACE_ROOT` is required (workspace scope);
`HYPERNEXUS_URL` is an optional override defaulting to
`http://127.0.0.1:7778`. Both are shipped in the stock configs.

HTTP fallback (kernel must be running): `http://127.0.0.1:7778`.

## Memory (L2, persistent)

MCP tools (namespace `mcp_hypernexus_*`):

- `memory_scratchpad_get/set/append` — L1 working memory
- `memory_extract_relations` — knowledge-graph extraction
- `add_bookmark` — save URLs with tags

Key HTTP endpoints (`GET`/`POST http://127.0.0.1:7778`):

- `POST /api/memory/add` — store a memory
- `GET /api/memory/search?query=` — semantic search
- `GET/POST /api/memory/scratchpad/get|set` — working memory
- `POST /api/agent-memory/add`, `GET /api/agent-memory/search` — agent memory
- `POST /api/agent-memory/handoff|pickup` — cross-agent handoff
- `GET /api/memory/session-bootstrap` — session bootstrap context
- `POST /api/memory/session-summaries/capture`, `GET .../recent|search`
- `GET /api/memory/facts/add` — structured facts

## MCP tool routing

- `mcp_list_servers` / `mcp_list_tools` — discover capabilities
- `mcp_call_tool` — route a call through the kernel to 20+ MCP servers
- `mcp_status` — runtime health
- HTTP: `GET /api/mcp/status`, `GET /api/mcp/servers`, `POST /api/agent/tool`

## Agent dispatch

MCP: `mcp_call_tool`; code/file tools: `bash`, `read`/`write`/`edit`,
`grep`/`find`/`ls`, `repomap`, `code_interpreter`.

HTTP:

- `POST /api/agent/tool` — run one tool call
- `POST /api/agent/chat` — agent chat turn
- `POST /api/agent/swarm/start`, transcript via `/api/agent/swarm/transcript`
- `GET /api/agent/a2a/agents`, `POST /api/agent/a2a/broadcast` — agent-to-agent
- `POST /api/agent/supervisor/evaluate`, `/api/agent/director/start`
- `POST /api/workflows/start`, `GET /api/workflows`, `/api/workflows/executions`

## Status & billing

- `system_status` — kernel health overview
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
   `/api/agent/*`, `/api/workflows/start`) instead of ad-hoc shell.
5. Commercial integrations (Jira, Confluence) route through the kernel:
   `jira_create_issue`, `confluence_search`.
