---
name: hn-purge
description: Retire a HyperNexus memory (confirms first).
---

Retiring memory is destructive. First confirm with the user in plain words, then bury the named memory id via the `hypernexus` MCP `delete_memory` tool (or `POST http://127.0.0.1:7778/api/memory/limbo/bury`, recoverable via `/api/memory/limbo/resurrect`). Report the result. If the kernel is offline, say so and stop — never invent an id.
