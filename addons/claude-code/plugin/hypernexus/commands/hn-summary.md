---
description: Write a HyperNexus session handoff summary for the next session or agent
---

Close out the session so the next one can resume:

1. Summarize — `mcp__hypernexus__add_memory` with a session summary, tags `session,summary`.
2. Goal — `mcp__hypernexus__memory_scratchpad_set` key `goal` with what comes next.
3. Graph — `mcp__hypernexus__memory_extract_relations` on the important findings.
4. Report the summary back in chat.

Arguments: $ARGUMENTS
