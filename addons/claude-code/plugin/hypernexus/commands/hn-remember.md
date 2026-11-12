---
description: "Store a decision or insight to HyperNexus L2 with a category from Claude Code. Trigger on '/hn-remember' or 'remember decision'."
---

# /hn-remember <decision or insight> [tags: a,b]

$ARGUMENTS

Store the following decision/insight via `mcp__hypernexus__add_memory`
(namespace `project`, tags always include `decision` and `claude-code` plus any
user-supplied `tags: ...`). State the decision first, then the reasoning.

If entities/relations matter, also run `mcp__hypernexus__memory_extract_relations`
on the stored content.
