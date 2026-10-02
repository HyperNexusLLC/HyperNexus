# HyperNexus MCP Client Examples

Minimal clients in Python, TypeScript, and Go that connect to the HyperNexus Go kernel HTTP API.

## Prerequisites

- Go kernel running on `http://127.0.0.1:7778`
- Start with: `cd go && go build -o tormentnexus.exe ./cmd/tormentnexus && ./tormentnexus.exe serve`

## Usage

### Python
```bash
python python-client.py                          # list tools
python python-client.py --search "file read"     # search tools
python python-client.py --call run_python --args '{"code": "print(1+1)"}'
```

### TypeScript / Node
```bash
node typescript-client.mjs                       # list tools
node typescript-client.mjs --search "file read"  # search tools
node typescript-client.mjs --call run_python --args '{"code": "print(1+1)"}'
```

### Go
```bash
go run go-client.go                              # list tools
go run go-client.go -search "file read"          # search tools
go run go-client.go -call run_python -args `{"code": "print(1+1)"}`
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Kernel health check |
| `/api/mcp/tools` | GET | List all available tools |
| `/api/mcp/tools/search` | POST | Search tools by query |
| `/api/mcp/tools/call` | POST | Call a tool by name |
| `/api/mcp/connect-all` | POST | Connect all enabled MCP servers |
| `/api/mcp/status` | GET | MCP server connection status |

See [docs/API_ENDPOINTS.md](../../docs/API_ENDPOINTS.md) for the full API reference.
