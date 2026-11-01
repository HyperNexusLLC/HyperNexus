---
name: hn-restore
description: "Restore the last HyperNexus handoff (goal + next steps) from Prime Agent. Trigger on '/hn-restore' or 'restore handoff'."
---

# /hn-restore

$ARGUMENTS

Restore the last HyperNexus handoff: read `await hypernexus.scratchpad_get("goal")`
for the active goal, search L2 for the latest summary tagged `session` via
`await hypernexus.memory_search("session handoff", limit=3)`, and report the
goal, where work stopped, and the recommended next actions.

Pairs with `/hn-summary` (which writes the handoff). If the kernel is down,
say continuity is unavailable this turn — do not invent history.
