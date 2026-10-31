---
user-invocable: true
name: hypernexus
description: "HyperNexus AI control plane — persistent L2 vector memory, semantic MCP tool discovery across 26k+ tools, knowledge graph, session import, billing, and agent orchestration. Use when the task benefits from cross-session memory (scratchpad, facts, observations), tool discovery across MCP servers, knowledge ingestion, system health checks, or routing through the HyperNexus Go kernel on port 7778. Trigger on mentions of 'hypernexus', 'HN', 'scratchpad', 'cross-session memory', 'MCP tools', 'tool discovery', 'knowledge graph', 'agent memory', or 'control plane'."
---

# HyperNexus Integration (Open Interpreter)

HyperNexus is a local AI control plane running a Go kernel on port 7778 (dashboard 7779) with persistent multi-tier memory (L1 scratchpad, L2 vector store, L3 cold archive), semantic tool discovery across 60+ MCP servers / 26,000+ tools, knowledge graph, session import, and agent orchestration.

Invoke with `/skill:hypernexus`. Open Interpreter loads this skill from `.agents/skills/` — no plugin install step.

## When to Use

- Start of any multi-step task → recall context (`search_memory`, fast FTS `GET /api/memory/fts-search?q=`, scratchpad `memory_scratchpad_get`)
- After a decision, gotcha, or non-obvious finding → store it (`add_memory` + `memory_extract_relations`)
- When you need a capability you don't have → discover tools (`mcp_list_servers` / `mcp_list_tools`, semantic `GET /api/mcp/tools/search?query=`) then route (`mcp_call_tool`)
- When the user asks about system health, billing, or the repo → `system_status`, `billing_status`, `repomap`, `codebase_search`

## Open Interpreter Tools (via the hypernexus MCP server, 58 tools)

The MCP server (`.agents/mcp.json`, stdio `hypernexus mcp`) exposes these exact tool names. Prefer the MCP tool; the HTTP fallback works even when MCP is unreachable.

| MCP tool | Purpose | HTTP fallback |
|---|---|---|
| `search_memory` | Semantic + keyword memory search (vector+FTS; slow ~6s on cold start, fast after warmup) | `GET /api/memory/search?query=` / `GET /api/memory/fts-search?q=` (fast, ~15ms) |
| `add_memory` | Store a fact / decision (content, tags, category) | `POST /api/memory/add` |
| `delete_memory` | Delete a memory by id | `DELETE /api/memory/delete?id=` |
| `memory_stats` | Tier counts: vault / scratchpad / relations | `GET /api/memory/stats` |
| `memory_scratchpad_get` / `memory_scratchpad_set` / `memory_scratchpad_append` | L1 working memory (goal, persona, human) | `GET/POST /api/memory/scratchpad/*` |
| `memory_extract_relations` / `memory_extract_relations_batch` | Knowledge graph: entities + relations | `POST /api/memory/extract-relations` |
| `mcp_list_servers` | Live MCP server inventory | `GET /api/mcp/servers` |
| `mcp_list_tools` | Tool inventory across connected servers | `GET /api/mcp/tools` |
| `mcp_status` | Bridge status: connected count, fallback | `GET /api/mcp/status` |
| `mcp_server_test` | Probe a downstream server (tools/list, ping) | — |
| `mcp_call_tool` | Route a call (serverName, toolName, arguments) | `POST /api/agent/tool` |
| `system_status` | Kernel liveness + version | `GET /health` |
| `billing_status` | Provider quotas, depletion, fallback chain | `GET /api/billing/status` |
| `get_system_stats` | OS / runtime metrics | — |
| `codebase_search` | symbols / definitions / references (empty result when kernel catalog has no match) | `GET /api/mcp/native/search?query=` |
| `codebase_outline` | Symbol outline for a file | — |
| `repomap` | Ranked repo map with symbol summaries | — |
| `read` / `write` / `edit` / `find` / `grep` / `ls` (+ `read_file` / `write_file` / `search` / `run_shell_command` / `bash` / `apply_search_replace`) | File + shell access through the kernel | local tools |
| `code_interpreter` | Run python/node snippets (stateful session) | — |
| `add_bookmark` | Save URL with title + tags | — |
| `jira_create_issue` / `confluence_search` | Atlassian integration | — |
| `cloud_troubleshoot` / `generate_devops_pipeline` | Ops generators | — |
| `install_mcp_server` | Install an MCP server via npx | — |
| `launch_webview` | Open a system browser window | — |
| `download_llamafile` | Fetch a standalone model binary | — |
| `list_processes` / `kill_process` | Process management (Windows) | — |

## Discipline loop

```
RECALL → DISCOVER (if gap) → EXECUTE → PERSIST → VERIFY
```

1. **RECALL** before re-deriving: FTS fast path first, semantic `search_memory` for depth; include scratchpad `goal`.
2. **DISCOVER** on capability gaps: `mcp_list_servers` → `mcp_list_tools` → semantic search → `mcp_call_tool`.
3. **PERSIST** non-obvious outcomes: `add_memory` (tags `topic,kind`) + `memory_extract_relations`.
4. **VERIFY** around production changes: `system_status` + `billing_status` before and after.

If the kernel is down, say so in one short sentence and continue with local tools — never present mock state.
