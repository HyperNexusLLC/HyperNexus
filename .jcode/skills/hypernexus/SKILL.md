---
name: hypernexus
description: "HyperNexus AI control plane for Jcode — persistent L2 vector memory (add/search/delete, scratchpad, relation graph), semantic MCP tool discovery across 26k+ tools, kernel health/billing, and cross-harness session continuity. Use when the task benefits from cross-session memory, tool discovery across MCP servers, knowledge graph extraction, or operating the HyperNexus Go kernel on port 7778. Trigger on 'hypernexus', 'HN', 'scratchpad', 'cross-session memory', 'MCP tools', 'tool discovery', 'knowledge graph', 'agent memory', or 'control plane'."
---

# HyperNexus Integration (Jcode)

HyperNexus is a local AI control plane: a Go kernel on port 7778 (dashboard 7779) with
persistent multi-tier memory (L1 scratchpad, L2 vector vault, L3 cold archive), semantic
tool discovery across 60+ MCP servers / 26,000+ tools, a knowledge-graph relation store,
imported-session archives, and agent orchestration.

In Jcode it is exposed through the `hypernexus` MCP server (tools are prefixed
`mcp__hypernexus__` in the merged tool namespace).

## When to Use

- Start of any multi-step task → recall prior context (`mcp__hypernexus__search_memory`)
- After a decision, gotcha, or non-obvious finding → persist it (`mcp__hypernexus__add_memory`,
  `mcp__hypernexus__memory_extract_relations`)
- When you need a capability you don't have → discover tools
  (`mcp__hypernexus__mcp_list_tools`, `mcp__hypernexus__search`) then route
  (`mcp__hypernexus__mcp_call_tool`)
- When the user asks about system health or billing → `mcp__hypernexus__system_status`,
  `mcp__hypernexus__billing_status`, `mcp__hypernexus__memory_stats`

## Tool Map (MCP server `hypernexus`)

| Tool | Purpose |
|---|---|
| `mcp__hypernexus__add_memory` | Store a structured memory in the L2 vault (content, tags, category, importance, session_id) |
| `mcp__hypernexus__search_memory` | Keyword search with tag/category filters; empty query returns recent; `include_cold` reaches L3 |
| `mcp__hypernexus__delete_memory` | Delete an L2 memory by id |
| `mcp__hypernexus__memory_stats` | Counts across L2 vault / scratchpad / relation tiers |
| `mcp__hypernexus__memory_scratchpad_get/set/append` | L1 working memory (persona, human, active goal) |
| `mcp__hypernexus__memory_extract_relations` | Extract entities/relations from text into the knowledge graph |
| `mcp__hypernexus__memory_extract_relations_batch` | GraphRAG relation extraction across the L2 corpus |
| `mcp__hypernexus__codebase_search` / `codebase_outline` | Repo-aware code search and file outlines |
| `mcp__hypernexus__repomap` / `search` / `grep` / `find` | Codebase mapping and file/text search |
| `mcp__hypernexus__mcp_list_servers` / `mcp_list_tools` / `mcp_status` | Live MCP bridge inventory |
| `mcp__hypernexus__mcp_call_tool` | Route a call to a downstream MCP tool (`serverName`, `toolName`, `arguments`) |
| `mcp__hypernexus__mcp_server_test` | Probe a configured MCP server (`tools/list`, `ping`) |
| `mcp__hypernexus__system_status` / `get_system_stats` | Kernel health + host statistics |
| `mcp__hypernexus__billing_status` | Provider quotas, depletion, fallback chain |
| `mcp__hypernexus__hello_world` / `echo` | Connectivity probes |

## HTTP API (port 7778, same capabilities without the extension)

```bash
# Memory (facts endpoint; search accepts ?query=&limit=)
curl -X POST http://localhost:7778/api/memory/facts/add -H 'Content-Type: application/json' \
  -d '{"title":"...","content":"...","tags":["..."],"namespace":"project"}'
curl -s "http://localhost:7778/api/memory/search?query=<term>&limit=<n>"
curl -s "http://localhost:7778/api/memory/fts-search?q=<term>&limit=<n>"   # fast path

# MCP discovery & routing
curl -s http://localhost:7778/api/mcp/tools
curl -s "http://localhost:7778/api/mcp/tools/search?query=<natural+language>"
curl -X POST http://localhost:7778/api/agent/tool -H 'Content-Type: application/json' \
  -d '{"name":"<tool>","args":{}}'

# System
curl -s http://localhost:7778/health
curl -s http://localhost:7778/api/billing/status
```

## Jcode-Native Synergies

- Jcode's native `memory` tool and HyperNexus L2 are complementary: Jcode memory is
  session/harness-local; HyperNexus L2 is cross-harness and cross-session. Persist
  durable project facts to both.
- Use `panel` to render HyperNexus reports (memory stats, ops status) as desktop panels.
- Use `schedule` for recurring memory hygiene (e.g. weekly `memory_extract_relations_batch`).
- The `mcp` manager tool handles ad-hoc remote MCP connections; `mcp__hypernexus__mcp_call_tool`
  routes into the 26k+ tool catalog the kernel has assimilated.

## Discipline

1. **RECALL first** before re-deriving known answers (`mcp__hypernexus__search_memory`).
2. **PERSIST** non-obvious outcomes with tags (`mcp__hypernexus__add_memory`).
3. **DISCOVER** on capability gaps (`mcp__hypernexus__mcp_list_tools` → `mcp_call_tool`).
4. **VERIFY** with `mcp__hypernexus__system_status` before and after production changes.
5. **Never throw on kernel-down**: if the MCP server reports unreachable, continue with
   local tools and note the degradation briefly.
