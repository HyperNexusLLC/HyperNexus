---
description: Discover MCP tools for a capability via HyperNexus semantic search
argument-hint: "<capability description>"
---

Discover the right MCP tool for the requested capability:

1. Call `ext__hypernexus__suggest_tools` first (preemptive advertiser state).
2. Then call `ext__hypernexus__tool_search` with the capability description.
3. Present the top matches with server-qualified names.
4. To invoke one, route via `ext__hypernexus__mcp_call` with the chosen tool + args.

$ARGUMENTS
