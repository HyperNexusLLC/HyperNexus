---
name: hypernexus-ops
description: Operate and verify the HyperNexus kernel from Muse — health checks, MCP bridge inventory, billing/quotas, verify-before/after discipline for deployments and incidents, graceful degradation when the kernel is offline.
---

# HyperNexus Ops (Muse)

Local AI control plane (Go kernel, `http://127.0.0.1:7778`).

## Health and status

- `GET /health` — liveness, version, uptime.
- `GET /api/system/status` — startup summary.
- `GET /api/mcp/status`, `GET /api/mcp/servers` — bridge inventory.

## Billing

- `GET /api/billing/status`, `/api/billing/fallback-chain`,
  `/api/billing/provider-quotas`, `/api/billing/cost-history`.

## Verify loop

Record the baseline, apply the change, re-query, report any difference,
persist via `POST /api/memory/facts/add` (tags `ops,deploy`).
