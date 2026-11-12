---
name: hn-status
description: "Report HyperNexus kernel health, MCP bridge inventory, memory stats, and billing from Prime Agent. Trigger on '/hn-status', 'hypernexus status', or 'kernel health'."
---

# /hn-status

$ARGUMENTS

Report HyperNexus control-plane status, without taking any action:

1. Kernel liveness and version — `await hypernexus.kernel_status()` (fallback:
   `curl.exe -s -m 5 http://127.0.0.1:7778/health`).
2. MCP bridge inventory — `await hypernexus.mcp_status()` (servers connected, tool count).
3. Memory tiers — `await hypernexus.memory_list(1)` size probe + `await hypernexus.system_status()`.
4. Billing — `await hypernexus.billing_status()` (quotas, depleted models, fallback chain).

Present as a short bullet list. If the kernel is unreachable, say so plainly and point
at `bin\hypernexus.exe serve` — never show a mock state.
