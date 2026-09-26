---
name: hypernexus
description: HyperNexus persistent memory and MCP tool integration for Codex.
---

# HyperNexus for Codex

Connect to HyperNexus for persistent memory across coding sessions.

## MCP Server

```bash
codex mcp add hypernexus http://localhost:8080/mcp
```

## Available Tools

- `memory_scratchpad_get` - Get a memory
- `memory_scratchpad_set` - Save a memory
- `memory_search` - Search memories

## Usage

1. Add HyperNexus to Codex:

   ```bash
   codex mcp add hypernexus http://localhost:8080/mcp
   ```

2. Start Codex and ask it to remember things:

   ```
   Remember that we're using JWT with bcrypt for auth
   ```

3. In a new session, ask:

   ```
   What auth system did we implement?
   ```

## Verify Connection

```bash
codex mcp list
# Should show: hypernexus  http://localhost:8080/mcp  enabled
```
