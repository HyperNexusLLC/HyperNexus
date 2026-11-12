---
name: hypernexus-ops
description: "Operate and verify the HyperNexus kernel from Codewhale: health checks, MCP bridge inventory, billing/quotas, verify-before/after discipline for deployments and incidents, and graceful degradation when the kernel is offline. Trigger on 'kernel health', 'mcp servers', 'billing', 'quotas', 'deploy verification', or 'hypernexus ops'."
---

# HyperNexus Ops (Codewhale)

## Tools

- `mcp__hypernexus__system_status` / `get_system_stats` — kernel liveness, version, host stats
- `mcp__hypernexus__mcp_status` / `mcp_list_servers` / `mcp_list_tools` — MCP bridge inventory
- `mcp__hypernexus__mcp_server_test` — probe one configured server before trusting it
- `mcp__hypernexus__billing_status` — quotas, depleted models, fallback chain
- `mcp__hypernexus__memory_stats` — L2 vault / scratchpad / relation tier counts

## Verify loop (OPS workflow)

1. VERIFY before change: `mcp__hypernexus__system_status`
2. Act (with your normal tools)
3. VERIFY after change: `mcp__hypernexus__system_status`
4. PERSIST: `mcp__hypernexus__add_memory` with the outcome, tags `"ops,deploy"`

## Health endpoints (works with or without the MCP extension)

```bash
curl -s http://localhost:7778/health                  # kernel liveness + version
curl -s http://localhost:7778/api/mcp/status          # MCP bridge status
curl -s http://localhost:7778/api/billing/status      # provider billing
curl -s http://localhost:7778/api/billing/fallback-chain
```

## Degradation contract

- Every kernel call is budgeted and never throws. If the kernel is offline, the
  `mcp__hypernexus__*` tools return short degraded notes and the session continues
  on Codewhale-native tools.
- The stdio server self-heals: it merges the live kernel tool inventory with its
  static core list and serves the last-good inventory when the kernel is slow
  (15s TTL cache + retry). A partial tool list never means the kernel is dead —
  check `system_status`.
- If the MCP connection itself is stale (kernel was swapped/restarted), run
  `codewhale mcp validate` and restart the Codewhale session (config touch alone
  does not reconnect stale stdio state).

## Kernel service (Windows)

```powershell
bin\hypernexus.exe serve          # kernel daemon, binds 7778 (lockfile records port)
taskkill /IM hypernexus.exe /F     # stop all kernel/stdio processes before binary swaps
```

Binary swap order matters: kill all `hypernexus` processes → verify gone →
copy new exe (as a standalone statement, never chained behind `if errorlevel`)
→ start → wait for `/health`.
