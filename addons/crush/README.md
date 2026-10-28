# HyperNexus for Crush — full integration

Crush (`charm.land`/crush) integration for the HyperNexus AI control plane
(Go kernel `http://127.0.0.1:7778`, dashboard 7779): persistent multi-tier
memory (L1 scratchpad / L2 vault / L3 cold archive), semantic MCP tool
discovery + routing, skill registry, sessions, knowledge graph, code search,
system + billing status — plus Meta `muse-spark-1.3-contributor` OAuth wiring
borrowed from pi (`~/.pi/agent/auth.json`, pi owns refresh).

## What you get (parity with pi / opencode / mimo / jcode)

| Surface | This addon |
|---|---|
| MCP server | `hypernexus` stdio (`bin/hypernexus.exe mcp`, 58 tools) — discover via `mcp_list_tools`, route via `mcp_call_tool` |
| Slash commands | 8 files in `commands/` (`/hn-status`, `/hn-search`, `/hn-store`, `/hn-session`, `/hn-context`, `/hn-summary`, `/hn-tools`, `/hn-purge`); symlink/copy into `.crush/commands/` for project use |
| Skills | 3 skills (`hypernexus`, `hypernexus-ops`, `hypernexus-workflows`) — user-invocable + model-invoked |
| Hooks | `hooks/hn-gate.cmd` (pure-cmd PreToolUse gate, env-only) + `hooks/hn-session.cmd` (static SessionStart) + `hooks/hn-rbac.*` (deny-list) — **OPT-IN, not auto-registered**: Crush validates hook commands at config load and auto-registration stalls the load ~70s; paste the two lines from the managed block comment after verifying each exits 0 fast |
| Meta model | `meta-model.crushrc.snippet` — `meta/muse-spark-1.3-contributor` via OpenAI-compat, token read LIVE from pi auth.json at every startup |
| Overlay | `prompt-overlay.md` (discipline loop), `preferred-tools.md` (routing), `swarm-prompt-block.md` |
| Installer | `install.mjs` — `--global` (into `~/.config/crush/`) or project (into `.crush/`), `--check`, `--uninstall` |

## Quick start

```bash
# 1. Install everything into the global Crush config:
node addons/crush/install.mjs --global

# 2. Restart Crush (or run crush with the repo as cwd), then:
#    /hn-status    kernel + MCP + memory + billing, one screen
#    /hn-search    cross-session recall
#    /hn-tools     26k+ MCP tool discovery + routing

# 3. Verify the install without touching anything:
node addons/crush/install.mjs --global --check

# 4. Meta subscription model (already live in ~/.config/crush/crushrc):
#    model shows as meta/muse-spark-1.3-contributor in `crush models`
```

## Files

- `install.mjs` — idempotent installer (`--global`, `--check`, `--uninstall`, `--target`)
- `meta-model.crushrc.snippet` — Meta provider/model crushrc fragment (reference)
- `mcp.crushrc.snippet` — HyperNexus MCP server fragment (reference, forward-slash command: this is what fixes the `connection closed` class of errors)
- `prompt-overlay.md` — memory-first discipline + tool map (paste into system prompt or keep as reference)
- `preferred-tools.md` — which HyperNexus surface to use for what
- `swarm-prompt-block.md` — multi-agent persistence contract
- `hooks/hn-gate.cmd` — PreToolUse gate (pure-cmd, env-only, zero stdin/bash deps; default allow, denies `rm -rf /`, `mkfs`)
- `hooks/hn-session.cmd` + `hn-session.sh` — SessionStart bootstrap (STATIC context only; the live-FTS variant hung startup ~77s, see hook header)
- `hooks/hn-rbac.cmd` + `hn-rbac.sh` — second PreToolUse deny-list (destructive patterns, exit 2); opt-in AFTER the gate
- `hooks/hn-pre-tool.sh` — POSIX twin of the gate (kept for non-Windows)
- `agent/hypernexus-orchestrator.md` — orchestrator agent (RECALL→DISCOVER→EXECUTE→PERSIST→VERIFY)
- `commands/hn-*.md` — 8 slash-command prompt files
- `skills/*/SKILL.md` — 3 skills with `user-invocable: true`
