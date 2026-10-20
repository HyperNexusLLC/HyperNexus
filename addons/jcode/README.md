# HyperNexus → Jcode Integration

Fully featured HyperNexus integration for the **Jcode** harness: MCP server registration,
skills, prompt overlay, preferred-tool routing, swarm persistence guidance, and a test
battery. Core functionality works **with and without** this extension — everything the
extension touches is also available over plain HTTP on the kernel (port 7778).

## What you get

| Surface | Where | Purpose |
|---|---|---|
| **MCP server `hypernexus`** | `.jcode/mcp.json` (project) or `~/.jcode/mcp.json` (global) | 58 tools: L2 memory (add/search/delete/stats), L1 scratchpad, knowledge-graph relation extraction, MCP discovery + call routing, code search, kernel health/billing |
| **3 skills** | `.jcode/skills/` | `hypernexus` (tool map + discipline), `hypernexus-ops` (verify loop + degradation), `hypernexus-workflows` (MEM-FIRST / DISCOVER / HARVEST / HANDOFF / OPS) |
| **Prompt overlay** | `.jcode/prompt-overlay.md` | RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY discipline + memory tiers |
| **Preferred tools** | `.jcode/preferred-tools.md` | Routes memory/discovery/ops intents to `mcp__hypernexus__*` without displacing Jcode-native tools |
| **Swarm prompt block** | `~/.jcode/swarm-prompt.md` (global install) | Workers persist findings to L2 (append-only, safe to retry) |

## Install

```bash
node addons/jcode/install.mjs             # project scope → .jcode/
node addons/jcode/install.mjs --global    # global scope → ~/.jcode/ (+ swarm prompt)
node addons/jcode/install.mjs --check     # verify (exit 1 on gaps)
node addons/jcode/install.mjs --uninstall # remove managed blocks/files
```

Then restart the Jcode session (or run the `mcp` tool with `{"action":"reload"}`) so the
`hypernexus` MCP server connects. In a session, ask: "load the hypernexus skill".

## MCP server config

`mcp.json` follows Jcode's schema (`mcpServers` map; stdio entries carry
`command`/`args`/`env`):

```json
{
  "mcpServers": {
    "hypernexus": {
      "command": "C:\\...\\HyperNexus\\bin\\hypernexus.exe",
      "args": ["mcp"],
      "env": {
        "HYPERNEXUS_WORKSPACE_ROOT": "C:\\...\\HyperNexus",
        "HYPERNEXUS_URL": "http://127.0.0.1:7778"
      }
    }
  }
}
```

Notes:

- `.jcode/mcp.json` and `~/.jcode/mcp.json` are the canonical locations. A project
  `.mcp.json` or `.claude/mcp.json` with the same `mcpServers` shape also works for
  compatibility.
- The stdio server auto-spawns the kernel (`hypernexus.exe serve`) if none is running and
  resolves the kernel port from the lockfile, so `HYPERNEXUS_URL` is only an override.
- Remote (HTTP/SSE) transports can be added alongside via Jcode's `mcp` manager tool
  (`url`, `transport`, `headers`).

## Tool map (58 tools, `mcp__hypernexus__*`)

- **Memory**: `add_memory`, `search_memory` (tag/category filters, `include_cold` → L3),
  `delete_memory`, `memory_stats`, `memory_scratchpad_get/set/append`,
  `memory_extract_relations`, `memory_extract_relations_batch`
- **Discovery/routing**: `mcp_list_servers`, `mcp_list_tools`, `mcp_status`,
  `mcp_server_test`, `mcp_call_tool` (`serverName`, `toolName`, `arguments`)
- **Code**: `codebase_search`, `codebase_outline`, `repomap`, `search`, `grep`, `find`,
  `ls`, `read`, `write`, `edit`, `apply_search_replace`
- **Ops**: `system_status`, `get_system_stats`, `billing_status`, `list_processes`
- **Probes**: `hello_world`, `echo`
- Plus chat-surface/UI-automation and accessory tools (Windows-only surfaces degrade
  gracefully on other hosts).

## Without the extension (core)

Everything is reachable over plain HTTP — no extension required:

```bash
curl -s http://127.0.0.1:7778/health
curl -s "http://127.0.0.1:7778/api/memory/search?query=<term>&limit=<n>"
curl -X POST http://127.0.0.1:7778/api/memory/facts/add -H 'Content-Type: application/json' \
  -d '{"title":"...","content":"...","tags":["..."],"namespace":"project"}'
curl -s http://127.0.0.1:7778/api/mcp/tools
curl -X POST http://127.0.0.1:7778/api/agent/tool -H 'Content-Type: application/json' \
  -d '{"name":"<tool>","args":{}}'
```

`bin/test-core-noext.mjs` asserts this surface stays green with no extension installed.

## Degradation contract

- Kernel calls are budgeted and never throw; a dead kernel degrades to short notes.
- The stdio server merges the live kernel inventory with its static core list, serves the
  last-good inventory when the kernel is slow (15s TTL cache + retry), and handles
  requests concurrently so one slow tool call never blocks `tools/list`.
- Stale MCP connections after kernel swaps recover via the `mcp` tool with
  `{"action":"reload"}`.

## Testing

```bash
node bin/test-jcode-ext.mjs     # Jcode extension battery (config, surfaces, stdio MCP)
node bin/test-mcp-tools.mjs     # MCP router tools
node bin/test-mcp-sweep.mjs     # every MCP tool invoked + stdio transport + parity
node bin/test-core-noext.mjs    # kernel endpoints without any extension
```
