---
user-invocable: true
name: hn-store
description: "Persist a fact to HyperNexus L2 memory with tags from Crush. Trigger on '/hn-store', 'remember this', or 'store memory'."
---

# /hn-store <content> [--tags a,b] [--category general] [--importance 0.5]

$ARGUMENTS

Store the provided content as a durable L2 memory:

1. Call `hypernexus MCP add_memory` with `content`, `tags` (comma-separated from
   `--tags`, default `jcode`), `category` (from `--category`, default `general`),
   and `importance` (from `--importance`, default 0.5).
2. Confirm with the returned id (kernel wraps the record at `data.memory.id`).
3. If the content names entities/relations worth keeping, also run
   `hypernexus MCP memory_extract_relations` on it.

If `--tags` was omitted and the content clearly belongs to a topic, choose one
descriptive tag yourself. On kernel-down, say the memory was not persisted and why.
