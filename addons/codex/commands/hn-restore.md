---
user-invocable: true
name: hn-restore
description: "Restore the last HyperNexus handoff (goal + next steps) from Codex. Trigger on '/skill:hn-restore' or 'restore handoff'."
---

# /skill:hn-restore

Pick up the last session handoff to resume work:

1. Call `hypernexus MCP memory_scratchpad_get` with `key` = `goal` for working state.
2. POST `http://127.0.0.1:7778/api/agent-memory/pickup` (empty body) for the last handoff (goal + next steps).
3. Present goal + next steps as a short list so work can continue.

If nothing is stored, say so plainly. Never invent a handoff.
