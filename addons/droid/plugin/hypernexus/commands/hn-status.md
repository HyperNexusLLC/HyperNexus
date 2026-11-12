---
description: HyperNexus kernel status — health, memory tiers, MCP bridge, billing
---

Check the HyperNexus kernel and report status. Use the `hypernexus` MCP server
tools when available (`mcp__hypernexus__system_status`, `mcp__hypernexus__memory_stats`,
`mcp__hypernexus__billing_status`), otherwise query the HTTP API directly:

- `GET http://localhost:7778/health` — liveness + version
- `GET http://localhost:7778/api/memory/stats` — L1/L2/L3 counts
- `GET http://localhost:7778/api/mcp/status` — MCP bridge
- `GET http://localhost:7778/api/billing/status` — quotas

Report: kernel version/uptime, memory tier counts, MCP server count, billing state.
If the kernel is unreachable, say so in one line and continue with local tools.
$ARGUMENTS
