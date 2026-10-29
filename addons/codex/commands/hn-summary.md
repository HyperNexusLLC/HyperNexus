---
user-invocable: true
name: hn-summary
description: "Persist a Freebuff session summary to HyperNexus L2 memory and hand off to the next session. Trigger on '/skill:hn-summary', 'summarize session', or 'handoff'."
---

# /skill:hn-summary [what-changed]

End-of-session handoff (pairs with the HANDOFF.md multi-agent protocol):

1. `hypernexus MCP add_memory` a short summary of the session: what was delivered,
   what was verified (with numbers), what remains — tags `session,summary` plus one
   topic tag.
2. `hypernexus MCP memory_scratchpad_set` key `goal` to what the next session should
   pick up (or clear it if the work is complete).
3. If entities/relations matter for future work, run
   `hypernexus MCP memory_extract_relations` on the summary.

Append-only and safe to retry. Confirm each write's id in one short list.
`freebuff --continue` reopens the chat; `/export` writes the transcript to Markdown.
