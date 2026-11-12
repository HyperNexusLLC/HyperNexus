---
name: hypernexus-ops
description: "Operate and verify the HyperNexus kernel from GitHub Copilot CLI via the hypernexus MCP server: health checks, MCP bridge inventory, billing and quotas, audit trail, and verify-before/after discipline for deployments and incidents. Trigger on 'kernel health', 'mcp servers', 'billing', 'quotas', 'audit', 'deploy verification', or 'hypernexus ops'."
allowed-tools:
  - Read
  - Grep
---

# HyperNexus Ops (GitHub Copilot CLI)

## Tools

- `mcp__hypernexus__system_status` / `get_system_stats` — health before and after production changes
- `mcp__hypernexus__mcp_list_servers` / `mcp_list_tools` — MCP bridge inventory
- `mcp__hypernexus__billing_status` — quotas, depleted models, fallback chain
- HTTP `GET /health`, `/api/system/overview`, `/api/mcp/status`, `/api/billing/status`, `/api/billing/fallback-chain`

## Verify loop (OPS workflow)

1. VERIFY before change: `system_status`
2. Act (with your normal tools)
3. VERIFY after change: `system_status`
4. PERSIST: `add_memory` with the outcome and tags `["ops", "deploy"]`

## Health endpoints

```bash
curl -s http://localhost:7778/health                  # kernel liveness + version
curl -s http://localhost:7778/api/system/overview     # full system view
curl -s http://localhost:7778/api/mcp/status          # MCP bridge status
curl -s http://localhost:7778/api/billing/status      # provider billing
curl -s http://localhost:7778/api/billing/fallback-chain
```

## RBAC

The project's native Copilot hooks enforce HyperNexus RBAC policy for destructive patterns:

- `HYPERNEXUS_RBAC=audit` (default) — log only, never block
- `HYPERNEXUS_RBAC=ask` — escalate destructive patterns to a permission prompt
- `HYPERNEXUS_RBAC=deny` — deny destructive patterns outright

## Degradation contract

Every kernel call made by hooks is budgeted and never throws. If the kernel is
offline, MCP tools surface the failure and the session continues on local tools.
