---
name: hn-context
description: "Build a compact context block from HyperNexus L2 memory for the current task from Prime Agent. Trigger on '/hn-context' or 'task context'."
---

# /hn-context [topic]

$ARGUMENTS

Assemble task context from persistent memory (this is a recall aid, not a report):

1. Fast path first: `await hypernexus.memory_fts_search(topic, limit=8)` (~15ms) for
   the hot loop; fall back to `await hypernexus.memory_search(topic)` for semantic
   recall when the fast path is thin.
2. Include scratchpad keys `goal`, `persona`, `human`
   (`await hypernexus.scratchpad_get(key)`).
3. Emit a compact block: prior decisions, gotchas, active goal, open threads — each
   with its memory id so the user can prune with `/hn-purge`.

Keep the output under ~30 lines. If nothing matches, say so instead of padding.
