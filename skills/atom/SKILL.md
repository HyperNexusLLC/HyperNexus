---
name: hypernexus
description: HyperNexus persistent memory and MCP tool integration for AtomCode.
---

# HyperNexus for AtomCode

Connect to HyperNexus for persistent memory across coding sessions.

## MCP Server

The installer writes `~/.atomcode/mcp.json` (kernel exe resolved
dynamically) and copies skills into `~/.atomcode/skills/`:

```bash
node addons/atom/install.mjs
node addons/atom/install.mjs --check
```

Portable manual wiring (`hypernexus` resolved via `PATH`; see
`addons/atom/mcp.json`):

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

AtomCode has no hook API — hooks are not registered; the MCP server plus
skills carry the integration. `/hn-*` commands are consumed via the MCP
server (loader unknown), not as local command files.

## Available Tools

- `memory_scratchpad_get` - Get a memory
- `memory_scratchpad_set` - Save a memory
- `memory_search` - Search memories

## Usage

1. Install (see above), then mint the Meta model key into the shell
   (pi owns OAuth refresh; nothing is stored):

   ```powershell
   $env:META_API_KEY = "$(node addons/atom/bin/meta-muse-key.mjs)"
   ```

2. Ask AtomCode to remember things:

   ```
   Remember that we're using JWT with bcrypt for auth
   ```

3. In a new session, ask:

   ```
   What auth system did we implement?
   ```

## Verify Connection

```bash
node addons/atom/install.mjs --check
node addons/atom/bin/meta-muse-key.mjs --check
```
