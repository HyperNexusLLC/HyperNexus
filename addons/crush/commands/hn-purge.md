---
user-invocable: true
name: hn-purge
description: "Delete a HyperNexus L2 memory by id (or by tag) from Crush. Trigger on '/hn-purge' or 'delete memory'."
---

# /hn-purge <id> [--tag t]

$ARGUMENTS

Remove stored memories, carefully:

1. With an id: `hypernexus MCP delete_memory` with `{id}` — confirm deletion from the
   response envelope.
2. With `--tag`: resolve matching ids first via `/api/memory/search?query=&limit=` filtering
   on the tag, list them, then delete each with `hypernexus MCP delete_memory`.
3. Deletion propagates asynchronously across stores — if asked to confirm it is gone,
   poll ~6s before asserting.

Never delete without the user having named the id or tag. Report exactly what was
removed and what was kept.
