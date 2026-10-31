---
name: hypernexus-memory
description: "HyperNexus L2 working memory for mini-swe-agent: store facts/decisions, fast recall, @memory: expansion. Use when the task needs cross-session recall, persisting a decision/gotcha, or recalling prior context via the Go kernel on port 7778."
---

# HyperNexus Memory (mini-swe-agent)

Kernel baseline: `http://127.0.0.1:7778` (authoritative). Never use port 8080.

## Store (observations/record)

`POST /api/memory/facts/add` with a **tags array**:

```json
{ "content": "what happened / decision", "tags": ["pi-hook", "hook:turn_end"], "type": "observation" }
```

The hook layer logs every event this way:
`session_start`, `before_agent_start`, `context`, `tool_call` (record),
`tool_result`, `user_bash` (audit), `model_select`, `input`, `turn_end`,
`session_before_compact`, `session_compact`, `session_shutdown`.

## Recall

- Hot path (never stalls a turn): `GET /api/memory/fts-search?q=<words>&limit=3`
- Full recall: `GET /api/memory/search?q=<query>&limit=5`
- Tools: `hypernexus_memory_search`, `hypernexus_memory_store`; commands `/hn-remember`, `/hn-search`
- Inline: `@memory:<keyword>` in any prompt expands to top L2 hits.

## Rules

- FTS queries: plain words only (no quotes/operators), max ~80 chars.
- Hook logging is fire-and-forget with a 2.5s budget; a down kernel must never stall pi.
