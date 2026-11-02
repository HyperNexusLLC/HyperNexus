---
user-invocable: true
name: hn-remember
description: "Store a decision or insight to HyperNexus L2 with a category from Codex. Trigger on '/skill:hn-remember' or 'remember decision'."
---

# /skill:hn-remember <decision or insight> [tags: a,b]

Quick single-shot memory store:

1. Call `hypernexus MCP add_memory` with `content` = text, `title` = first 60 chars, `tags` from `[tags: ...]` or default `decision,codex`, `namespace` = `project`.
2. Confirm with the returned id.
3. If entities/relations are worth keeping, also run `hypernexus MCP memory_extract_relations`.

On kernel-down, say the memory was not persisted and why.
