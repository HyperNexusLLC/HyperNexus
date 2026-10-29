---
description: Search HyperNexus L2 memory for prior decisions and context
argument-hint: "<query>"
---

Search HyperNexus L2 memory for the given query:

1. Call `ext__hypernexus__memory_search` with the query (limit 8).
2. If nothing matches, retry with `ext__hypernexus__memory_fts_search` (fast keyword path).
3. Present results as a short bullet list with ids and tags.

$ARGUMENTS
