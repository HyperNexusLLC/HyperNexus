---
name: hypernexus
description: HyperNexus persistent memory and MCP tool integration for Codex.
---

# HyperNexus for Codex

Connect to HyperNexus for persistent memory across coding sessions.

## MCP Server

```bash
codex mcp add hypernexus \
  --env HYPERNEXUS_WORKSPACE_ROOT="<root>" \
  --env HYPERNEXUS_URL="http://127.0.0.1:7778" \
  -- "<root>/bin/hypernexus.exe" mcp
```

(Kernel is on `http://127.0.0.1:7778`. Port 8080 is stale and has no
Go listener. `HYPERNEXUS_WORKSPACE_ROOT` is required;
`HYPERNEXUS_URL` is an optional override defaulting to `:7778`.)

## Available Tools

- `memory_scratchpad_get` - Get a memory
- `memory_scratchpad_set` - Save a memory
- `memory_search` - Search memories

## Usage

1. Add HyperNexus to Codex (stdio; see above). Or use the full
   installer: `extensions/codex-hypernexus/scripts/install.bat`
   (`install.sh` on POSIX), which registers MCP + skill + plugin.

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
# Should show: hypernexus ... enabled
codex mcp get hypernexus
```
