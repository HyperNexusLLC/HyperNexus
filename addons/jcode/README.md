# HyperNexus → Jcode Integration

Fully featured HyperNexus integration for the **Jcode** harness: MCP server registration,
skills, prompt overlay, preferred-tool routing, swarm persistence guidance, and a test
battery. Core functionality works **with and without** this extension — everything the
extension touches is also available over plain HTTP on the kernel (port 7778).

## What you get

| Surface | Where | Purpose |
|---|---|---|
| **MCP server `hypernexus`** | `.jcode/mcp.json` (project) or `~/.jcode/mcp.json` (global) | 58 tools: L2 memory (add/search/delete/stats), L1 scratchpad, knowledge-graph relation extraction, MCP discovery + call routing, code search, kernel health/billing |
| **4 skills** | `.jcode/skills/` | `hypernexus` (tool map + discipline), `hypernexus-ops` (verify loop + degradation), `hypernexus-workflows` (MEM-FIRST / DISCOVER / HARVEST / HANDOFF / OPS), `hypernexus-sessions` (continuity + agent dispatch) |
| **8 slash-commands** | `.jcode/skills/hn-*/` (from `addons/jcode/commands/`) | `/hn-status` `/hn-store` `/hn-search` `/hn-tools` `/hn-session` `/hn-context` `/hn-summary` `/hn-purge` (jcode exposes every skill as a `/command`) |
| **Lifecycle hooks** | `.jcode/hooks/` + `[hooks]` block in `~/.jcode/config.toml` | `hn-observe.mjs` (session/turn/tool observers → kernel facts + observations), `hn-pre-tool.mjs` (fail-open allow-gate) |
| **Prompt overlay** | `.jcode/prompt-overlay.md` | RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY discipline + memory tiers |
| **Preferred tools** | `.jcode/preferred-tools.md` | Routes memory/discovery/ops intents to `mcp__hypernexus__*` without displacing Jcode-native tools |
| **Swarm prompt block** | `~/.jcode/swarm-prompt.md` (global install) | Workers persist findings to L2 (append-only, safe to retry) |

## Install

```bash
node addons/jcode/install.mjs             # project scope → .jcode/
node addons/jcode/install.mjs --global    # global scope → ~/.jcode/ (+ swarm prompt)
node addons/jcode/install.mjs --check     # verify (exit 1 on gaps)
node addons/jcode/install.mjs --uninstall # remove managed blocks/files
node addons/jcode/install.mjs --target <dir>  # override install root (used by the test battery)
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

## Lifecycle hooks

`node addons/jcode/install.mjs` copies `hooks/hn-observe.mjs` and
`hooks/hn-pre-tool.mjs` into `.jcode/hooks/` (or `~/.jcode/hooks/` with
`--global`) and prints the exact `[hooks]` block to merge into
`~/.jcode/config.toml`. The installer never edits `config.toml` itself.

- `hn-observe.mjs` — observer for `session_start` / `session_end` / `turn_end` /
  `post_tool`. Session boundaries log to `POST /api/memory/facts/add` (tags
  arrays like `["jcode","session","session-start"]`) **and**
  `POST /api/memory/observations/record`; turn ends log compact facts;
  `post_tool` logs failures only. Always exits 0 with `{"continue":true}`.
- `hn-pre-tool.mjs` — `pre_tool` gate. Allows everything (exit 0 +
  `{"continue":true}`), performs no network I/O to stay within the hot-path
  budget. Add targeted `exit 2` denials here if you need a policy boundary.

Validate without secrets:

```powershell
$env:JCODE_HOOK_EVENT = 'session_start'; $env:JCODE_HOOK_SESSION_ID = 'smoke'
node addons/jcode/hooks/hn-observe.mjs   # exit 0 + {"continue":true}
'{"command":"t"}' | node addons/jcode/hooks/hn-pre-tool.mjs  # needs stdin JSON
```

## Meta model (muse-spark-1.3-contributor)

`meta-model.jcode.toml` is a drop-in `[providers.meta]` snippet (env-var
reference `api_key_env = "META_MUSE_API_KEY"` — no token inside).
`use-meta-model.ps1` only presence-checks that variable name, then launches
jcode with the profile. You set the value in your own shell; nothing stores it:

```powershell
$env:META_MUSE_API_KEY = '<paste-your-token-here>'  # one live shell only
.\addons\jcode\use-meta-model.ps1 "hello"
```

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
