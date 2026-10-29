---
description: Persist a fact to HyperNexus L2 memory with tags
argument-hint: "<content> [--tags a,b] [--namespace project]"
---

Store the provided content as a durable L2 memory:

1. Call `ext__hypernexus__memory_store` with `content`, `tags` (comma-separated from
   `--tags`, default `reasonix`), and `namespace` (from `--namespace`, default `project`).
2. Confirm with the returned id.
3. If the content names entities/relations worth keeping, also run
   `ext__hypernexus__knowledge_graph` follow-up via `ext__hypernexus__memory_relate`.

If `--tags` was omitted and the content clearly belongs to a topic, choose one
descriptive tag yourself. On kernel-down, say the memory was not persisted and why.
$ARGUMENTS
