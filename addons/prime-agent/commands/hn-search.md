---
name: hn-search
description: "Search HyperNexus L2 memory (semantic + keyword, optional tag/limit filters) from Prime Agent. Trigger on '/hn-search' or 'search memory'."
---

# /hn-search <query> [--tag t] [--limit n] [--cold]

$ARGUMENTS

Search cross-session memory and summarize what matters:

1. Call `await hypernexus.memory_search(query, limit=8)` (vector + keyword).
   Fast path: `await hypernexus.memory_fts_search(query)` (~15ms hot loop).
2. If the query yields nothing, retry once with fewer/simpler keywords — keyword
   matching needs natural-language tokens (a hyphenated single token rarely matches).
3. Summarize hits grouped by relevance; include ids so follow-up
   `memory_delete(id)` calls are possible. Empty query → `memory_list(limit)`.

Never stall: if the kernel is down, report it and continue without memory context.
