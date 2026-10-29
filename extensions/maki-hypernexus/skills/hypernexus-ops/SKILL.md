---
name: hypernexus-ops
description: Operate and verify the HyperNexus kernel from maki — health checks, MCP bridge inventory, billing/quotas, verify-before/after discipline for deployments and incidents, graceful degradation when the kernel is offline.
---

# HyperNexus Ops (maki)

## Tools

- `hypernexus_status` (plugin) or `system_status` / `get_system_stats` (MCP) — kernel liveness, version, host stats
- `mcp_status` / `mcp_list_servers` / `mcp_list_tools` — MCP bridge inventory
- `mcp_server_test` — probe one configured server before trusting it
- `hypernexus_billing` (plugin) or `billing_status` (MCP) — quotas, depleted models, fallback chain
- `memory_stats` — L2 vault / scratchpad / relation tier counts

## Verify loop (OPS workflow)

1. VERIFY before change: `hypernexus_status` (or `GET /health`)
2. Act (with normal tools)
3. VERIFY after change: `hypernexus_status`
4. PERSIST: `hypernexus_memory_add` (or `add_memory`) with the outcome, tags `ops,deploy`

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
- A partial tool list never means the kernel is dead — check `hypernexus_status`.
- If the MCP connection is stale (kernel was swapped/restarted), `/reload`
  maki and restart the session (config touch alone may not reconnect
  stale stdio state).

## Kernel service (Windows)

```powershell
bin\hypernexus.exe serve          # kernel daemon, binds 7778
taskkill /IM hypernexus.exe /F    # stop all kernel/stdio processes before binary swaps
```
