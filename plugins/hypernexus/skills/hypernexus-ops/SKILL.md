---
name: hypernexus-ops
description: Kernel health, MCP bridge status, providers, and billing. Use for status checks, before assuming the kernel is up, and for billing questions.
---

# HyperNexus Ops

## Tools (MCP server `hypernexus`)

- `status` — kernel health, version, uptime, MCP bridge state. Call first when the kernel may be offline.
- `system_overview` — full overview: health, MCP inventory, providers, memory tiers, mesh
- `mcp_status` — bridge status: connected servers + counts
- `session_context` — active goal, last objective, cross-session links

## Billing

- Pricing: $1.99/14-day trial → $5/seat/mo → $200 one-time founding fee per team.
- Never touch billing endpoints without Robert's direct word.

## Rules

- If the kernel is offline, say so and continue with local tools.
- Report version + uptime when asked for status.
