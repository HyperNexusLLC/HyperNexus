---
name: hypernexus-tools
description: Semantic tool discovery and invocation across the MCP catalog via the HyperNexus router. Use when a capability gap appears, before building something that may already exist.
---

# HyperNexus Tool Routing

The kernel routes tool calls across 58+ MCP servers. Discover, don't guess.

## Tools (MCP server `hypernexus`)

- `tool_search` — describe what you need, get the best matching tools
- `tool_discover` — native router working set for a capability
- `suggest_tools` — proactive suggestions derived from this conversation
- `mcp_status` / `mcp_servers` / `mcp_tools` — bridge inventory
- `mcp_call` — invoke a discovered tool through the kernel router

## Rules

- On a capability gap: `suggest_tools` → `tool_search` → `mcp_call`.
- Prefer the router over hand-rolling integrations.
- Record the outcome with `record_observation` when the finding is non-obvious.
