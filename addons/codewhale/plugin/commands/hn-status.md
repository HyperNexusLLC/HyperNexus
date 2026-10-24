---
description: Report HyperNexus kernel health, MCP bridge inventory, memory stats, and billing
usage: /hn-status
---

$ARGUMENTS

Report HyperNexus control-plane status, without taking any action:

1. Kernel liveness and version — `mcp__hypernexus__system_status` (fallback:
   `curl -s http://127.0.0.1:7778/health`).
2. MCP bridge inventory — `mcp__hypernexus__mcp_status` (servers connected, tool count).
3. Memory tiers — `mcp__hypernexus__memory_stats` (L2 vault / scratchpad / relations).
4. Billing — `mcp__hypernexus__billing_status` (quotas, depleted models, fallback chain).

Present as a short bullet list. If the kernel is unreachable, say so plainly and point
at `bin\hypernexus.exe serve` — never show a mock state.
