---
name: hypernexus
description: HyperNexus AI control plane — persistent L1/L2/L3 memory via the hypernexus MCP server, semantic tool discovery, knowledge graph, sessions, skills, code search, billing, and agent orchestration. Use when the task benefits from cross-session memory (scratchpad, facts, observations), MCP tool discovery, knowledge ingestion, system health, or routing through the HyperNexus Go kernel on port 7778. Trigger on mentions of 'hypernexus', 'HN', 'scratchpad', 'cross-session memory', 'MCP tools', 'tool discovery', 'knowledge graph', or 'control plane'.
---

# HyperNexus Integration (Muse Code)

HyperNexus is a local AI control plane: Go kernel on port 7778 (dashboard 7779)
with persistent multi-tier memory (L1 scratchpad, L2 vector store, L3 cold
archive), semantic tool discovery across 60+ MCP servers / 26,000+ tools,
knowledge graph, session import, and agent orchestration.

The plugin's `mcp.json` registers the kernel's stdio MCP server (`hypernexus mcp`),
so the `mcp__hypernexus__*` tools listed below are available whenever the plugin
is active. Core flows also work over plain HTTP if MCP is unavailable.

## When to Use

- Start of any multi-step task → harvest prior context (`search_memory` / `memory_scratchpad_get`)
- After a decision, gotcha, or non-obvious finding → store it (`add_memory` / scratchpad `set`)
- When you need a capability you don't have → discover (`mcp_list_tools`) then route (`mcp_call_tool`)
- When the user asks about system health, billing, or the repo → `system_status`, `billing_status`, stdio search tools

## HyperNexus MCP tools (registered by this plugin)

| Tool | Purpose |
|---|---|
| `mcp__hypernexus__add_memory` | Store a fact / decision to L2 |
| `mcp__hypernexus__search_memory` | Keyword + semantic search over L2 |
| `mcp__hypernexus__memory_stats` | Tier counts: vault / scratchpad / relations |
| `mcp__hypernexus__memory_extract_relations` | Extract entities/relations (knowledge graph) |
| `mcp__hypernexus__memory_extract_relations_batch` | Batch graph extraction across the vault |
| `mcp__hypernexus__memory_scratchpad_get` / `set` / `append` | L1 working memory |
| `mcp__hypernexus__mcp_list_servers` / `mcp_list_tools` / `mcp_call_tool` | MCP bridge: servers, tool inventory, routed calls |
| `mcp__hypernexus__codebase_search` / `codebase_outline` / `repomap` | Code search, outline, repo map |
| `mcp__hypernexus__system_status` / `billing_status` / `get_system_stats` | Kernel, billing, host stats |
| `mcp__hypernexus__list_processes` / `kill_process` | Kernel-managed process inventory |
| `mcp__hypernexus__search` / `install_mcp_server` | Tool discovery, server install |

## HTTP API fallback (port 7778)

```bash
# Memory
curl -X POST http://localhost:7778/api/memory/facts/add -H 'Content-Type: application/json' \
  -d '{"title":"...","content":"...","tags":["..."],"namespace":"project"}'
curl -s "http://localhost:7778/api/memory/search?query=<term>&limit=<n>"
curl -s "http://localhost:7778/api/memory/fts-search?q=<term>&limit=<n>"   # fast path

# MCP discovery & routing
curl -s "http://localhost:7778/api/mcp/tools/search?query=<natural+language>"
curl -X POST http://localhost:7778/api/agent/tool -H 'Content-Type: application/json' \
  -d '{"name":"<server/tool>","args":{}}'

# System
curl -s http://localhost:7778/health
curl -s http://localhost:7778/api/system/overview
curl -s http://localhost:7778/api/billing/status
```

## Slash commands (this plugin)

- `/hn-store` — store a memory fact · `/hn-search` — search memory
- `/hn-status` — kernel status · `/hn-tools` — discover tools
- `/hn-session` — resume from imported sessions · `/hn-context` — harvest context
- `/hn-plan` — store a plan · `/hn-summary` — summarize session to L2
- `/hn-restore` — pick up last handoff · `/hn-purge` — purge by tag

## Inline recall

Write `@memory:keyword` anywhere in a prompt — the `UserPromptSubmit` hook expands
matching L2 context inline.

## Discipline

1. **RECALL first** before re-deriving known answers.
2. **PERSIST** non-obvious outcomes with tags.
3. **FAST on hot paths** — hooks use FTS-only search (<=400ms).
4. **VERIFY** with `system_status` before and after production changes.
