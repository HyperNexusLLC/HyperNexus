---
name: hypernexus-status-billing
description: "HyperNexus health + billing from Prime Agent: kernel reachability, memory counts, subscription state. Use when asked 'is HyperNexus up', for status checks, or billing checks."
---

# HyperNexus Status + Billing (Prime Agent)

Kernel baseline: `http://127.0.0.1:7778`.

## Checks (all read-only, ~5s budget each)

| Check | Python skill | Endpoint |
|---|---|---|
| Liveness + version | `kernel_status()` / `run()` | `GET /health` → `{ ok, version, uptimeSec }` |
| System overview | `system_status()` | kernel system stats |
| L2 size | `memory_list(limit=1)` | `GET /api/memory/list` |
| Knowledge | `knowledge_stats()` | `GET /api/knowledge/stats` |
| Sessions | `sessions()` / `session_context()` | `/api/sessions/summary` |
| Billing | `billing_status()` | `GET /api/billing/status` |

Sectioned overview: `status("memory" | "mcp" | "tools" | "sessions")`.
MCP equivalents: `system_status`, `billing_status`, `memory_stats`, `get_system_stats`.

## Surfaces

- Command: `/hn-status` (see `commands/hn-status.md`, load via `--prompt-template`).
- Scheduled status ping: `prime-agent schedule add <agent> "0 9 * * 1-5" -- "Report HyperNexus status"`.

## Rules

- Status reads never throw; offline kernel → report `KernelUnreachable` plainly
  and point at `bin\hypernexus.exe serve` — never show a mock state.
- Billing responses are display-only; never act on subscription state from Prime Agent.
