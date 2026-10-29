---
name: hn-tools
description: "Discover tools across the assimilated HyperNexus MCP catalog and route calls from Prime Agent. Trigger on '/hn-tools', 'find a tool', or 'tool discovery'."
---

# /hn-tools [query] [--call server.tool {json-args}]

$ARGUMENTS

Tool discovery and routing through the HyperNexus MCP bridge:

- With a query (no `--call`): `await hypernexus.search_tools(query)` /
  `await hypernexus.suggest_tools(context)` to find candidate tools for the need;
  present name, server, and one-line purpose for the best matches.
- With `--call`: invoke via `await hypernexus.mcp_call(server, tool, arguments)`
  using `server`, `tool`, `arguments` (JSON). Report the result envelope.
- With no arguments: `await hypernexus.mcp_status()` + `await hypernexus.mcp_servers()` —
  the live bridge inventory (connected servers, tool counts).

After a successful routed call, suggest persisting which tool worked
(`await hypernexus.memory_fact(..., tags=["tool-routing"])`). If the bridge is
unavailable, fall back to `curl.exe -s http://127.0.0.1:7778/api/mcp/tools`.
