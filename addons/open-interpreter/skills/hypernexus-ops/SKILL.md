---
user-invocable: true
name: hypernexus-ops
description: "Operate and verify the HyperNexus kernel from Open Interpreter: health checks, MCP bridge inventory, billing/quotas, audit trail, and verify-before/after discipline for deployments and incidents. Trigger on 'kernel health', 'mcp servers', 'billing', 'quotas', 'audit', 'deploy verification', or 'hypernexus ops'."
---

# HyperNexus Ops (Open Interpreter)

Invoke with `/skill:hypernexus-ops`.

## Tools (via the hypernexus MCP server)

- `system_status` — health before and after production changes (`GET /health` fallback)
- `mcp_status` / `mcp_list_servers` / `mcp_list_tools` — MCP bridge inventory
- Semantic `/api/mcp/tools/search?query=` — find the right downstream tool
- `billing_status` — quotas, depleted models, fallback chain
- Kernel audit trail — record compliance-relevant actions with `add_memory` (tags `ops,audit`)

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

Open Interpreter has no permission-hook surface, so enforcement is by convention:
destructive patterns (`rm -rf`, `sudo`, `chmod -R 777`, `DROP TABLE`,
`git push --force`) get a kernel audit entry first — route them through a
confirming prompt and log with `add_memory` tags `ops,rbac`.
