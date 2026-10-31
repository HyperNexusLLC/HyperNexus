---
name: hypernexus
description: "HyperNexus AI control plane — persistent L2 vector memory, semantic MCP tool discovery across 26k+ tools, knowledge graph, session import, billing, and agent orchestration. Use when the task benefits from cross-session memory (scratchpad, facts, observations), tool discovery across MCP servers, knowledge ingestion, system health checks, or routing through the HyperNexus Go kernel on port 7778. Trigger on mentions of 'hypernexus', 'HN', 'scratchpad', 'cross-session memory', 'MCP tools', 'tool discovery', 'knowledge graph', 'agent memory', or 'control plane'."
---

# HyperNexus Integration (mini-swe-agent)

HyperNexus is a local AI control plane running a Go kernel on port 7778 (dashboard 7779) with persistent multi-tier memory (L1 scratchpad, L2 vector store, L3 cold archive), semantic tool discovery across 60+ MCP servers / 26,000+ tools, knowledge graph, session import, and agent orchestration.

## When to Use

- Start of any multi-step task → harvest prior context (`hypernexus_context_harvest` / `hypernexus_memory_search`)
- After a decision, gotcha, or non-obvious finding → store it (`hypernexus_memory_store` / `hypernexus_record_observation`)
- When you need a capability you don't have → discover tools (`hypernexus_mcp_search` / `hypernexus_tool_discover`) then route (`hypernexus_mcp_call`)
- When the user asks about system health, billing, or the repo → `hypernexus_system_overview`, `hypernexus_billing_status`, `hypernexus_knowledge_graph`

## mini-swe-agent Tools (registered by the plugin)

| Tool | Purpose |
|---|---|
| `hypernexus_memory_search` | Keyword + semantic search over persistent memory |
| `hypernexus_memory_fts_search` | FAST keyword search (use inside tight loops) |
| `hypernexus_memory_vector_search` | Semantic recall incl. L3 cold archive |
| `hypernexus_memory_list` | List recent memories |
| `hypernexus_memory_store` | Store a fact / decision |
| `hypernexus_memory_delete` | Delete by id or tag fan-out |
| `hypernexus_memory_relate` | Link memories in the knowledge graph |
| `hypernexus_memory_stats` | Tier counts: vault / scratchpad / relations |
| `hypernexus_record_observation` | Record a structured observation (discovery/decision/progress/warning/fix) |
| `hypernexus_knowledge_graph` | Entities/relations graph |
| `hypernexus_context_harvest` | Pull relevant L2 context for a task |
| `hypernexus_scratchpad` | L1 working memory get/set/append |
| `hypernexus_session_search` | Search imported sessions |
| `hypernexus_session_context` | Session bootstrap: goal & cross-session links |
| `hypernexus_session_handoff` | Write/pick up handoff artifacts |
| `hypernexus_session_list` | List recent sessions across harnesses |
| `hypernexus_mcp_search` | Search live MCP tool inventory |
| `hypernexus_mcp_status` / `hypernexus_mcp_servers` / `hypernexus_mcp_tools` | MCP bridge status / servers / tools |
| `hypernexus_tool_search` | Semantic tool discovery (26k+ catalog) |
| `hypernexus_tool_discover` | Native router discovery (L1+L2+L3) |
| `hypernexus_suggest_tools` | Proactive tool suggestions from conversation |
| `hypernexus_mcp_call` | Route a call to a downstream MCP tool |
| `hypernexus_code_search` | symbols / definitions / references / files |
| `hypernexus_repomap` | Ranked repo map with symbol summaries |
| `hypernexus_workflow` / `hypernexus_orchestrate` | Engineering workflows / orchestration loop |
| `hypernexus_browser` | Scrape URL or check browser-service status |
| `hypernexus_skill_search` / `hypernexus_skill_manage` | Skill registry |
| `hypernexus_status` / `hypernexus_system_overview` | Kernel + memory + MCP health |
| `hypernexus_billing_status` | Provider quotas, depletion, fallback chain |
| `hypernexus_audit_log` | Compliance audit trail |
| `hypernexus_subagent` | Dispatch sub-tasks to orchestration |

## HTTP API (port 7778)

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

## mini-swe-agent Commands

- `/hn-store` — store a memory fact · `/hn-remember` — store a decision
- `/hn-search` — search memory · `/hn-tools` — discover tools
- `/hn-session` — resume from imported sessions · `/hn-context` — harvest context
- `/hn-plan` — store a plan · `/hn-summary` — summarize session to L2
- `/hn-restore` — pick up last handoff · `/hn-status` — kernel status · `/hn-purge` — purge by tag

## Inline recall

Write `@memory:keyword` anywhere in a prompt to expand matching L2 context inline.

## Discipline

1. **RECALL first** before re-deriving known answers.
2. **PERSIST** non-obvious outcomes with tags.
3. **FAST on hot paths** — prefer `hypernexus_memory_fts_search` in tight loops.
4. **VERIFY** with `hypernexus_status` before and after production changes.
