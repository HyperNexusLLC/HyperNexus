---
name: hypernexus
description: HyperNexus AI control plane — persistent L2 memory, MCP tool routing, agent dispatch, and kernel status. Use when the task benefits from cross-session memory, tool discovery, or kernel health/billing state.
---

# HyperNexus

Local AI control plane (Go kernel, `http://127.0.0.1:7778`).

## Memory (L2, persistent)

- `POST /api/memory/add` — store a fact.
- `GET /api/memory/search?query=` — semantic search.
- `POST /api/agent-memory/add`, `GET /api/agent-memory/search` — agent memory.

## Tool routing

- `GET /api/mcp/status`, `GET /api/mcp/servers` — discovery.
- `POST /api/agent/tool` — route a call through the kernel.

## Status

- `GET /health`, `GET /api/system/status`, `/api/billing/*` — health and billing.
