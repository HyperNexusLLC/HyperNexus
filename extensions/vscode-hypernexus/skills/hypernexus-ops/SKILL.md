---
name: hypernexus-ops
description: Operate and verify the HyperNexus kernel from VS Code — health checks, MCP bridge inventory, billing/quotas, verify-before/after discipline for deployments and incidents, graceful degradation when the kernel is offline.
---

# HyperNexus Ops (VS Code)

## Tools

- `system_status` / `get_system_stats` — kernel liveness, version, host stats
- `mcp_status` / `mcp_server_test` — bridge health, probe one server
- HTTP: `GET http://127.0.0.1:7778/health`, `GET /api/system/status`,
  `GET /api/billing/status`, `GET /api/billing/fallback-chain`

## Verify loop

1. Record the baseline (`hypernexus.runOpsCheck` or `GET /health`).
2. Apply the change.
3. Re-query and report any difference.
4. Persist the outcome via `POST /api/memory/facts/add` (tags `ops,deploy`).

Port **7778** is authoritative; port 8080 is stale. If the kernel is
unreachable, continue locally and say so in one line.
