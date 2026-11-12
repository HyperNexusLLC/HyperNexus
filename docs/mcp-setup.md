# MCP Setup for HyperNexus

## Configuration

The MCP server is configured in `~/.pi/agent/mcp.json`:

```json
{
  "mcpServers": {
    "hypernexus": {
      "command": "C:\Users\hyper\workspace\HyperNexus\bin\hypernexus.exe",
      "args": ["mcp"],
      "env": {
        "TORMENTNEXUS_WORKSPACE_ROOT": "C:\Users\hyper\workspace\HyperNexus"
      },
      "directTools": true,
      "type": "stdio",
      "debug": false,
      "lifecycle": "eager"
    }
  }
}
```

## Testing

To test if the MCP server is working:

```bash
echo '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe mcp
```

## Available Tools

The MCP server provides access to all HyperNexus tools through the TN Kernel API at `http://127.0.0.1:7778`.

## Troubleshooting

If MCP shows 0/1 servers:

1. Check that the binary exists at the specified path
2. Verify the binary can start: `hypernexus.exe --help`
3. Check the MCP config for correct paths
4. Restart Pi to reload the MCP configuration
