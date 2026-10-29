---
description: List HyperNexus MCP bridge servers and tools
argument-hint: none
---
Query `GET http://127.0.0.1:7778/api/mcp/status` and
`GET http://127.0.0.1:7778/api/mcp/servers`, then report connected
server count, tool count, and any degraded servers. If unreachable, say
the kernel is down and stop.
