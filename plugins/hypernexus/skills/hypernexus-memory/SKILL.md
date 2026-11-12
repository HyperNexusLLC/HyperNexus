---
name: hypernexus-memory
description: Persistent L2 memory across sessions — store, search, and recall decisions via the HyperNexus kernel. Use when the user says "remember", before re-deriving a known answer, or when @memory: references appear.
---

# HyperNexus Memory

You have a persistent memory vault (L2) via the `hypernexus` MCP server. **Recall before re-deriving.**

## Tools (MCP server `hypernexus`)

- `search_memory` / `memory_fts_search` — keyword + FTS search (fast; prefer for hot loops)
- `memory_vector_search` — semantic search incl. L3 cold archive (slower, paraphrase-proof)
- `add_memory` / `memory_store` — persist a fact, decision, or gotcha with tags + namespace
- `memory_list` — browse recent memories
- `memory_scratchpad_set/get/append` — L1 short-lived working state (key `current_task`)
- `record_observation` — structured discovery/decision/progress/warning/fix with concepts + touched files

## Rules

- `@memory:key` in a prompt means: FTS-search that key first, inject top hits.
- Store non-obvious outcomes with tags (`deployment`, `bug-fix`, `decision`) and namespace `project`.
- Substantial tool results (>400 chars) are auto-persisted by the PostToolUse hook; don't duplicate.
- Kernel: `http://127.0.0.1:7778`. If offline, degrade gracefully and say so.
