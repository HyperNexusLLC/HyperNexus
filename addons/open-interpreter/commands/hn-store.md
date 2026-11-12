---
user-invocable: true
name: hn-store
description: "Persist a fact to HyperNexus L2 memory with tags from Open Interpreter. Trigger on '/skill:hn-store', 'remember this', or 'store memory'."
---

# /skill:hn-store <content> [--tags a,b] [--category general] [--importance 0.5]

Store the provided content as a durable L2 memory:

1. Call `hypernexus MCP add_memory` with `content`, `tags` (comma-separated from
   `--tags`, default `open-interpreter`), `category` (default `general`),
   and `importance` (default 0.5).
2. Confirm with the returned id (kernel wraps the record at `data.memory.id`).
3. If the content names entities/relations worth keeping, also run
   `hypernexus MCP memory_extract_relations` on it.

If `--tags` was omitted and the content clearly belongs to a topic, choose one
descriptive tag yourself. On kernel-down, say the memory was not persisted and why.
