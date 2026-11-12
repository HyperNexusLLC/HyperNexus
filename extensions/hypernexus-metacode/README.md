# HyperNexus for Meta Code (`hypernexus-metacode`)

Full native Meta Code (Muse Code) integration for the HyperNexus AI control
plane (Go kernel, port **7778 — authoritative**). Uses all five native
capability families: `skills`, `commands`, `hooks`, `mcpServers`, `reminders`.

## Contents

| Family | Items |
|---|---|
| skills | `hypernexus`, `hypernexus-ops`, `hypernexus-workflows`, `hypernexus-sessions` |
| commands | `hn-status`, `hn-memory`, `hn-tools`, `hn-session`, `hn-billing`, `hn-ops`, `hn-search`, `hn-handoff`, `hn-context`, `hn-purge`, `hn-agent`, `hn-workflow` |
| hooks | `hn-session-start` (SessionStart), `hn-user-prompt-submit` (UserPromptSubmit), `hn-pre-tool-use` (PreToolUse), `hn-post-tool-use` (PostToolUse), `hn-stop` (Stop), `hn-permission-request` (PermissionRequest), `hn-pre-compact` (PreCompact), `hn-post-compact` (PostCompact), `hn-subagent-start` (SubagentStart), `hn-subagent-stop` (SubagentStop), `hn-session-end` (SessionEnd), `hn-interrupt` (Interrupt, async) |
| mcpServers | `hypernexus` over stdio (`mcp/stdio.sh` → `bin/hypernexus.exe mcp`) |
| reminders | `hn-memory-first`, `hn-verify-ops` |

Plus `mcp/config.toml` — the canonical TOML form of the MCP server config.

## Install (proposal, not run)

```json
{
  "program": "muse",
  "argv": ["plugins", "install", "<canonical-plugin-path>"],
  "executed": false
}
```

Run `scripts/install.bat` (Windows) or `scripts/install.sh` (POSIX) to
check prerequisites, then install with the command above.

## Verify

```powershell
muse skills validate extensions/hypernexus-metacode/skills/hypernexus --json
muse plugins validate extensions/hypernexus-metacode --json
curl.exe -s http://127.0.0.1:7778/health
```

## Env contract

- `HYPERNEXUS_WORKSPACE_ROOT` — required, workspace scope
  (`mcp/stdio.sh` defaults it to the workspace root when unset).
- `HYPERNEXUS_URL` — optional override, default `http://127.0.0.1:7778`.
- Port 8080 is stale and has no listener — never use it.
- Every kernel call degrades gracefully: on kernel-down, continue locally.

## Model wiring (Meta provider, env reference only)

No credentials live in this plugin — only the model id *name*.
See `config/model.env.example`, then run:

```powershell
$env:METACODE_MODEL = 'muse-spark-1.3-contributor'
muse --provider meta --model $env:METACODE_MODEL --contributor-mode on
```
