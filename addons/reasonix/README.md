# HyperNexus Reasonix Integration

Full bridge between [Reasonix](https://github.com/esengine/DeepSeek-Reasonix) (Extension Protocol v2) and the
HyperNexus control plane (Go kernel, default `http://127.0.0.1:7778`).

## What you get

| Surface | Detail |
|---|---|
| **36 runtime tools** | `ext__hypernexus__*` served by the v2 sidecar: memory (store/search/fts/vector/list/delete/relate/stats), scratchpad, context harvest, observations, tool discovery (search/discover/suggest), MCP bridge (status/servers/tools/search/call), imported sessions, handoff, skills, code search, knowledge graph, billing, audit, subagent, workflows, orchestration, browser, repomap |
| **10 intercepts** | `input.receive` (@memory: expansion + suggestion feed), `context.prepare` / `system_prompt.build` / `agent.before_start` (fast-FTS context injection), `tool.before` + `permission.decision` (RBAC), `tool.after` (audit + auto-store), `compaction.prepare` (summary guidance), `session.start`/`session.end` (lifecycle) |
| **3 skills** | `hypernexus`, `hypernexus-ops`, `hypernexus-workflows` (shipped as SKILL.md) |
| **11 commands** | `/hypernexus:hn-status` `/hn-store` `/hn-remember` `/hn-search` `/hn-tools` `/hn-session` `/hn-context` `/hn-plan` `/hn-summary` `/hn-restore` `/hn-purge` |
| **2 agents** | `hypernexus-orchestrator` (RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY) + `hypernexus-researcher` (read-only research, no writes) |
| **Hooks** | plugin `SessionStart` + `PreCompact` context files; native `SessionStart` / `PostToolUse` / `PreToolUse` shell hooks (global `settings.json`, merged by installer) |
| **MCP** | `contributes.mcpServers.hypernexus` (stdio) + global `config.toml [[plugins]] hypernexus` + project `.mcp.json` — all three merged, never clobbered |
| **Meta model** | `meta/muse-spark-1.3-contributor` via `META_MUSE_API_KEY` env-var reference only (see below) |

## Install

```bash
# 1. Wire MCP + native hooks (global config, idempotent)
node addons/reasonix/install.mjs

# 2. Register the native plugin package (one-time; review the FULL TRUST block)
reasonix plugin install "<repo>\addons\reasonix" --link --replace --yes

# 3. Verify (fails on drift)
node addons/reasonix/install.mjs --check

# 4. Remove (managed hooks only; never destroys user edits)
node addons/reasonix/install.mjs --uninstall
```

Restart Reasonix afterwards so the sidecar + MCP server connect.

## Meta model (muse-spark-1.3-contributor, env reference only)

This package never reads `auth.json`, token files, or secret values. Pi owns the Meta OAuth
refresh; Reasonix consumes the live token through the variable name only:

```powershell
$env:META_MUSE_API_KEY = '<paste-your-token-here>'  # one live shell only
.\addons\reasonix\use-meta-model.ps1 "your prompt here"
# ...or merge addons/reasonix/meta-model.reasonix.toml [[providers]] block
# into %APPDATA%\reasonix\config.toml, then pick the model in the TUI.
```

After a Pi token refresh, re-sync (handles the token value — run in your own shell):

```powershell
.\scripts\sync-meta-oauth-reasonix.ps1
```

## Configuration

| Env | Meaning |
|---|---|
| `HYPERNEXUS_URL` | Kernel base URL (default `http://127.0.0.1:7778`) |
| `HYPERNEXUS_RBAC` | `audit` (default) / `ask` / `deny` for destructive-pattern enforcement |
| `HYPERNEXUS_DASHBOARD_TOKEN` | Sent as `Authorization: Bearer` for write APIs when the kernel requires it |
| `HYPERNEXUS_HOOK_BUDGET_MS` / `HYPERNEXUS_FAST_BUDGET_MS` / `HYPERNEXUS_SLOW_BUDGET_MS` / `HYPERNEXUS_CALL_BUDGET_MS` | Per-call budgets (400 / 2500 / 8000 / 12000) |
| `HYPERNEXUS_MCP_COMMAND` | Override the MCP stdio command (reserved; sidecar uses `bin/hypernexus.exe mcp` resolution) |

## Design notes

- **Sidecar is `required: false`** — a crash or handshake mismatch never breaks the session; MCP + skills + commands keep working.
- **Intercepts are a subset (10/17)** of the frozen Extension Protocol points. `replaces` is intentionally empty (no strategy-slot ownership — no collisions with other plugins). No `providers` contribution: the sidecar never sees credentials; the Meta provider stays host-configured via `api_key_env`.
- **Hot-path = FTS only** (≤400ms). Vector search is reserved for explicit tool calls.
- **Per-event side effects** (audit, auto-store, suggestion feed) are fire-and-forget.
- **Dead kernel bindings are NOT copied**: `memory_update` (`/api/memory/update`) and `kernel_routes` (`/api/routes`) are 404 on the live kernel — verified dead in prior harness audits, so the sidecar leaves them unbound rather than shipping broken tools.
- Shell hooks are POSIX (`sh`) + `jq`-optional and degrade to pass-through; the sidecar still enforces RBAC.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Sidecar not loaded | Plugin not installed/linked | `reasonix plugin install "<repo>\addons\reasonix" --link --replace --yes`, then restart |
| MCP `hypernexus` failing | Kernel down or stale after swap | `curl.exe -s http://127.0.0.1:7778/health`; restart kernel, then restart Reasonix |
| Hooks silent | `settings.json` not merged | re-run `node addons/reasonix/install.mjs`, restart Reasonix |
| `reasonix` CLI hangs | Shared-box saturation (known) | Retry; budgets are load-tolerant — re-run before concluding a regression |

## Files

```
addons/reasonix/
  reasonix-plugin.json            native v2 manifest (36 tools, 10 intercepts, skills/agents/commands/hooks/mcpServers)
  runtime/bin/hypernexus-reasonix.mjs   Extension Protocol v2 sidecar (NDJSON JSON-RPC 2.0)
  skills/<name>/SKILL.md          hypernexus, hypernexus-ops, hypernexus-workflows
  commands/hn-*.md                11 slash-command templates
  agents/hypernexus-orchestrator.md + hypernexus-researcher.md
  hooks/context/*.md              SessionStart primer + PreCompact guidance (contextFile)
  hooks/sh/*.sh                   native SessionStart/PostToolUse/PreToolUse scripts
  install.mjs                     installer (config.toml + settings.json + .mcp.json merges)
  meta-model.reasonix.toml        [[providers]] meta snippet (env reference only)
  use-meta-model.ps1              user-run launcher (presence-check only, never reads values)
```

## Tests

```bash
node bin/test-reasonix-ext.mjs    # plugin battery: manifest, sidecar, skills, commands, hooks, MCP, kernel
```
