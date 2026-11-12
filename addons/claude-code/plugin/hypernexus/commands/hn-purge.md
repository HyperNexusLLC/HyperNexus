---
description: Delete a HyperNexus L2 memory by id after showing what will be removed
---

Delete a stored memory:

1. First show the entry — `mcp__hypernexus__search_memory` for the query or id fragment
   so the user can confirm the right record.
2. Delete — `mcp__hypernexus__delete_memory` with the exact id.
3. Confirm what was removed.

Require an explicit id or a confirmed single match — never bulk-delete on a vague query.

Arguments: $ARGUMENTS
