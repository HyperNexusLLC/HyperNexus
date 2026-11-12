---
name: hypernexus-ops
description: "Operate and verify the HyperNexus kernel from Reasonix: health checks, MCP bridge inventory, billing/quotas, RBAC audit trail, and verify-before/after discipline for deployments and incidents. Trigger on 'kernel health', 'mcp servers', 'billing', 'quotas', 'audit', 'deploy verification', or 'hypernexus ops'."
---

# HyperNexus Ops (Reasonix)

## Tools

- `ext__hypernexus__status` / `ext__hypernexus__system_overview` — health before and after production changes
- `ext__hypernexus__mcp_status` / `mcp_servers` / `mcp_tools` — MCP bridge inventory
- `ext__hypernexus__mcp_search` / `tool_search` — find the right downstream tool
- `ext__hypernexus__billing_status` — quotas, depleted models, fallback chain
- `ext__hypernexus__audit_log` — record compliance-relevant actions

## Verify loop (OPS workflow)

1. VERIFY before change: `ext__hypernexus__status`
2. Act (with your normal tools)
3. VERIFY after change: `ext__hypernexus__status`
4. PERSIST: `ext__hypernexus__memory_store` with the outcome and tags `["ops", "deploy"]`

## Health endpoints

```bash
curl -s http://localhost:7778/health                  # kernel liveness + version
curl -s http://localhost:7778/api/system/overview     # full system view
curl -s http://localhost:7778/api/mcp/status          # MCP bridge status
curl -s http://localhost:7778/api/billing/status      # provider billing
curl -s http://localhost:7778/api/billing/fallback-chain
```

## RBAC

The sidecar's `tool.before` / `permission.decision` intercepts enforce HyperNexus RBAC for destructive patterns:

- `HYPERNEXUS_RBAC=audit` (default) — log only, never block
- `HYPERNEXUS_RBAC=ask` — escalate destructive patterns to a permission prompt
- `HYPERNEXUS_RBAC=deny` — deny destructive patterns outright

## Degradation contract

Every kernel call is budgeted and never throws. If the kernel is offline, `ext__hypernexus__*`
tools return short degraded notes and the session continues on local tools.
