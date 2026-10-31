---
name: hypernexus-mcp-routing
description: "Route tool calls through the HyperNexus kernel from mini-swe-agent: stdio MCP server, universal tool endpoint, semantic tool discovery. Use when mini-swe-agent lacks a capability, when choosing an MCP server/tool, or when wiring the hypernexus MCP server."
---

# HyperNexus MCP Routing (mini-swe-agent)

Kernel baseline: `http://127.0.0.1:7778`. Transport: stdio via `bin/hypernexus.exe mcp`.

## Server registration (repo-owned)

`mcp.json` in this directory registers the stdio server (command
`<repo>/bin/hypernexus.exe`, args `["mcp"]`, env `HYPERNEXUS_WORKSPACE_ROOT`
+ `HYPERNEXUS_URL`); the installer merges the same block for settings-based installs.

## Routing a call

1. Tool: `hypernexus_mcp_call` with `{ tool: "<name>", args: {...} }` → `POST /api/agent/tool`.
2. Discovery first when the capability is unknown: `GET /api/mcp/native/search?query=<words>`.
3. Dangerous patterns (`rm -rf`, `sudo `, `chmod -R 777`, `DROP TABLE`, fork bombs)
   are blocked in the `tool_call` hook before they reach the kernel.

## Rules

- stdio env carries only workspace root + kernel URL — never tokens or keys.
- Prefer the registered `hypernexus` MCP server over ad-hoc HTTP for tool execution;
  use HTTP only for memory/status endpoints the MCP surface does not expose.
