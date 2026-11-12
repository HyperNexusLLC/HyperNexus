---
name: hypernexus
description: HyperNexus persistent memory and MCP tool integration for Crush.
---

# HyperNexus for Crush

Connect to HyperNexus for persistent memory across coding sessions.

## MCP Server

Crush registers MCP servers from its `crushrc`. The full installer writes
the block for you:

```bash
node addons/crush/install.mjs --global
node addons/crush/install.mjs --global --check
```

Equivalent manual wiring (forward slashes are REQUIRED on Windows —
backslashes break the MCP handshake):

```
mcp add hypernexus \
  --command "C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe" \
  --args mcp \
  --env HYPERNEXUS_WORKSPACE_ROOT "C:/Users/hyper/workspace/HyperNexus" \
  --env HYPERNEXUS_URL "http://127.0.0.1:7778" \
  --timeout 30
```

(Kernel is on `http://127.0.0.1:7778`. `HYPERNEXUS_WORKSPACE_ROOT` is
required; `HYPERNEXUS_URL` is an optional override defaulting to `:7778`.)

## Available Tools

- `search_memory` - Search memories
- `add_memory` - Save a memory
- `memory_scratchpad_get` - Get L1 working memory
- `memory_scratchpad_set` - Save L1 working memory
- `mcp_list_tools` - Tool inventory across connected servers
- `mcp_call_tool` - Route a call to a downstream tool
- `system_status` - Kernel liveness + version
- `billing_status` - Provider quotas and fallback chain

## Usage

1. Install HyperNexus into Crush (see above), restart Crush, then ask it
   to remember things:

   ```
   Remember that we're using JWT with bcrypt for auth
   ```

2. In a new session, ask:

   ```
   What auth system did we implement?
   ```

3. Slash commands live in `addons/crush/commands/` (`/hn-status`,
   `/hn-search`, `/hn-store`, `/hn-session`, `/hn-context`, `/hn-summary`,
   `/hn-tools`, `/hn-purge`, `/hn-plan`, `/hn-remember`, `/hn-restore`).

## Verify Connection

```bash
node addons/crush/install.mjs --global --check
node addons/crush/bin/meta-muse-key.mjs --check
```
