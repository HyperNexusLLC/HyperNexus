---
description: Harvest HyperNexus session context (recent memories + active goal) to resume work
---

Resume work with HyperNexus context:

1. Recent memories — `mcp__hypernexus__search_memory` with an empty query (then a topic query).
2. Active goal — `mcp__hypernexus__memory_scratchpad_get` with key `goal`.
3. Overview — `mcp__hypernexus__memory_stats` for vault activity.
4. Summarize where the last session left off and propose the next step.

Arguments: $ARGUMENTS
