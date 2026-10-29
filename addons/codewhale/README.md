# HyperNexus → Codewhale Integration

Fully featured HyperNexus integration for the **Codewhale** harness: MCP server
registration, plugin bundle (Agent Plugins v1.0.0) with commands + skills, direct skill
mirrors, prompt overlay, and a test battery. Core functionality works **with and
without** this extension — everything the extension touches is also available over plain
HTTP on the kernel (port 7778).

## What you get

| Surface | Where | Purpose |
|---|---|---|
| **MCP server `hypernexus`** | `.codewhale/mcp.json` (project) or `~/.codewhale/mcp.json` (global) | 58 tools: L2 memory (add/search/delete/stats), L1 scratchpad, knowledge-graph relation extraction, MCP discovery + call routing, code search, kernel health/billing |
| **Plugin bundle** | `<target>/plugins/hypernexus/` | `plugin.json` + legacy `plugin.toml`, bundle `mcp.json`, 11 `/hn-*` commands, 4 skills, 2 agents, 3 hooks — activate via `/plugin validate/show/trust/enable hypernexus` |
| **3 skills** | `<target>/skills/` (mirrored from the bundle) | `hypernexus` (tool map + discipline), `hypernexus-ops` (verify loop + degradation), `hypernexus-workflows` (MEM-FIRST / DISCOVER / HARVEST / HANDOFF / subagent persistence) |
| **Prompt overlay** | `AGENTS.md` managed block (project) | RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY discipline + memory tiers + preferred routing + degradation contract |
| **11 commands** | bundle `commands/` | `/hn-status` `/hn-store` `/hn-search` `/hn-tools` `/hn-session` `/hn-context` `/hn-summary` `/hn-purge` `/hn-plan` `/hn-remember` `/hn-restore` |
| **2 agents** | bundle `agents/` | `hypernexus-orchestrator`, `hypernexus-researcher` (read-only) |
| **3 hooks** | bundle `hooks/` (by-convention scripts) | `hn-session.mjs` bootstrap, `hn-rbac.mjs` RBAC guard, `hn-pre-tool.mjs` pre-tool gate |

## Install

```bash
node addons/codewhale/install.mjs             # project scope → .codewhale/ + AGENTS.md block
node addons/codewhale/install.mjs --global    # global scope → ~/.codewhale/
node addons/codewhale/install.mjs --check     # verify (exit 1 on gaps)
node addons/codewhale/install.mjs --uninstall # remove managed blocks/files
scripts\install_codewhale.bat                 # Windows wrapper (same modes)
```

Then restart the Codewhale session so the `hypernexus` MCP server connects, and run
`/plugin validate hypernexus` → `/plugin show hypernexus` → `/plugin enable hypernexus`
(trust review is the person's call). In a session, ask: "load the hypernexus skill".

## MCP server config

`mcp.json` follows Codewhale's schema (`mcpServers` map; stdio entries carry
`type`/`command`/`args`/`env`) — the same shape `codewhale mcp add` writes:

```json
{
  "mcpServers": {
    "hypernexus": {
      "type": "stdio",
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

- `.codewhale/mcp.json` (project) and `~/.codewhale/mcp.json` (global) are the canonical
  locations. The plugin bundle carries its own sibling `mcp.json`
  (schema `https://agent-plugins.org/schemas/mcp.json`) with the same server.
- The stdio server auto-spawns the kernel (`hypernexus.exe serve`) if none is running and
  resolves the kernel port from the lockfile, so `HYPERNEXUS_URL` is only an override.
- Equivalent CLI flow: `codewhale mcp add hypernexus --command <exe> --arg mcp`, then
  `codewhale mcp validate` / `codewhale mcp tools`.
- The installer only ever touches the `hypernexus` key in `mcpServers` — other servers
  are preserved. Version fields in `plugin.json`/`plugin.toml` are stamped from
  `/VERSION` at install time, so the bundle cannot drift from the kernel.

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
curl -s http://127.0.0.1:7778/api/mcp/tools
curl -X POST http://127.0.0.1:7778/api/agent/tool -H 'Content-Type: application/json' \
  -d '{"name":"<tool>","args":{}}'
```

## Testing

```bash
node bin/test-codewhale-ext.mjs   # full battery: config, bundle, installer, stdio MCP,
                                  # round-trips, concurrency, parity, memory features,
                                  # doc accuracy, core-without-extension
```
