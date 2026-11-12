---
name: hn-store
description: "Persist a fact to HyperNexus L2 memory with tags from Prime Agent. Trigger on '/hn-store', 'remember this', or 'store memory'."
---

# /hn-store <content> [--tags a,b] [--namespace project]

$ARGUMENTS

Store the provided content as a durable L2 memory:

1. Call `await hypernexus.memory_fact(title, content, tags=[...], namespace="project")`
   with `tags` (comma-separated from `--tags`, default `prime-agent`) and
   `namespace` (from `--namespace`, default `project`). Free-form notes use
   `await hypernexus.memory_store(content, tags=[...])`.
2. Confirm with the returned id (kernel wraps the record at `data.memory.id`).
3. If the content names entities/relations worth keeping, also run
   `await hypernexus.memory_relate(source, target, relation)` on it.

If `--tags` was omitted and the content clearly belongs to a topic, choose one
descriptive tag yourself. On kernel-down, say the memory was not persisted and why.
