---
name: hypernexus
description: "HyperNexus AI control plane for Reasonix — persistent L2/L3 vector memory, semantic MCP tool discovery across 26k+ tools, knowledge graph, session import, billing, and agent orchestration. Use when the task benefits from cross-session memory (scratchpad, facts, observations), tool discovery across MCP servers, knowledge ingestion, system health checks, or routing through the HyperNexus Go kernel on port 7778. Trigger on mentions of 'hypernexus', 'HN', 'scratchpad', 'cross-session memory', 'MCP tools', 'tool discovery', 'knowledge graph', 'agent memory', or 'control plane'."
---

# HyperNexus Integration (Reasonix)

HyperNexus is a local AI control plane running a Go kernel on port 7778 (dashboard 7779) with persistent multi-tier memory (L1 scratchpad, L2 vector store, L3 cold archive), semantic tool discovery across 60+ MCP servers / 26,000+ tools, knowledge graph, session import, and agent orchestration.

Model sees these as `ext__hypernexus__<tool>` (runtime sidecar) plus the same surface over MCP (`hypernexus mcp` stdio server). Both are live; the sidecar adds intercepts (input expansion, fast context, RBAC).

## When to Use

- Start of any multi-step task → harvest prior context (`ext__hypernexus__context_harvest` / `ext__hypernexus__memory_search`)
- After a decision, gotcha, or non-obvious finding → store it (`ext__hypernexus__memory_store` / `ext__hypernexus__record_observation`)
- When you need a capability you don't have → discover tools (`ext__hypernexus__mcp_search` / `ext__hypernexus__tool_discover`) then route (`ext__hypernexus__mcp_call`)
- When the user asks about system health, billing, or the repo → `ext__hypernexus__system_overview`, `ext__hypernexus__billing_status`, `ext__hypernexus__knowledge_graph`

## Tools (served by the sidecar)

| Tool | Purpose |
|---|---|
| `ext__hypernexus__memory_search` | Keyword + semantic search over persistent memory |
| `ext__hypernexus__memory_fts_search` | FAST keyword search (use inside tight loops) |
| `ext__hypernexus__memory_vector_search` | Semantic recall incl. L3 cold archive |
| `ext__hypernexus__memory_list` | List recent memories |
| `ext__hypernexus__memory_store` | Store a fact / decision |
| `ext__hypernexus__memory_delete` | Delete by id or tag fan-out |
| `ext__hypernexus__memory_relate` | Link memories in the knowledge graph |
| `ext__hypernexus__memory_stats` | Tier counts: vault / scratchpad / relations |
| `ext__hypernexus__record_observation` | Structured observation (discovery/decision/progress/warning/fix) |
| `ext__hypernexus__knowledge_graph` | Entities/relations graph |
| `ext__hypernexus__context_harvest` | Pull relevant L2 context for a task |
| `ext__hypernexus__scratchpad` | L1 working memory get/set/append |
| `ext__hypernexus__session_search` | Search imported sessions |
| `ext__hypernexus__session_context` | Session bootstrap: goal & cross-session links |
| `ext__hypernexus__session_handoff` | Write/pick up handoff artifacts |
| `ext__hypernexus__session_list` | List recent sessions across harnesses |
| `ext__hypernexus__mcp_search` | Search live MCP tool inventory |
| `ext__hypernexus__mcp_status` / `mcp_servers` / `mcp_tools` | MCP bridge inventory |
| `ext__hypernexus__tool_search` | Semantic tool discovery (26k+ catalog) |
| `ext__hypernexus__tool_discover` | Native router discovery (L1+L2+L3) |
| `ext__hypernexus__suggest_tools` | Proactive tool suggestions from conversation |
| `ext__hypernexus__mcp_call` | Route a call to a downstream MCP tool |
| `ext__hypernexus__code_search` | symbols / definitions / references / files |
| `ext__hypernexus__repomap` | Ranked repo map with symbol summaries |
| `ext__hypernexus__workflow` / `orchestrate` | Engineering workflows / orchestration loop |
| `ext__hypernexus__browser` | Scrape URL or check browser-service status |
| `ext__hypernexus__skill_search` / `skill_manage` | Skill registry |
| `ext__hypernexus__status` / `system_overview` | Kernel + memory + MCP health |
| `ext__hypernexus__billing_status` | Provider quotas, depletion, fallback chain |
| `ext__hypernexus__audit_log` | Compliance audit trail |
| `ext__hypernexus__subagent` | Dispatch sub-tasks to orchestration |

## HTTP API (port 7778, kernel is source of truth)

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

## Commands

- `/hypernexus:hn-store` — store a memory fact · `/hypernexus:hn-remember` — store a decision
- `/hypernexus:hn-search` — search memory · `/hypernexus:hn-tools` — discover tools
- `/hypernexus:hn-session` — resume from imported sessions · `/hypernexus:hn-context` — harvest context
- `/hypernexus:hn-plan` — store a plan · `/hypernexus:hn-summary` — summarize session to L2
- `/hypernexus:hn-restore` — pick up last handoff · `/hypernexus:hn-status` — kernel status · `/hypernexus:hn-purge` — purge by tag

## Inline recall

Write `@memory:keyword` anywhere in a prompt to expand matching L2 context inline (the sidecar's `input.receive` interceptor expands it).

## Discipline

1. **RECALL first** before re-deriving known answers.
2. **PERSIST** non-obvious outcomes with tags.
3. **FAST on hot paths** — prefer `ext__hypernexus__memory_fts_search` in tight loops.
4. **VERIFY** with `ext__hypernexus__status` before and after production changes.
