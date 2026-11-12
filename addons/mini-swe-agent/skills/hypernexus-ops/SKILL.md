---
name: hypernexus-ops
description: "Operate and verify the HyperNexus kernel from mini-swe-agent: health checks, MCP bridge inventory, billing/quotas, RBAC audit trail, and verify-before/after discipline for deployments and incidents. Trigger on 'kernel health', 'mcp servers', 'billing', 'quotas', 'audit', 'deploy verification', or 'hypernexus ops'."
---

# HyperNexus Ops

## Tools

- `hypernexus_status` / `hypernexus_system_overview` — health before and after production changes
- `hypernexus_mcp_status` / `hypernexus_mcp_servers` / `hypernexus_mcp_tools` — MCP bridge inventory
- `hypernexus_mcp_search` / `hypernexus_tool_search` — find the right downstream tool
- `hypernexus_billing_status` — quotas, depleted models, fallback chain
- `hypernexus_audit_log` — record compliance-relevant actions

## Verify loop (OPS workflow)

1. VERIFY before change: `hypernexus_status`
2. Act (with your normal tools)
3. VERIFY after change: `hypernexus_status`
4. PERSIST: `hypernexus_memory_store` with the outcome and tags `["ops", "deploy"]`

## Health endpoints

```bash
curl -s http://localhost:7778/health                  # kernel liveness + version
curl -s http://localhost:7778/api/system/overview     # full system view
curl -s http://localhost:7778/api/mcp/status          # MCP bridge status
curl -s http://localhost:7778/api/billing/status      # provider billing
curl -s http://localhost:7778/api/billing/fallback-chain
```

## RBAC

The plugin's permission hook enforces HyperNexus RBAC policy for destructive patterns:

- `HYPERNEXUS_RBAC=audit` (default) — log only, never block
- `HYPERNEXUS_RBAC=ask` — escalate destructive patterns to a permission prompt
- `HYPERNEXUS_RBAC=deny` — deny destructive patterns outright

## Degradation contract

Every kernel call is budgeted and never throws. If the kernel is offline, `hypernexus_*`
tools return short degraded notes and the session continues on local tools.
