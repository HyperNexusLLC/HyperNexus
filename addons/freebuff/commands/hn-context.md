---
user-invocable: true
name: hn-context
description: "Build a compact context block from HyperNexus L2 memory for the current task from Freebuff. Trigger on '/skill:hn-context' or 'task context'."
---

# /skill:hn-context [topic]

Assemble task context from persistent memory (this is a recall aid, not a report):

1. Fast path first: `/api/memory/fts-search?q=<topic>&limit=8` (~15ms) for the hot loop;
   fall back to `hypernexus MCP search_memory` for semantic recall when the fast path
   is thin.
2. Include scratchpad keys `goal`, `persona`, `human`
   (`hypernexus MCP memory_scratchpad_get`).
3. Emit a compact block: prior decisions, gotchas, active goal, open threads — each
   with its memory id so the user can prune with `/skill:hn-purge`.

Keep the output under ~30 lines. If nothing matches, say so instead of padding.
