# HyperNexus OpenCode Integration

Full bridge between [OpenCode](https://opencode.ai) (V2 plugin API, V1 compatible) and the
HyperNexus control plane (Go kernel, default `http://127.0.0.1:7778`).

## What you get

| Surface | Detail |
|---|---|
| **29 tools** | `hypernexus_*` namespace: memory (store/search/fts/vector/list/delete), scratchpad, context harvest, observations, tool discovery (3 layers), MCP bridge (status/servers/tools/search/call), imported sessions, handoff, skills, code search, knowledge graph, billing, audit, subagent dispatch |
| **11 commands** | `/hn-status` `/hn-store` `/hn-remember` `/hn-search` `/hn-tools` `/hn-session` `/hn-context` `/hn-plan` `/hn-summary` `/hn-restore` `/hn-purge` |
| **3 skills** | `hypernexus`, `hypernexus-ops`, `hypernexus-workflows` (registered programmatically + shipped as SKILL.md) |
| **Session hooks** | prompt admission (`@memory:key` expansion, suggestion feed, session priming with active goal), per-turn context injection (fast FTS recall + status + proactive tool suggestions), compaction enrichment, model-request headers, retry observability |
| **Tool hooks** | destructive-pattern RBAC pre-check, fire-and-forget audit trail, structured file-change/file-read observations for the knowledge graph, auto-store of substantial results to L2 |
| **Permission hook** | kernel-aware RBAC (`HYPERNEXUS_RBAC=audit\|ask\|deny`) |
| **Shell hook** | injects `HYPERNEXUS_URL` / `HYPERNEXUS_CLIENT` into spawned shells |
| **MCP** | auto-registers the kernel's stdio MCP server (`hypernexus mcp`) when not already configured |
| **Worktree** | HyperNexus-managed local worktree strategy (`.hypernexus-worktree.json` linkage) |
| **Events** | turn-end observation to the kernel audit trail |
| **V1 shim** | `server()` export keeps OpenCode 1.x / V1-API harnesses working from the same package |

## Install

```bash
# Project-scoped (writes <project>/.opencode/)
node addons/opencode/install.mjs --project /path/to/project

# Global (writes ~/.config/opencode/)
node addons/opencode/install.mjs --global

# Verify (fails on drift)
node addons/opencode/install.mjs --project . --check

# Remove
node addons/opencode/install.mjs --project . --uninstall
```

Restart OpenCode afterwards (`opencode service restart`), or just start a new session.

## Configuration

| Env | Meaning |
|---|---|
| `HYPERNEXUS_URL` | Kernel base URL (default `http://127.0.0.1:7778`) |
| `HYPERNEXUS_MCP_COMMAND` | Override the MCP stdio command |
| `HYPERNEXUS_DASHBOARD_TOKEN` | Sent as `Authorization: Bearer` for write APIs when the kernel requires it |
| `HYPERNEXUS_RBAC` | `audit` (default) / `ask` / `deny` for destructive-pattern enforcement |
| `HYPERNEXUS_HOOK_BUDGET_MS` / `HYPERNEXUS_FAST_BUDGET_MS` / `HYPERNEXUS_SLOW_BUDGET_MS` / `HYPERNEXUS_CALL_BUDGET_MS` | Per-call budgets (400 / 2500 / 8000 / 12000) |

Plugin options (via `opencode.jsonc` → `plugins: [{ package: ..., options: {...} }]`):
`baseUrl`, `mcp` (bool), `mcpCodemode` (bool), `tools`, `commands`, `skills`, `worktree`,
`hooks`, `suggestions`, `autoStore`, `contextInjection`, `env` — set any to `false` to disable that surface.

## Degradation contract

- Every kernel call is budgeted (`AbortSignal.timeout`) and **never throws** — a hung or
  offline kernel degrades to a short note, never stalls a turn.
- Hot-path hooks use FTS-only search (≤400ms). Vector search is reserved for explicit tools.
- Per-event side effects (audit, auto-store, suggestion feed) are fire-and-forget.
- Kernel response shapes (`data.data`, `{record:…}`, JSON-string rows) are normalized in the
  adapter so tool output stays stable across kernel versions.

## Files

```
addons/opencode/
  install.mjs                 installer (project/global/uninstall/check)
  plugin/hypernexus/index.js  the plugin (V2 setup + V1 server shim)
  plugin/hypernexus/rpc.js    shared RPC contract (tool/command/capability names)
  plugin/hypernexus/package.json
  skills/*/SKILL.md           skill docs
  agent/hypernexus-orchestrator.md
  legacy/                     retired V1-experimental adapters (kept for reference)
```

## Tests

```bash
node bin/test-opencode-ext.mjs     # plugin battery: tools, commands, hooks, degradation
node bin/test-mcp-tools.mjs       # kernel MCP server battery (tools/list + tools/call)
node bin/test-core-noext.mjs      # core kernel battery WITHOUT any extension loaded
```
