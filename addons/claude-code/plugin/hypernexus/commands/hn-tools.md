---
description: Discover tools across the HyperNexus MCP bridge and route a call to one
---

Discover and route MCP tools through the HyperNexus bridge:

1. Inventory — `mcp__hypernexus__mcp_list_tools` (or `mcp_list_servers` for server scope).
2. Narrow — `mcp__hypernexus__search` with natural language when the catalog is large.
3. Route — `mcp__hypernexus__mcp_call_tool` with `serverName`, `toolName`, `arguments`.
4. Remember — `mcp__hypernexus__add_memory` which tool worked (tags `task,mcp-routing`).

Probe an untrusted server first with `mcp__hypernexus__mcp_server_test`. If the kernel
is down, say so and continue with Claude Code-native tools.

Arguments: $ARGUMENTS
