---
name: hn-remember
description: "Store a decision or insight to HyperNexus L2 with a category from Prime Agent. Trigger on '/hn-remember' or 'remember decision'."
---

# /hn-remember <decision or insight> [tags: a,b]

$ARGUMENTS

Store the following decision/insight via `await hypernexus.memory_fact("decision", text, tags=[...])`
(namespace `project`, tags always include `decision` and `prime-agent` plus any
user-supplied `tags: ...`). State the decision first, then the reasoning.

If entities/relations matter, also run
`await hypernexus.memory_relate(source, target, relation)` on the stored content.
