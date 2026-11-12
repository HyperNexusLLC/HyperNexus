---
name: hypernexus-ops
description: Operate and verify the HyperNexus kernel from Meta Code — health checks, MCP bridge inventory, billing/quotas, verify-before/after discipline for deployments and incidents, graceful degradation when the kernel is offline.
---

# HyperNexus Ops (Meta Code)

## Tools

- `system_status` / `get_system_stats` — kernel liveness, version, host stats
- `mcp_status` / `mcp_list_servers` / `mcp_list_tools` — MCP bridge inventory
- `mcp_server_test` — probe one configured server before trusting it
- `billing_status` — quotas, depleted models, fallback chain
- `memory_stats` — L2 vault / scratchpad / relation tier counts

## Verify loop (OPS workflow)

1. VERIFY before change: `system_status` (or `GET /health`)
2. Act (with normal tools)
3. VERIFY after change: `system_status`
4. PERSIST: `add_memory` with the outcome, tags `ops,deploy`

## Health endpoints (work with or without the MCP extension)

```bash
curl -s http://localhost:7778/health                  # kernel liveness + version
curl -s http://localhost:7778/api/mcp/status          # MCP bridge status
curl -s http://localhost:7778/api/billing/status      # provider billing
curl -s http://localhost:7778/api/billing/fallback-chain
```

## Degradation contract

- Every kernel call is budgeted and never throws. If the kernel is offline,
  continue on native tools and note the gap briefly.
- A partial tool list never means the kernel is dead — check `system_status`.
- If the MCP connection is stale (kernel was swapped/restarted), reinstall
  the plugin and restart the session (config touch alone may not reconnect
  stale stdio state).

## Kernel service (Windows)

```powershell
bin\hypernexus.exe serve          # kernel daemon, binds 7778
taskkill /IM hypernexus.exe /F    # stop all kernel/stdio processes before binary swaps
```
