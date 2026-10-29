# HyperNexus for Freebuff — full integration (Codebuff platform)

Freebuff (`freebuff`, built on the [Codebuff](https://codebuff.com) platform,
config dir `~/.config/manicode/`) integration for the HyperNexus AI control
plane (Go kernel `http://127.0.0.1:7778`, dashboard 7779): persistent
multi-tier memory (L1 scratchpad / L2 vault / L3 cold archive), semantic MCP
tool discovery + routing, skill registry, sessions, knowledge graph, code
search, system + billing status — plus Meta `muse-spark-1.3-contributor`
wiring borrowed from pi (`~/.pi/agent/auth.json`, pi owns refresh).

## What Freebuff natively supports (verified surfaces)

| Freebuff surface | This addon |
|---|---|
| `AGENTS.md` (project root, fallback `CLAUDE.md`) | managed discipline block via installer |
| `.agents/mcp.json` (standard `mcpServers` format, projectDir/parents) | `hypernexus` stdio server (`bin/hypernexus.exe mcp`, 58 tools) |
| `.agents/skills/*` and `.claude/skills/*` → `/skill:<name>` | 3 core skills + 2 agents + 11 `hn-*` command-skills |
| `freebuff --continue` / `/export` | session resume + transcript export (native) |
| `/model` picker | already lists **Muse Spark 1.3** (1M context; paid-plan locked per Freebuff README — see Meta section below) |

Freebuff has **no custom-provider / apiKeyHelper surface** (unlike Crush
`crushrc` or Droid `apiKeyHelper`), so Meta OAuth is wired as a live-read
helper + direct-API docs + a native BYOK openai-compatible connection
(`~/.config/freebuff/byok/connections.json`, credentialRef `env:META_MUSE_API_KEY`,
default-selected in `~/.config/manicode/settings.json`) rather than a provider
block. Nothing secret is ever stored in this repo.

## What you get (parity with pi / opencode / crush / mimo / jcode)

| Surface | This addon |
|---|---|
| MCP server | `hypernexus` stdio (`bin/hypernexus.exe mcp`, 58 tools) — discover via `mcp_list_tools`, route via `mcp_call_tool` |
| Skills (root `.agents/skills/`) | `hypernexus`, `hypernexus-ops`, `hypernexus-workflows` — model- + user-invocable via `/skill:<name>` |
| Agents (root `.agents/skills/`) | `hypernexus-orchestrator` (RECALL→DISCOVER→EXECUTE→PERSIST→VERIFY) + `hypernexus-researcher` (read-only) via `/skill:<name>` |
| Command-skills (root `.agents/skills/`) | `hn-status`, `hn-search`, `hn-store`, `hn-session`, `hn-context`, `hn-summary`, `hn-tools`, `hn-purge`, `hn-plan`, `hn-remember`, `hn-restore` → `/skill:hn-*` |
| Meta model | `meta-model.freebuff.md` + `bin/meta-muse-key.mjs` — mint a Meta Model API key from pi OAuth live at call time (pi owns refresh) |
| Overlay | `prompt-overlay.md` (discipline loop), `preferred-tools.md` (routing), `swarm-prompt-block.md` |
| Installer | `install.mjs` — project (`.agents/`) or home-global (`~/.agents/`), `--check`, `--uninstall` |

## Quick start

```bash
# 1. Install into this project (writes .agents/ + AGENTS.md managed block):
node addons/freebuff/install.mjs --project .

# 2. Or cover every project under $HOME (writes ~/.agents/):
node addons/freebuff/install.mjs --global

# 3. Restart freebuff in this repo (trust .agents when prompted, or run with --trust-agents), then:
#    /skill:hn-status    kernel + MCP + memory + billing, one screen
#    /skill:hn-search    cross-session recall
#    /skill:hn-tools    26k+ MCP tool discovery + routing

# 4. Verify the install without touching anything:
node addons/freebuff/install.mjs --project . --check

# 5. Meta subscription model (no secrets stored — pi owns OAuth refresh):
node addons/freebuff/bin/meta-muse-key.mjs --check   # mint OK?
```

## Files

- `install.mjs` — idempotent installer (`--project <dir>` default cwd, `--global`, `--check`, `--uninstall`)
- `mcp.freebuff.snippet.json` — HyperNexus MCP server fragment for `.agents/mcp.json` (reference)
- `meta-model.freebuff.md` — Meta `muse-spark-1.3-contributor` wiring for Freebuff (reference, no secrets)
- `bin/meta-muse-key.mjs` — mint a Meta Model API key from pi `auth.json` identity (live-read, never stored)
- `prompt-overlay.md` — memory-first discipline + tool map (managed into `AGENTS.md`)
- `preferred-tools.md` — which HyperNexus surface to use for what
- `swarm-prompt-block.md` — multi-agent persistence contract
- `skills/*/SKILL.md` — 3 core skills (freebuff-flavored)
- `agent/*.md` — 2 agents: `hypernexus-orchestrator` + `hypernexus-researcher` (installed as `/skill:<name>`)
- `commands/hn-*.md` — 11 command prompt files (installed as `/skill:hn-*` command-skills)
- `bin/meta-muse-key.mjs` — Meta key mint (also mirrored for BYOK `env:META_MUSE_API_KEY`)

Hooks (`hooks/`, by-convention — freebuff has no hook API): `hn-session.sh`, `hn-rbac.sh`, `hn-pre-tool.sh` — see `hooks/README.md`. Meta launcher: `use-meta-model.ps1` (mints a fresh key per run — minter pattern, never a pasted snapshot). BYOK connection: `~/.config/freebuff/byok/connections.json` (managed by `scripts/sync-meta-harness.ps1`, not this addon).
