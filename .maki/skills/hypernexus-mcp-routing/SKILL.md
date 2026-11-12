---
name: hypernexus-mcp-routing
description: Discover kernel MCP tools semantically and route calls through the kernel.
---

# HyperNexus MCP Routing

Tools: `hypernexus_tool_search`, `hypernexus_suggest_tools`,
`hypernexus_mcp_call`, `hypernexus_mcp_status`, `hypernexus_mcp_servers`,
`hypernexus_mcp_tools`, `hypernexus_code_search`, `hypernexus_repomap`.

## Rules

- Capability gap → `hypernexus_tool_search` (natural language), then
  `hypernexus_mcp_call` to route.
- `hypernexus_mcp_status` may be slow (bridge scan); retry once, then
  use `hypernexus_mcp_tools`.
- Prefer kernel-routed calls when local tools lack a capability.
