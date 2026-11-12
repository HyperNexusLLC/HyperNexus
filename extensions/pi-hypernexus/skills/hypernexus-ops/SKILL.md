---
name: hypernexus-ops
description: "HyperNexus ops from pi: kernel process checks, endpoint smoke tests, flags, troubleshooting. Use when the kernel looks down, after upgrades, or when validating this extension."
---

# HyperNexus Ops (pi)

Kernel baseline: `http://127.0.0.1:7778` (Go kernel, port 7778 authoritative).

## Smoke tests (no secrets needed)

```powershell
curl.exe -s -m 5 http://127.0.0.1:7778/health
pi --no-session --print "ping" -e C:/Users/hyper/workspace/HyperNexus/extensions/pi-hypernexus/pi-hypernexus.ts
```

MCP stdio initialize:

```powershell
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"pi-smoke","version":"0.0.0"}}}' | & C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe mcp
```

Expect a JSON-RPC `result` with server capabilities.

## Extension flags

- `--hn-base <url>` — override kernel base URL (default `http://127.0.0.1:7778`).
- `--hn-verbose` — verbose hook logging.

## Troubleshooting

| Symptom | Action |
|---|---|
| Status bar shows `offline` | Kernel down: restart the Go kernel service, re-run `/health` |
| `degraded` | Kernel up but an endpoint failed; check which family (memory/mesh/billing) |
| MCP server won't connect | Verify `bin/hypernexus.exe mcp` runs standalone; check `HYPERNEXUS_URL` reaches `:7778` |
| Skills missing | `resources_discover` must return the 8 `skillPaths`; reload extensions |

## Rules

- Never read `auth.json`, `*token*` files, or secret env values; presence-check var names only.
- Model auth issues: re-run the Meta activation command in README (user-scoped, not repo-scoped).
