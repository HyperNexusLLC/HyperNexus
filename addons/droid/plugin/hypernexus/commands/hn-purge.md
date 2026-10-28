---
description: Delete a HyperNexus memory by id, or fan out by tag
argument-hint: <memory id | tag>
---

Delete from HyperNexus L2: if the argument looks like a memory id, remove that
entry; if it looks like a tag, list matches first with `search_memory` and ask
for confirmation before removing each. Never purge without confirming scope.
$ARGUMENTS
