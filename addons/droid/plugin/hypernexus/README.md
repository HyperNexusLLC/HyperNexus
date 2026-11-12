# HyperNexus for Droid (Factory)

Full bridge: Droid ↔ HyperNexus control plane (Go kernel, default `http://127.0.0.1:7778`).

## What you get

| Surface | Detail |
|---|---|
| **MCP server** | `hypernexus` stdio server (`bin/hypernexus.exe mcp`, tool namespace `mcp__hypernexus__*`) — memory, scratchpad, MCP discovery/routing, code search, system/billing, processes |
| **3 skills** | `hypernexus` (discipline + tool map), `hypernexus-ops` (verify loop), `hypernexus-workflows` (MEM-FIRST/DISCOVER/HARVEST/HANDOFF/OPS) |
| **11 commands** | `/hn-status /hn-store /hn-remember /hn-search /hn-tools /hn-session /hn-context /hn-plan /hn-summary /hn-restore /hn-purge` |
| **8 hooks** | `SessionStart` (bootstrap + prompt), `UserPromptSubmit` (fast FTS recall + `@memory:key`), `PreToolUse` (MCP audit + destructive RBAC), `PostToolUse` (edit observations + MCP audit), `Stop` (turn checkpoint), `SessionEnd` (handoff), `PreCompact` (compaction context), `SubagentStop` (result persistence) |
| **2 droids** | `hypernexus-orchestrator` (full loop, MCP-attached), `hypernexus-researcher` (read-only) |
| **1 output style** | `HyperNexus Report` (recall/persist-aware review format) |

## Contract (mirrors `addons/shared/hypernexus.manifest.json`)

- Every hook kernel call is budgeted and **never throws** — a hung/offline kernel degrades, never stalls a turn.
- Hot-path hooks (`SessionStart`, `UserPromptSubmit`, `PreCompact`) use FTS-only search (≤3s curl timeouts). Vector search is for explicit tools.
- Per-event side effects (audit, checkpoints, handoffs) are fire-and-forget backgrounded curls.
- Response shapes are normalized at the adapter boundary (FTS `{record:{…}}` vs flat rows, JSON-string rows from `/api/memory/list`).

## RBAC

`HYPERNEXUS_RBAC=audit` (default, log only) · `=ask` (confirm destructive `Execute`) · `=deny` (block).

## Test

```bash
node addons/droid/bin/test-droid-ext.mjs   # battery: plugin layout, hooks, MCP, kernel
```
