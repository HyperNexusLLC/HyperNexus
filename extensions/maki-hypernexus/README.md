# HyperNexus for maki (`maki-hypernexus`)

Full native maki integration for the HyperNexus AI control plane (Go
kernel, port **7778 — authoritative**). Uses every native capability
family maki offers: Lua plugin `tools`, `slash-commands` (plugin +
`commands/*.md`), `hooks` (autocmd events), `mcp.toml`, `skills`, and
`reminders` (prompt hints); agent dispatch via kernel endpoints plus
maki's native background sessions (`/new`, `/sessions`, `/tasks`).

## Contents

| Family | Items |
|---|---|
| tools (Lua) | 35 kernel-backed tools: memory_store/search/vector_search/list/update/delete, add_fact, tool_search, suggest_tools, session_search/list/context, skill_manage, skills_search, code_search, context_harvest, scratchpad, system_status/overview, billing_status, mcp_call/status/servers/tools, memory_stats/handoff, kernel_routes, repomap, knowledge_graph, workflow, orchestrate, browser, subagent, record_observation, audit_log |
| commands (plugin) | `/hn-status`, `/hn-memory`, `/hn-tools`, `/hn-session`, `/hn-billing` |
| commands (markdown) | `hn-status`, `hn-memory`, `hn-tools`, `hn-session`, `hn-billing`, `hn-ops`, `hn-search`, `hn-handoff`, `hn-context`, `hn-purge`, `hn-agent`, `hn-workflow` (as `/project:hn-*`) |
| hooks (autocmds) | `SessionFocusChanged` (session start), `TurnStart` (prompt), `ToolDone` (tool use → observations/record), `TurnEnd`, `CompactionDone`, `TaskStatusChanged` (subagent done/error), `SessionEnd` |
| mcpServers | `hypernexus` over stdio (`mcp.toml` → `bin/hypernexus.exe mcp`) |
| skills | `hypernexus`, `hypernexus-ops`, `hypernexus-sessions`, `hypernexus-workflows` |
| reminders | memory-first + kernel-conventions prompt hints |

Hooks log to `POST /api/memory/facts/add` (tags arrays, `reason:maki`)
and `POST /api/memory/observations/record`. Every hook is best-effort
and budgeted by the curl timeout — kernel-down never blocks a turn.

## Install (proposal, not run)

Project scope (needs `/trust` once for `.maki/mcp.toml` + `init.lua`):

```powershell
$src = 'C:\Users\hyper\workspace\HyperNexus\extensions\maki-hypernexus'
$dst = '<project>\.maki'
Copy-Item "$src\lua" "$dst\lua" -Recurse -Force
Copy-Item "$src\commands" "$dst\commands" -Recurse -Force
Copy-Item "$src\skills" "$dst\skills" -Recurse -Force
Copy-Item "$src\init.lua" "$dst\init.lua" -Force
Copy-Item "$src\plugin.toml" "$dst\plugin.toml" -Force
Copy-Item "$src\mcp.toml" "$dst\mcp.toml" -Force
```

Global scope: same files under `%APPDATA%\maki\` (`lua/`, `commands/`,
`skills/`, `init.lua`, `plugin.toml`, `mcp.toml`).

Then in maki: `/trust` (project scope), `/reload`, and check `maki.log`
for `hypernexus maki plugin loaded`. Run `scripts/install.bat`
(Windows) or `scripts/install.sh` (POSIX) for the prerequisite check.

## Verify

```powershell
maki prompt --tools --names            # binary + tool registry OK
curl.exe -s http://127.0.0.1:7778/health
python -c "import tomllib;tomllib.load(open('mcp.toml','rb'));tomllib.load(open('plugin.toml','rb'));print('toml-ok')"
```

## Env contract

- `HYPERNEXUS_WORKSPACE_ROOT` — required, workspace scope
  (shipped in `mcp.toml`).
- `HYPERNEXUS_URL` — optional override, default `http://127.0.0.1:7778`
  (plugin reads it via a sandboxed `os.getenv` probe; unset is fine).
- Port 8080 is stale and has no listener — never use it.
- Every kernel call degrades gracefully: on kernel-down, continue locally.

## Loops and permissions

- Plugin subprocess calls need `[permissions] run = true` in the
  adjacent `plugin.toml` (shipped); without it the tools stay inert.
- `maki.net` blocks loopback unless `net.allowed_private_hosts` lists
  it, so the plugin shells `curl.exe` (argv form, no shell quoting)
  instead of using `maki.net.request`.
- No credentials live in this extension — only the model id *name*.
  See `config/model.env.example`, then run:

```powershell
$env:MAKI_MODEL = 'meta/muse-spark-1.3-contributor'
maki -m $env:MAKI_MODEL
```
