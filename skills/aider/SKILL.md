---
name: hypernexus
description: HyperNexus persistent memory and MCP tool integration for Aider.
---

# HyperNexus for Aider

Connect to HyperNexus for persistent memory across coding sessions.

## MCP Server

```bash
aider --mcp-server http://localhost:8080/mcp
```

## Available Tools

- `memory_scratchpad_get` - Get a memory
- `memory_scratchpad_set` - Save a memory
- `memory_search` - Search memories

## Usage

1. Start Aider with HyperNexus:

   ```bash
   aider --mcp-server http://localhost:8080/mcp
   ```

2. Ask Aider to remember things:

   ```
   Remember that we're using PostgreSQL for the auth system
   ```

3. In a new session, ask:

   ```
   What database did we choose for auth?
   ```

## Config File

Add to `.aider.conf.yml`:

```yaml
mcp-servers:
  - name: hypernexus
    url: http://localhost:8080/mcp
```
