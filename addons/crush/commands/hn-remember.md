---
user-invocable: true
name: hn-remember
description: "Store a decision or insight to HyperNexus L2 with a category from Crush. Trigger on '/hn-remember' or 'remember decision'."
---

# /hn-remember <decision or insight> [tags: a,b]

$ARGUMENTS

Store the following decision/insight via `hypernexus MCP add_memory`
(namespace `project`, tags always include `decision` and `crush` plus any
user-supplied `tags: ...`). State the decision first, then the reasoning.

If entities/relations matter, also run `hypernexus MCP memory_extract_relations`
on the stored content.
