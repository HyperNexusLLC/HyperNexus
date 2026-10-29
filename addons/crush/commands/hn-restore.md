---
user-invocable: true
name: hn-restore
description: "Restore the last HyperNexus handoff (goal + next steps) from Crush. Trigger on '/hn-restore' or 'restore handoff'."
---

# /hn-restore

$ARGUMENTS

Restore the last HyperNexus handoff: read `hypernexus MCP memory_scratchpad_get`
for the active goal, search L2 for the latest summary tagged `session`, and
report the goal, where work stopped, and the recommended next actions.

Pairs with `/hn-summary` (which writes the handoff). If the kernel is down,
say continuity is unavailable this turn — do not invent history.
