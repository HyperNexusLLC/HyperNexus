---
name: hn-summary
description: "Persist a Prime Agent session summary to HyperNexus L2 memory and hand off to the next session. Trigger on '/hn-summary', 'summarize session', or 'handoff'."
---

# /hn-summary [what-changed]

$ARGUMENTS

End-of-session handoff (pairs with the HANDOFF.md multi-agent protocol):

1. `await hypernexus.handoff(summary)` with a short summary of the session: what was
   delivered, what was verified (with numbers), what remains — tags `session,summary`
   plus one topic tag. Use prose from `$ARGUMENTS` as the spine when provided.
2. `await hypernexus.scratchpad_set("goal", ...)` to what the next session should
   pick up (or clear it if the work is complete).
3. If entities/relations matter for future work, run
   `await hypernexus.memory_relate(source, target, relation)` on the summary.

Append-only and safe to retry. Confirm each write's id in one short list.
Next session resumes with `await hypernexus.pickup(artifact)`.
