# HyperNexus Prime Agent Extension

Full bridge between [Prime Agent](https://prime-agent) (Rust host + Python REPL kernel)
and the HyperNexus control plane (Go kernel, default `http://127.0.0.1:7778`).

## What you get

| Surface | Mechanism | Detail |
|---|---|---|
| **Python skill** | `hypernexus` skill package | 25 typed async calls: memory (store/structured facts/search/FTS/list/delete/graph/relations), L1 scratchpad (get/set/append), tool discovery (semantic search + suggestions), MCP bridge (status/servers/tools/call), sessions, knowledge graph, cross-session handoff (write/pickup/search), system & billing status |
| **MCP server** | `prime-agent mcp add hypernexus -- hypernexus mcp` | 58 tools from the kernel's stdio MCP server: memory vault, scratchpad, MCP bridge, processes, chat-surface automation, accessory/root tools (bash/read/write/edit/grep/find/ls/repomap/codebase search & outline), code interpreter, system stats |
| **Session workflow** | `handoff()` / `pickup()` | HANDOFF.md-style cross-session continuity through `/api/agent-memory/*` |
| **Fail-soft** | bounded 5s calls | Kernel down => typed `KernelUnreachable` with a fix hint; never stalls a turn |

Core kernel functionality works **with and without** the extension: the skill and
MCP server are thin clients over the same HTTP/stdio surfaces the kernel already
exposes (verified by `bin/test-core-noext.mjs`).

## Install

```bash
# Global (default): skill -> ~/.prime/agent/skills/hypernexus/, MCP registered
python addons/prime-agent/install.py

# Project-scoped skill
python addons/prime-agent/install.py --project /path/to/project

# Skill only, no MCP registration
python addons/prime-agent/install.py --no-mcp

# Verify / remove
python addons/prime-agent/install.py --check
python addons/prime-agent/install.py --uninstall
```

The installer registers the kernel's stdio MCP server through the canonical CLI
(`prime-agent mcp add ...`) and falls back to a direct `settings.json` edit (with
backup) when the CLI is unavailable. Start a **new** Prime Agent session after
installing so the kernel venv picks up the skill.

## Usage

```python
print(await hypernexus())                                # kernel overview
await hypernexus.memory_fact("User time zone", "CET", tags=["user"])
hits = await hypernexus.memory_search("time zone")
await hypernexus.handoff("Shipped the parser; next: wire the formatter")
```

See `skills/hypernexus/SKILL.md` for the full capability map.

## MCP server notes

- 58 tools, transport stdio, dispatched via `prime-agent mcp` tools
  (`mcp.list_tools("hypernexus")` / `mcp.call_tool(...)`).
- Registration is per-user (`~/.prime/agent/settings.json` -> `mcpServers`).
- Known host quirk: an MCP server added while a session is running shows up in
  `mcp.list_connections()` immediately, but `mcp.config` resolution (and therefore
  `mcp.list_tools/call_tool`) uses the settings snapshot the session worker loaded
  at startup. Sessions started after registration dispatch fine. The Python skill
  talks HTTP directly and is immune to this.

## Tests

```bash
python addons/prime-agent/tests/test_prime_agent_ext.py      # extension battery
node bin/test-mcp-tools.mjs                                  # kernel MCP tools
node bin/test-mcp-sweep.mjs                                  # full tool sweep + stdio parity
node bin/test-core-noext.mjs                                 # core without extension
```

The extension battery covers: core kernel endpoints, the skill packaging
contract (SKILL.md frontmatter, src layout, hatch wheel config), live skill
calls (memory roundtrip, scratchpad, tool search, MCP bridge, sessions, handoff),
graceful failure on a dead kernel, Prime Agent MCP registration, and the stdio
MCP server itself (initialize, tools/list schema validation, safe dispatch of 15
tools, clean unknown-tool errors).
