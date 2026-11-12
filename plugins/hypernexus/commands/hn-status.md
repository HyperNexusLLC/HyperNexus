---
name: hn-status
description: HyperNexus kernel health, version, uptime, and MCP bridge status.
---

Check the HyperNexus kernel status first (use the `hypernexus` MCP `status` tool, or `GET http://127.0.0.1:7778/health` if MCP is unreachable). Report: version, uptime, MCP connected-server count, tool count, and provider state. If the kernel is offline, say so plainly and continue with local tools.
