---
name: hn-tools
description: "Discover tools across the assimilated HyperNexus MCP catalog and route calls from Jcode. Trigger on '/hn-tools', 'find a tool', or 'tool discovery'."
---

# /hn-tools [query] [--call serverName.toolName {json-args}]

$ARGUMENTS

Tool discovery and routing through the HyperNexus MCP bridge:

- With a query (no `--call`): `mcp__hypernexus__mcp_list_tools` and/or the semantic
  search over `/api/mcp/tools/search` to find candidate tools for the need; present
  name, server, and one-line purpose for the best matches.
- With `--call`: invoke via `mcp__hypernexus__mcp_call_tool` using
  `serverName`, `toolName`, `arguments` (JSON). Report the result envelope.
- With no arguments: `mcp__hypernexus__mcp_status` + `mcp_list_servers` — the live
  bridge inventory (connected servers, tool counts).

After a successful routed call, suggest persisting which tool worked
(`mcp__hypernexus__add_memory`, tags `tool-routing`). If the bridge is unavailable,
fall back to `curl -s http://127.0.0.1:7778/api/mcp/tools`.
