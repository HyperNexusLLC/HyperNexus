---
name: hypernexus-mcp-routing
description: "Route tool calls through the HyperNexus kernel from Prime Agent: stdio MCP server, semantic tool discovery, downstream MCP bridge. Use when Prime Agent lacks a capability, when choosing an MCP server/tool, or when wiring the hypernexus MCP server."
---

# HyperNexus MCP Routing (Prime Agent)

Kernel baseline: `http://127.0.0.1:7778`. Transport: stdio via `bin/hypernexus.exe mcp`.

## Server registration (installer-owned)

```powershell
prime-agent mcp add hypernexus --force -- <root>\bin\hypernexus.exe mcp
```

with env `HYPERNEXUS_WORKSPACE_ROOT=<repo-root>` and
`HYPERNEXUS_URL=http://127.0.0.1:7778` (see `mcp.json` in this addon).
Verify: `prime-agent mcp list` contains `hypernexus`; `prime-agent mcp get hypernexus` exits 0.

Known host quirk: a server added while a session runs appears in
`mcp.list_connections()` immediately, but tool dispatch uses the settings
snapshot the worker loaded at startup — start a **new** session after registering.
The Python skill talks HTTP directly and is immune to this.

## Routing a call

1. Discovery first when the capability is unknown: `search_tools(query)` /
   `suggest_tools(context)` (semantic search over 26k+ tools), or
   `mcp_search_tools(query)` for downstream servers.
2. Downstream bridge: `mcp_status()`, `mcp_servers()`, `mcp_tools(server)`,
   then `mcp_call(server, tool, arguments)`.
3. MCP equivalents on the 58-tool server: `mcp_list_servers`, `mcp_list_tools`,
   `mcp_call_tool`, `mcp_status`, `mcp_server_test`.

## Rules

- stdio env carries only workspace root + kernel URL — never tokens or keys.
- Prefer the registered `hypernexus` MCP server for first-class tool calls;
  use the Python skill when results must be composed in Python.
- Use HTTP only for memory/status endpoints the MCP surface does not expose.
