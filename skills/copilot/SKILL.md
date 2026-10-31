---
name: hypernexus
description: HyperNexus persistent memory and MCP tool integration for Copilot.
---

# HyperNexus for Copilot

Connect to HyperNexus for persistent memory across coding sessions.

## MCP Server

HyperNexus ships as an Agent Plugins v1.0 bundle
(`addons/copilot/plugin/hypernexus/`). Install it with the Copilot CLI:

```bash
node addons/copilot/install.mjs
node addons/copilot/install.mjs --check
```

The bundle registers the `hypernexus` stdio MCP server (all tools via
`"tools": ["*"]`, kernel exe resolved dynamically, `HYPERNEXUS_URL`
defaulting to `http://127.0.0.1:7778`), 3 skills, 11 `/hn-*` commands,
2 agents, and project hooks from `.github/hooks/hypernexus.json`.

(Kernel is on `http://127.0.0.1:7778`. `HYPERNEXUS_URL` is an optional
override defaulting to `:7778`.)

## Available Tools

- `search_memory` - Search memories
- `add_memory` - Save a memory
- `mcp_list_tools` - Tool inventory across connected servers
- `mcp_call_tool` - Route a call to a downstream tool
- `system_status` - Kernel liveness + version
- `billing_status` - Provider quotas and fallback chain

## Usage

1. Install the plugin (see above), then ask Copilot to remember things:

   ```
   Remember that we're using JWT with bcrypt for auth
   ```

2. In a new session, ask:

   ```
   What auth system did we implement?
   ```

## Verify Connection

```bash
node addons/copilot/install.mjs --check
```
