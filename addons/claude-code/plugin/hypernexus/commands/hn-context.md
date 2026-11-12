---
description: Expand @memory:key references and inject HyperNexus fast-context into the prompt
---

Pull explicit memory references into context:

1. Scan the arguments for `@memory:<key>` references.
2. For each key, call `mcp__hypernexus__search_memory` (limit 2) or fetch the fast path
   `GET http://127.0.0.1:7778/api/memory/fts-search?q=<key>&limit=2`.
3. Inline the top hits under a `[HyperNexus memory: <key>]` heading.

Leave references intact when the kernel is unreachable. Never stall the turn on memory.

Arguments: $ARGUMENTS
