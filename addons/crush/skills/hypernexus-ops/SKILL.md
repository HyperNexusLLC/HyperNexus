---
user-invocable: true
name: hypernexus-ops
description: "Operate and verify the HyperNexus kernel from Crush: health checks, MCP bridge inventory, billing/quotas, and verify-before/after discipline for deployments and incidents. Trigger on 'kernel health', 'mcp servers', 'billing', 'quotas', 'deploy verification', or 'hypernexus ops'."
---

# HyperNexus Ops (Crush)

All tools below are the hypernexus MCP server tools (58 total).

## Tools

- `system_status` — health before and after production changes (fallback: `GET /health`)
- `mcp_status` / `mcp_list_servers` / `mcp_list_tools` — MCP bridge inventory
- `mcp_call_tool` + semantic `GET /api/mcp/tools/search?query=` — find and route the right downstream tool
- `billing_status` — quotas, depleted models, fallback chain
- `memory_stats` — vault / scratchpad / relation counts
- `add_memory` (tags `ops,deploy`) — persist the outcome

## Verify loop (OPS workflow)

1. VERIFY before change: `system_status`
2. Act (with your normal tools)
3. VERIFY after change: `system_status`
4. PERSIST: `add_memory` with the outcome and tags `ops,deploy`

## Health endpoints

```bash
curl -s http://localhost:7778/health                  # kernel liveness + version
curl -s http://localhost:7778/api/system/overview     # full system view
curl -s http://localhost:7778/api/mcp/status          # MCP bridge status
curl -s http://localhost:7778/api/billing/status      # provider billing
```

## RBAC

The `hypernexus-gate` PreToolUse hook enforces a fail-open policy gate:

- default — allow everything, deny only destructive shell patterns (`rm -rf /`, `mkfs`, fork bombs)
- edit `hooks/hn-pre-tool.sh` to add targeted `exit 2` denials for your own boundaries

## Degradation contract

Every kernel call is budgeted and never throws. If the kernel is offline, MCP
tools return short degraded notes and the session continues on local tools.
