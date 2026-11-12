---
name: hypernexus
description: HyperNexus persistent memory and MCP tool integration for Gemini CLI.
---

# HyperNexus for Gemini CLI

Connect to HyperNexus for persistent memory across coding sessions.

## MCP Server

```bash
gemini mcp add hypernexus http://localhost:8080/mcp
```

## Available Tools

- `memory_scratchpad_get` - Get a memory
- `memory_scratchpad_set` - Save a memory
- `memory_search` - Search memories

## Usage

1. Add HyperNexus to Gemini CLI:

   ```bash
   gemini mcp add hypernexus http://localhost:8080/mcp
   ```

2. Start Gemini and ask it to remember things:

   ```
   Remember that we're using PostgreSQL for the database
   ```

3. In a new session, ask:

   ```
   What database did we choose?
   ```

## Verify Connection

```bash
gemini mcp list
# Should show: hypernexus  http://localhost:8080/mcp
```
