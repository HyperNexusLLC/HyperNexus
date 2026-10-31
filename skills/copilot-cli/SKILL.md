---
name: hypernexus
description: HyperNexus persistent memory and MCP tool integration for Copilot CLI.
---

# HyperNexus for Copilot CLI

Connect to HyperNexus for persistent memory across coding sessions.

## MCP Server

The installer registers the `hypernexus` stdio MCP server in
`~/.copilot/mcp-config.json` (kernel exe + workspace root resolved
dynamically) and copies skills plus `/hn-*` command-skills into
`~/.copilot/skills/`:

```bash
node addons/copilot-cli/install.mjs
node addons/copilot-cli/install.mjs --check
```

Portable manual wiring (`hypernexus` resolved via `PATH`; see
`addons/copilot-cli/mcp.json`):

```json
{
  "mcpServers": {
    "hypernexus": {
      "command": "hypernexus",
      "args": ["mcp"],
      "env": {
        "HYPERNEXUS_WORKSPACE_ROOT": "<absolute-path-to-repo>",
        "HYPERNEXUS_URL": "http://127.0.0.1:7778"
      }
    }
  }
}
```

(Kernel is on `http://127.0.0.1:7778`. `HYPERNEXUS_WORKSPACE_ROOT` is
required; `HYPERNEXUS_URL` is an optional override defaulting to `:7778`.)

Copilot CLI has no hook API — hooks are not registered; the MCP server
plus skills carry the integration.

## Available Tools

- `memory_scratchpad_get` - Get a memory
- `memory_scratchpad_set` - Save a memory
- `memory_search` - Search memories

## Usage

1. Install (see above; Copilot login itself stays interactive:
   `copilot login --device-code`), then ask Copilot CLI to remember
   things:

   ```
   Remember that we're using JWT with bcrypt for auth
   ```

2. In a new session, ask:

   ```
   What auth system did we implement?
   ```

## Verify Connection

```bash
node addons/copilot-cli/install.mjs --check
node addons/copilot-cli/bin/meta-muse-key.mjs --check
```
