---
name: hypernexus-mcp-routing
description: "Route tool calls through the HyperNexus kernel from pi: stdio MCP server, universal tool endpoint, semantic tool discovery. Use when pi lacks a capability, when choosing an MCP server/tool, or when wiring the hypernexus MCP server."
---

# HyperNexus MCP Routing (pi)

Kernel baseline: `http://127.0.0.1:7778`. Transport: stdio via `bin/hypernexus.exe mcp`.

## Server registration (extension-owned)

`pi-hypernexus.ts` registers it at load:

```ts
pi.registerMcpServer("hypernexus", {
  command: "C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe",
  args: ["mcp"],
  env: {
    HYPERNEXUS_WORKSPACE_ROOT: "C:/Users/hyper/workspace/HyperNexus",
    HYPERNEXUS_URL: "http://127.0.0.1:7778",
  },
});
```

Repo-level `mcp.json` in this directory mirrors the same block for settings-based installs.

## Routing a call

1. Tool: `hn_mcp_call` with `{ tool: "<name>", args: {...} }` → `POST /api/agent/tool`.
2. Discovery first when the capability is unknown: `GET /api/mcp/native/search?query=<words>`.
3. Dangerous patterns (`rm -rf`, `sudo `, `chmod -R 777`, `DROP TABLE`, fork bombs)
   are blocked in the `tool_call` hook before they reach the kernel.

## Rules

- stdio env carries only workspace root + kernel URL — never tokens or keys.
- Prefer the registered `hypernexus` MCP server over ad-hoc HTTP for tool execution;
  use HTTP only for memory/status endpoints the MCP surface does not expose.
