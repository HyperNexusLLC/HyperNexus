---
name: hn-context
description: Show HyperNexus saved context state.
---

List HyperNexus saved contexts via the `hypernexus` MCP tools (or `GET http://127.0.0.1:7778/api/memory/contexts` if MCP is unreachable). If the prompt names a context id, fetch it via `GET /api/memory/context/get?id=<id>` and report its contents. If the kernel is offline, say so plainly and stop.
