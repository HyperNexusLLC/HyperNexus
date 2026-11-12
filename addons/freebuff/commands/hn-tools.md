---
user-invocable: true
name: hn-tools
description: "Discover tools across the assimilated HyperNexus MCP catalog and route calls from Freebuff. Trigger on '/skill:hn-tools', 'find a tool', or 'tool discovery'."
---

# /skill:hn-tools [query] [--call serverName.toolName {json-args}]

Tool discovery and routing through the HyperNexus MCP bridge:

- With a query (no `--call`): `hypernexus MCP mcp_list_tools` and/or the semantic
  search over `/api/mcp/tools/search` to find candidate tools for the need; present
  name, server, and one-line purpose for the best matches.
- With `--call`: invoke via `hypernexus MCP mcp_call_tool` using
  `serverName`, `toolName`, `arguments` (JSON). Report the result envelope.
- With no arguments: `hypernexus MCP mcp_status` + `mcp_list_servers` — the live
  bridge inventory (connected servers, tool counts).

After a successful routed call, suggest persisting which tool worked
(`hypernexus MCP add_memory`, tags `tool-routing`). If the bridge is unavailable,
fall back to `curl -s http://127.0.0.1:7778/api/mcp/tools`.
