---
name: hypernexus-status-billing
description: "HyperNexus health + billing from mini-swe-agent: kernel reachability, memory counts, mesh peers, subscription state. Use when asked 'is HyperNexus up', for status-bar wiring, or billing checks."
---

# HyperNexus Status + Billing (mini-swe-agent)

Kernel baseline: `http://127.0.0.1:7778`.

## Checks (all read-only, 2.5s budget each)

| Check | Endpoint / surface |
|---|---|
| Liveness + version | `GET /health` → `{ ok, version, uptimeSec }` |
| L2 size | `GET /api/memory/list?limit=1` → `total`/`count` |
| L3 size | `GET /api/memory/cold-archive/count` |
| Mesh peers | `GET /api/mesh/status` → `peersCount` |
| Billing | `GET /api/billing/status` |

## Surfaces

- Tool: `hypernexus_system_status` (health + L2 + peers in one call), `hypernexus_billing_status`.
- Command: `/hn-status`. Shortcut: `ctrl+shift+h` (health ping + notify).
- Status bar: `session_start` sets `hn` key to `HyperNexus v<version>` /
  `degraded` / `offline` via `ctx.ui.setStatus` (additive — never replaces the
  model/context footer). Headless-safe: skipped when `ctx.hasUI` is false.

## Rules

- Status reads never throw; offline kernel → `degraded`/`offline`, not a crash.
- Billing responses are display-only; never act on subscription state from mini-swe-agent.
