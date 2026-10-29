---
user-invocable: true
name: hn-remember
description: "Store a decision or insight to HyperNexus L2 with a category from Freebuff. Trigger on '/skill:hn-remember' or 'remember decision'."
---

# /skill:hn-remember <decision or insight> [tags: a,b]

Store the following decision/insight via `hypernexus MCP add_memory`
(namespace `project`, tags always include `decision` and `freebuff` plus any
user-supplied `tags: ...`). State the decision first, then the reasoning.

If entities/relations matter, also run `hypernexus MCP memory_extract_relations`
on the stored content.
