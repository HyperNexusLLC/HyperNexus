---
description: Semantic code search via HyperNexus
argument-hint: <query>
---
Search the codebase for `$ARGUMENTS` via
`GET http://127.0.0.1:7778/api/memory/fts-search?q=<query>` and the
MCP `search`/`grep` tools, then report file references with line
numbers. If the kernel is unreachable, say so and stop.
