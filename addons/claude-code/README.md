# HyperNexus for Claude Code

Native Claude Code plugin (`hypernexus`) for the HyperNexus AI control plane —
persistent multi-tier memory (L1/L2/L3), semantic MCP tool discovery, knowledge
graph, kernel ops, and cross-harness session continuity via the local Go kernel
on `http://127.0.0.1:7778` (port 7778 authoritative).

## What is installed

| Family | Artifacts |
|---|---|
| Slash commands | `/hn-status`, `/hn-store`, `/hn-search`, `/hn-tools`, `/hn-session`, `/hn-context`, `/hn-summary`, `/hn-purge`, `/hn-plan`, `/hn-remember`, `/hn-restore` |
| Skills | `hypernexus`, `hypernexus-ops`, `hypernexus-workflows` |
| Agents | `hypernexus-orchestrator` (recall → discover → execute → persist → verify), `hypernexus-researcher` (read-only) |
| Hooks | `SessionStart`, `UserPromptSubmit`, `PreToolUse` (Bash RBAC gate), `PostToolUse` (Write/Edit), `PreCompact`, `Stop`, `SubagentStop` → kernel facts/observations |
| MCP server | `hypernexus` stdio → `bin/hypernexus.exe mcp` with `HYPERNEXUS_WORKSPACE_ROOT` + `HYPERNEXUS_URL` env |
| Model | Meta `muse-spark-1.3-contributor` via the kernel Anthropic shim (native pi-OAuth path) or a fresh per-run mint (see below) |

## Install

```powershell
node install.mjs --project C:\Users\hyper\workspace\HyperNexus   # project plugin + .mcp.json
node install.mjs --global                                        # or user-wide (~/.claude/plugins)
node install.mjs --check                                         # verify, non-zero on drift
node install.mjs --uninstall                                     # remove
```

Options: `--no-mcp` skips project `.mcp.json` registration (the plugin's own
`.mcp.json` is still installed with the absolute binary path filled in).

## Run with the Meta model (user-run)

Native path — no token handling at all. The kernel reads the pi Meta OAuth
identity itself per request (`~/.pi/agent/auth.json`), so pi owns refresh:

```powershell
.\use-meta-model.ps1 "check hypernexus status"   # one-shot (-p) mode
.\use-meta-model.ps1                             # or no args for REPL
```

`use-meta-model.ps1` mints a FRESH Model API key per run via
`bin/meta-muse-key.mjs` into the child-process env only (override — without it
the kernel uses the pi identity directly). Nothing is stored, printed, or
committed. If the mint reports 401/403, run `/login meta` in pi first.

Reference wiring (no secrets): `meta-model.settings.snippet`.

## Validate

```powershell
node bin/meta-muse-key.mjs --check
curl -s http://127.0.0.1:7778/v1/models
curl -s http://127.0.0.1:7778/health
node bin/test-claude-code-ext.mjs          # hermetic battery
node bin/test-claude-code-ext.mjs --live   # + mint + kernel + model round-trip
```

## Hooks

- `hooks/scripts/hn-log.mjs` (Node, cross-platform) — lifecycle logging to
  `/api/memory/observations/record` (fallback `/api/memory/facts/add`).
- `hooks/scripts/hn-gate.mjs` (Node) — `PreToolUse` RBAC gate for Bash:
  deny-list for destructive shell patterns (exit 2 denies, anything else allows).
- `hooks/scripts/hn-compact.mjs` (Node) — `PreCompact` pointer: persists the
  resume marker (goal + latest summary reference) before compaction.
- All hooks are fire-and-forget, budgeted, never block, never read credentials.
