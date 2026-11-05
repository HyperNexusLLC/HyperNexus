---
name: mcp-mock-client
description: Create mock MCP client for server testing with request/response simulation.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\cli-mcp-development\skills\mcp-mock-client\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.370610

---



# MCP Mock Client

Create mock MCP client for server testing.

## Generated Patterns

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

export async function createTestClient(serverCmd: string, args: string[]) {
  const proc = spawn(serverCmd, args, { stdio: ['pipe', 'pipe', 'inherit'] });
  const transport = new StdioClientTransport({ reader: proc.stdout!, writer: proc.stdin! });
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  return { client, close: () => proc.kill() };
}

export async function testTool(client: Client, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  return result;
}
```

## Target Processes

- mcp-server-testing-suite
- mcp-tool-implementation
