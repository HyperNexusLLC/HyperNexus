---
name: hypernexus
description: HyperNexus persistent memory and MCP tool integration for agy.
---

# HyperNexus for agy

Connect to HyperNexus for persistent memory across coding sessions.

## MCP Server

The installer registers the `hypernexus` stdio MCP server in the agy MCP
store (kernel exe resolved dynamically):

```bash
node addons/agy/install.mjs
node addons/agy/install.mjs --check
```

Equivalent manual registration:

```bash
agy mcp add -e HYPERNEXUS_WORKSPACE_ROOT=<absolute-path-to-repo> \
  -e HYPERNEXUS_URL=http://127.0.0.1:7778 \
  hypernexus <path-to-hypernexus-bin> mcp
```

(Kernel is on `http://127.0.0.1:7778`. `HYPERNEXUS_WORKSPACE_ROOT` is
required; `HYPERNEXUS_URL` is an optional override defaulting to `:7778`.
`addons/agy/mcp.json` is the portable sample of the same wiring.)

agy has no skill/command/hook loader — skills and `/hn-*` commands are
consumed MCP-only via the `hypernexus` server tools below, not as local
files.

## Available Tools

- `memory_scratchpad_get` - Get a memory
- `memory_scratchpad_set` - Save a memory
- `memory_search` - Search memories

## Usage

1. Install (see above; models need interactive agy sign-in), then ask agy
   to remember things:

   ```
   Remember that we're using JWT with bcrypt for auth
   ```

2. In a new session, ask:

   ```
   What auth system did we implement?
   ```

## Verify Connection

```bash
node addons/agy/install.mjs --check
agy mcp list
```
