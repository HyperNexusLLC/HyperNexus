---
name: hypernexus
description: Talk to the HyperNexus control plane from the Python kernel - persistent multi-tier memory (store/search/FTS/graph), L1 scratchpad, semantic search over 26k+ MCP tools, downstream MCP bridge (status/servers/tools/call), sessions, knowledge graph, cross-session handoff, and system/billing status. Use when the user asks to remember or recall facts across sessions, search memory, store handoffs, discover MCP tools, inspect the knowledge graph, or check HyperNexus/kernel status.
---

# HyperNexus

Connects Prime Agent to a running HyperNexus kernel (default `http://127.0.0.1:7778`,
override with `HYPERNEXUS_URL`). All calls are bounded (5s) and fail with a clear
`KernelUnreachable` message instead of hanging a turn.

## Quick start

```python
print(await hypernexus())                      # kernel overview
await hypernexus.memory_fact("User time zone", "CET", tags=["user", "prefs"])
hits = await hypernexus.memory_search("time zone")
```

## Capability map

| Need | Call |
|---|---|
| Kernel health / version | `await hypernexus()` or `hypernexus.kernel_status()` |
| Store a free-form memory | `memory_store(content, tags=..., category=...)` |
| Store a structured fact | `memory_fact(title, content, tags=..., namespace=...)` |
| Recall (vector + keyword) | `memory_search(query, limit=10)` |
| Recall (fast full-text) | `memory_fts_search(query)` |
| List / delete memories | `memory_list(limit)`, `memory_delete(id)` |
| Knowledge-graph edges | `memory_relate(source, target, relation)`, `memory_graph()` |
| L1 scratchpad | `scratchpad_get/set/append(key, value)` |
| Find an MCP tool for a job | `search_tools(query)`, `suggest_tools(context)` |
| Downstream MCP servers | `mcp_status()`, `mcp_servers()`, `mcp_tools(server)` |
| Call a downstream MCP tool | `mcp_call(server, tool, arguments)` |
| Sessions | `sessions()`, `session_context()` |
| Cross-session handoff | `handoff(summary)` -> artifact, `pickup(artifact)`, `agent_memory_search(query)` |
| Agent memory entries | `agent_memory_add(content)`, `agent_memory_recent(limit)` |
| Knowledge-graph observations | `observation_record(kind, content, files)`, `observation_search(query)` |
| Context bundles | `memory_context_save(key, content)`, `memory_context_get(key)`, `session_bootstrap()` |
| Knowledge ingest | `knowledge_ingest(content, source)` |
| Tool recommendations | `tool_context(limit)`, `mcp_search_tools(query)` |
| System / billing | `system_status()`, `billing_status()` |

Sectioned overview: `await hypernexus.status("memory" | "mcp" | "tools" | "sessions")`.

## Notes

- Every helper returns the parsed kernel payload (`data` unwrapped from the
  kernel's `{bridge, data, success}` envelope).
- The 58-tool `hypernexus` MCP server (registered separately by the installer as
  `prime-agent mcp add hypernexus`) complements this skill: use the MCP tools
  when a UI/agent surface wants first-class tool calls, use this skill when you
  want results composed in Python.
- If the kernel is down, start it with `hypernexus serve` (or `bin/hypernexus.exe serve`)
  — the skill never starts it implicitly.
