---
description: Persist a fact to HyperNexus L2 memory with tags
usage: /hn-store <content> [--tags a,b] [--category general] [--importance 0.5]
---

$ARGUMENTS

Store the provided content as a durable L2 memory:

1. Call `mcp__hypernexus__add_memory` with `content`, `tags` (comma-separated from
   `--tags`, default `codewhale`), `category` (from `--category`, default `general`),
   and `importance` (from `--importance`, default 0.5).
2. Confirm with the returned id (kernel wraps the record at `data.memory.id`).
3. If the content names entities/relations worth keeping, also run
   `mcp__hypernexus__memory_extract_relations` on it.

If `--tags` was omitted and the content clearly belongs to a topic, choose one
descriptive tag yourself. On kernel-down, say the memory was not persisted and why.
