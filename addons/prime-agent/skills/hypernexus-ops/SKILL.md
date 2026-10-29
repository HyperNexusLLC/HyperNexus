---
name: hypernexus-ops
description: "HyperNexus ops from Prime Agent: kernel process checks, endpoint smoke tests, installer verification, troubleshooting. Use when the kernel looks down, after upgrades, or when validating this extension."
---

# HyperNexus Ops (Prime Agent)

Kernel baseline: `http://127.0.0.1:7778` (Go kernel, port 7778 authoritative).

## Smoke tests (no secrets needed)

```powershell
curl.exe -s -m 5 http://127.0.0.1:7778/health
python addons/prime-agent/install.py --check
python addons/prime-agent/tests/test_prime_agent_ext.py
node bin/test-prime-agent-ext.mjs
```

MCP stdio initialize:

```powershell
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"pa-smoke","version":"0.0.0"}}}' | & C:/Users/hyper/workspace/HyperNexus/bin/hypernexus.exe mcp
```

Expect a JSON-RPC `result` with server capabilities. Hook scripts:

```powershell
python addons/prime-agent/hooks/hn-observe.py turn --summary "smoke probe"
python addons/prime-agent/hooks/hn-gate.py --tool read --args '{}'
```

Both exit 0 and print `{"continue": true}`.

## Troubleshooting

| Symptom | Action |
|---|---|
| `KernelUnreachable` | Kernel down: `bin\hypernexus.exe serve`, re-run `/health` |
| MCP server won't dispatch | Verify `bin/hypernexus.exe mcp` runs standalone; start a **new** session after `mcp add` (snapshot quirk) |
| Skills missing | Re-run `python addons/prime-agent/install.py`; check `~/.prime/agent/skills/hypernexus*/` |
| `install.py --check` fails | Read the MISSING line; re-run install (idempotent) |

## Rules

- Never read `auth.json`, `*token*` files, or secret env values; presence-check var names only.
- Model auth issues: re-run the Meta activation command in README (user-scoped, not repo-scoped).
