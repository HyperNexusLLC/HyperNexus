---
name: hypernexus
description: HyperNexus persistent memory and MCP tool integration. Use when the user wants to save context, search memories, or use MCP tools across sessions.
---

# HyperNexus Skill

Connect to HyperNexus for persistent memory and MCP tool routing.

## MCP Server

HyperNexus runs at `http://localhost:8080/mcp`.

## When to Use

- User asks to "remember" something
- User asks about previous context or decisions
- User wants to search past work
- User needs MCP tool access

## Available Tools

- `memory_scratchpad_get` - Retrieve a memory by key
- `memory_scratchpad_set` - Save a memory by key
- `memory_search` - Search memories by query
- `mcp_list_tools` - List available MCP tools
- `mcp_call_tool` - Call an MCP tool

## Usage Pattern

1. **Save context**: After making a decision, save it
2. **Recall context**: When starting a new session, search memory
3. **Cross-tool sync**: Context saved in one tool is available in others

## Configuration

Add to your MCP config:

```json
{
  "mcpServers": {
    "hypernexus": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```
