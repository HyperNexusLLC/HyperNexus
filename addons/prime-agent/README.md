# HyperNexus Prime Agent Extension

Full bridge between [Prime Agent](https://prime-agent) (Rust host + Python REPL kernel)
and the HyperNexus control plane (Go kernel, default `http://127.0.0.1:7778`).

## What you get

| Surface | Mechanism | Detail |
|---|---|---|
| **Python skill** | `hypernexus` skill package | 35 typed async calls: memory (store/structured facts/search/FTS/list/delete/graph/relations), L1 scratchpad (get/set/append), tool discovery (semantic search + suggestions + context), MCP bridge (status/servers/tools/call/tool-search), sessions + session bootstrap, knowledge graph (observations record/search, ingest), context bundles (save/get), cross-session handoff + agent memory, system & billing status |
| **MCP server** | `prime-agent mcp add hypernexus -- hypernexus mcp` | 58 tools from the kernel's stdio MCP server: memory vault, scratchpad, MCP bridge, processes, chat-surface automation, accessory/root tools (bash/read/write/edit/grep/find/ls/repomap/codebase search & outline), code interpreter, system stats |
| **Session workflow** | `handoff()` / `pickup()` | HANDOFF.md-style cross-session continuity through `/api/agent-memory/*` |
| **Fail-soft** | bounded 5s calls | Kernel down => typed `KernelUnreachable` with a fix hint; never stalls a turn |
| **Commands** | `commands/hn-*.md` prompt files | 8 slash-commands (status/search/store/session/context/summary/tools/purge); load with `prime-agent --prompt-template <file>` |
| **Skills** | 9 skill dirs | base `hypernexus` + memory, l2, mcp-routing, agents, status-billing, sessions, ops, workflows |
| **Hooks** | `hooks/hn-observe.py`, `hooks/hn-gate.py` | lifecycle observer (facts/add tags array + observations/record, exit 0 + `continue:true`) and fail-open allow-gate; Prime Agent has no native hook API, so run explicitly or from a scheduled prompt |
| **Reminders/agents** | `schedules/hn-standup.txt`, `agents/hypernexus-dispatcher.md` | read-only status prompt for `prime-agent schedule add`; dispatcher brief for `--goal` / `prime-agent send` |
| **Meta model** | `meta-model.prime.json`, `use-meta-model.ps1` | `muse-spark-1.3-contributor` via env-var reference only; user-run activation, never reads auth.json/tokens |

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

## Provider / model support (Meta)

Prime Agent reads custom providers from `~/.prime/agent/models.json`. The
`meta` provider is wired for `muse-spark-1.3-contributor` (OpenAI-completions
wire, 1M context, reasoning on) with the key taken from the environment
(`"apiKey": "MODEL_API_KEY"`). Run with it (provision the key in your own
shell — never paste it in chat):

```powershell
$env:MODEL_API_KEY = "YOUR_TOKEN_HERE"
prime-agent --provider meta --model muse-spark-1.3-contributor -p "hello"
```

Without the key, runs fail at auth with a missing-key error and nothing else;
`prime-agent model list` shows the provider with no warnings.

## Usage

```python
print(await hypernexus())                                # kernel overview
await hypernexus.memory_fact("User time zone", "CET", tags=["user"])
hits = await hypernexus.memory_search("time zone")
await hypernexus.handoff("Shipped the parser; next: wire the formatter")
```

See `skills/hypernexus/SKILL.md` for the full capability map, plus one focused skill per family: `skills/hypernexus-memory`, `hypernexus-l2`, `hypernexus-mcp-routing`, `hypernexus-agents`, `hypernexus-status-billing`, `hypernexus-sessions`, `hypernexus-ops`, `hypernexus-workflows`.

## Commands (prompt templates)

Prime Agent loads prompt files with `--prompt-template <path>` (repeatable):

```powershell
prime-agent --prompt-template addons/prime-agent/commands/hn-status.md -p "status"
```

Available: `hn-status`, `hn-search`, `hn-store`, `hn-session`, `hn-context`, `hn-summary`, `hn-tools`, `hn-purge`.

## Hooks, schedules, agents

Prime Agent has no native hook API. The observer scripts use the same contract
(exit 0 + `{"continue": true}`, 2.5s POST budget, fail-soft on a down kernel):

```powershell
python addons/prime-agent/hooks/hn-observe.py start                    # session start
python addons/prime-agent/hooks/hn-observe.py turn --summary "..."     # turn end
python addons/prime-agent/hooks/hn-observe.py end --summary "..."      # session end
python addons/prime-agent/hooks/hn-gate.py --tool read --args "{}"     # allow-gate (exit 2 blocks)
```

Each `hn-observe.py` event writes `POST /api/memory/facts/add` (tags array
`["prime-agent-hook", "hook:<event>"]`) AND `POST /api/memory/observations/record`.

Deferred/reminder work uses the native scheduler with the read-only template:

```powershell
prime-agent schedule add <agent> "0 9 * * 1-5" -- "$(Get-Content addons/prime-agent/schedules/hn-standup.txt -Raw)"
```

Worker agents take the dispatcher brief (`agents/hypernexus-dispatcher.md`):

```powershell
prime-agent --goal "<goal> (brief: addons/prime-agent/agents/hypernexus-dispatcher.md)"
prime-agent send <agent> "<task>"
```

## Meta model (user-run, no secrets in repo)

```powershell
$env:MODEL_API_KEY = "<paste-your-token-here>"   # one live shell only, value never stored
.\addons\prime-agent\use-meta-model.ps1 "hello"  # one-shot on meta/muse-spark-1.3-contributor
```

`meta-model.prime.json` is the matching provider snippet (env-var NAME reference
only) for `~/.prime/agent/models.json`. The installer and hooks only
presence-check the variable name; values are never printed or persisted.

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
tools, clean unknown-tool errors, plus the full file surface (8 focused skills, 8 commands,
2 hooks with exit-0/continue:true and allow/deny gate behavior, mcp.json stdio+env,
Meta env-reference-only wiring, agent brief, schedule template).
