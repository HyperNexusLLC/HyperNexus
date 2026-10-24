---
description: Persist a session summary to L2 memory and hand off to the next session
usage: /hn-summary [what-changed]
---

$ARGUMENTS

End-of-session handoff (pairs with the HANDOFF.md multi-agent protocol):

1. `mcp__hypernexus__add_memory` a short summary of the session: what was delivered,
   what was verified (with numbers), what remains — tags `session,summary` plus one
   topic tag. Use `--`-free prose from `$ARGUMENTS` as the spine when provided.
2. `mcp__hypernexus__memory_scratchpad_set` key `goal` to what the next session should
   pick up (or clear it if the work is complete).
3. If entities/relations matter for future work, run
   `mcp__hypernexus__memory_extract_relations` on the summary.

Append-only and safe to retry. Confirm each write's id in one short list.
