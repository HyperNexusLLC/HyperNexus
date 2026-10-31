---
user-invocable: true
name: hn-status
description: "Report HyperNexus kernel health, MCP bridge inventory, memory stats, and billing from Open Interpreter. Trigger on '/skill:hn-status', 'hypernexus status', or 'kernel health'."
---

# /skill:hn-status

Report HyperNexus control-plane status, without taking any action:

1. Kernel liveness and version — `hypernexus MCP system_status` (fallback:
   `curl -s http://127.0.0.1:7778/health`).
2. MCP bridge inventory — `hypernexus MCP mcp_status` (servers connected, tool count).
3. Memory tiers — `hypernexus MCP memory_stats` (L2 vault / scratchpad / relations).
4. Billing — `hypernexus MCP billing_status` (quotas, depleted models, fallback chain).

Present as a short bullet list. If the kernel is unreachable, say so plainly and point
at `bin\hypernexus.exe serve` — never show a mock state.
