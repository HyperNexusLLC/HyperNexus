---
name: hypernexus-memory
description: "HyperNexus L2 working memory from Prime Agent: store facts/decisions, fast recall via the Python skill or MCP tools. Use when the task needs cross-session recall, persisting a decision/gotcha, or recalling prior context via the Go kernel on port 7778."
---

# HyperNexus Memory (Prime Agent)

Kernel baseline: `http://127.0.0.1:7778` (authoritative). Never use port 8080.

## Store (facts/add, tags array)

Python skill (preferred — direct HTTP, immune to MCP session-snapshot quirks):

```python
await hypernexus.memory_fact("User time zone", "CET", tags=["user", "prefs"], namespace="project")
await hypernexus.memory_store("free-form note", tags=["prime-agent", "notes"])
```

Hook-style logging uses the same endpoint with a **tags array**:

```json
{ "content": "what happened / decision", "tags": ["prime-agent-hook", "hook:turn_end"], "type": "observation" }
```

Raw fallback: `POST /api/memory/facts/add`. Observations graph:
`observation_record(kind, content, files)` → `POST /api/memory/observations/record`.

## Recall

| Need | Call |
|---|---|
| Full recall (vector + keyword) | `memory_search(query, limit=10)` → `GET /api/memory/search` |
| Fast full-text | `memory_fts_search(query)` → `GET /api/memory/fts-search` |
| List / delete | `memory_list(limit)`, `memory_delete(id)` |
| Graph edges | `memory_relate(source, target, relation)`, `memory_graph()` |
| Observations | `observation_search(query)` |

MCP equivalents (58-tool `hypernexus` server): `add_memory`, `search_memory`,
`delete_memory`, `memory_extract_relations`.

## Rules

- FTS queries: plain words only (no quotes/operators), max ~80 chars.
- Every call is bounded (~5s); a down kernel raises `KernelUnreachable` — say so plainly, never show mock state.
- L2 is append-only: never rewrite another agent's facts; add corrections as new facts.
