# HyperNexus OpenCode Integration

Full bridge between [OpenCode](https://opencode.ai) (V2 plugin API, V1 compatible) and the
HyperNexus control plane (Go kernel, default `http://127.0.0.1:7778`).

## What you get

| Surface | Detail |
|---|---|
| **37 tools** | `hypernexus_*` namespace: memory (store/search/fts/vector/list/delete/relate/stats), scratchpad, context harvest, observations, tool discovery (3 layers), MCP bridge (status/servers/tools/search/call), imported sessions, handoff, session list, skills, code search, repomap, knowledge graph, billing, audit, subagent dispatch, workflow, orchestrate, browser, system overview, status, **meta_auth** (pi-OAuth status/mint/check) |
| **13 commands** | `/hn-status` `/hn-store` `/hn-remember` `/hn-search` `/hn-tools` `/hn-session` `/hn-context` `/hn-plan` `/hn-summary` `/hn-restore` `/hn-purge` `/hn-auth` `/hn-models` |
| **4 skills** | `hypernexus`, `hypernexus-ops`, `hypernexus-workflows`, `hypernexus-orchestrator` (registered programmatically + shipped as SKILL.md) |
| **Meta model** | native `meta/muse-spark-1.3-contributor` provider registration (`@opencode/ai/providers/openai-compatible` → `https://api.meta.ai/v1`, key from `META_MUSE_API_KEY`); pi-OAuth integration method (`node bin/meta-muse-key.mjs --check`); session-default preference when unpinned; `/hn-auth` + `/hn-models` commands; Meta 401/403 clears the minted-key cache (pi re-mints) |
| **Session hooks** | prompt admission (`@memory:key` expansion, suggestion feed, session priming with active goal), per-turn context injection (fast FTS recall + status + proactive tool suggestions), compaction enrichment, generate/title parity, model-request + native HTTP identity headers, retry observability with hard-fail caps |
| **Tool hooks** | destructive-pattern RBAC pre-check, fire-and-forget audit trail, structured file-change/file-read observations for the knowledge graph, auto-store of substantial results to L2 |
| **Permission hook** | kernel-aware RBAC (`HYPERNEXUS_RBAC=audit\|ask\|deny`) |
| **Shell hook** | injects `HYPERNEXUS_URL` / `HYPERNEXUS_CLIENT` into spawned shells |
| **Agent** | registers the `hypernexus-orchestrator` subagent (recall → discover → execute → persist → verify) |
| **References** | exposes `.opencode/skills/` as the `hypernexus-skills` local reference |
| **Websearch** | opt-in (`options.websearch: true`) HyperNexus code-search provider |
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
`hooks`, `suggestions`, `autoStore`, `contextInjection`, `env`, `meta` (bool),
`metaBaseUrl`, `metaDefault` (bool), `agents` (bool), `references` (bool),
`websearch` (bool, default off) — set any to `false` to disable that surface.

## Meta model (pi OAuth, zero stored secrets)

```bash
node addons/opencode/bin/meta-muse-key.mjs --check   # verify pi OAuth mints (no key printed)
$env:META_MUSE_API_KEY = "$(node addons/opencode/bin/meta-muse-key.mjs)"
.\addons\opencode\use-meta-model.ps1 "hello"         # or no args for the TUI
```

Config shape is V2 (`providers.meta` + `env: ["META_MUSE_API_KEY"]` — see
`meta-model.opencode.jsonc`); the installer migrates a retired V1 singular
`provider.meta` block automatically. The key lives in the process environment
only — never in config files, logs, or transcripts.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| MCP shows `✗ hypernexus failed: Connection closed` after a kernel swap | killing `hypernexus` processes kills the stdio MCP child; OpenCode holds the stale state | `opencode service restart` (a config touch does **not** clear it) — the stdio server itself is healthy; verify standalone with `hypernexus.exe mcp` |
| Kernel "down" right after `Start-Process` | boot takes 10–40s on a saturated box before binding 7778 | wait and re-check `/health`; test batteries gate on readiness now |
| Battery timeouts during heavy load | this is a 2-core box shared with sibling autopilot agents at 100% CPU | budgets are load-tolerant (sweep 90s/call); re-run before concluding a regression |
| `Copy-Item` fails replacing `hypernexus.exe` | running processes lock the exe | kill all `hypernexus` processes → verify gone → copy → start; never delete the staged `hypernexus-new.exe` after a failed copy |
| Go/Node parse errors on JSON we wrote | PowerShell `Set-Content -Encoding utf8` writes a BOM | write bytes without BOM (`fs.writeFileSync` utf8, or strip bytes 239,187,191) |

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
  install.mjs                 installer (project/global/uninstall/check + V1→V2 provider migration)
  plugin/hypernexus/index.js  the plugin (V2 setup + V1 server shim)
  plugin/hypernexus/rpc.js    shared RPC contract (tool/command/capability names)
  plugin/hypernexus/package.json
  plugin/hypernexus/meta-muse-key.mjs  installed copy of the pi-OAuth key minter
  bin/meta-muse-key.mjs       Meta Model API key minter (pi auth.json → api.meta.ai, stdout only)
  meta-model.opencode.jsonc   drop-in V2 providers.meta wiring (no secrets)
  use-meta-model.ps1          live-mint launcher (process env only)
  skills/*/SKILL.md           skill docs (hypernexus, hypernexus-ops, hypernexus-workflows, hypernexus-orchestrator)
  agent/hypernexus-orchestrator.md
```

## Tests

```bash
node bin/test-opencode-ext.mjs     # plugin battery: tools, commands, hooks, degradation
node bin/test-mcp-tools.mjs       # kernel MCP server battery (tools/list + tools/call)
node bin/test-core-noext.mjs      # core kernel battery WITHOUT any extension loaded
```
