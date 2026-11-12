---
description: Search HyperNexus L2 memory (semantic + keyword, optional tag/category filters)
usage: /hn-search <query> [--tag t] [--category c] [--limit n] [--cold]
---

$ARGUMENTS

Search cross-session memory and summarize what matters:

1. Call `mcp__hypernexus__search_memory` with `query`, `limit` (default 8), and the
   `tag`/`category` filters when given. Add `include_cold: true` when `--cold` is set.
2. If the query yields nothing, retry once with fewer/simpler keywords — keyword
   matching needs natural-language tokens (a hyphenated single token rarely matches).
3. Summarize hits grouped by relevance; include ids so follow-up
   `mcp__hypernexus__delete_memory` calls are possible. Empty query → recent memories.

Never stall: if the kernel is down, report it and continue without memory context.
