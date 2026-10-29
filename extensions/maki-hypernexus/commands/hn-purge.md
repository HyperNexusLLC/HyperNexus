---
description: Retire a HyperNexus memory (confirm first)
argument-hint: <memory-id>
---
Retiring memory is destructive. First confirm with the user in plain
words, then bury `$ARGUMENTS` via
`POST http://127.0.0.1:7778/api/memory/limbo/bury` (recoverable via
`/api/memory/limbo/resurrect`) or the MCP `delete_memory` tool.
Report the result. If the kernel is unreachable, say so and stop —
never invent an id.
