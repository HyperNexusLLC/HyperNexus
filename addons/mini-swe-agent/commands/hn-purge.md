---
description: Delete a HyperNexus memory by id or purge by tag
argument-hint: "<memory id | tag>"
---

Delete from L2 memory:

1. If the argument looks like an id (8+ alnum/_/- chars), call `ext__hypernexus__memory_delete` with `id`.
2. Otherwise treat it as a tag and call `ext__hypernexus__memory_delete` with `tag` (capped fan-out, max 20).
3. Confirm deleted count.

$ARGUMENTS
