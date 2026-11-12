---
description: Report HyperNexus kernel health, MCP bridge inventory, memory stats, and billing
argument-hint: "[no arguments]"
---

Report HyperNexus control-plane status, without taking any action:

1. Kernel liveness and version — `ext__hypernexus__status` (fallback: `GET http://127.0.0.1:7778/health`).
2. MCP bridge inventory — `ext__hypernexus__mcp_status` (servers connected, tool count).
3. Memory tiers — `ext__hypernexus__memory_stats` (L2 vault / scratchpad / relations).
4. Billing — `ext__hypernexus__billing_status` (quotas, depleted models, fallback chain).

Present as a short bullet list. If the kernel is unreachable, say so plainly and point
at `bin\hypernexus.exe serve` — never show a mock state.
$ARGUMENTS
