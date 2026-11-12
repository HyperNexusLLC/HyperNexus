---
name: hn-billing
description: Report HyperNexus billing status, quotas, and fallback chain.
---

Report HyperNexus billing via the `hypernexus` MCP `billing_status` tool (or `GET http://127.0.0.1:7778/api/billing/status` and `GET /api/billing/fallback-chain` if MCP is unreachable). Report provider quotas, depleted models, and the active fallback chain. If the kernel is offline, say so plainly and stop — never invent values.
