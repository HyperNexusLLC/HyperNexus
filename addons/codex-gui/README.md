# HyperNexus x Codex GUI

Minimal HyperNexus integration for the Codex web GUI harness (NEW files only; no existing files edited).

- Model: `meta/muse-wonder-1.0-contributor`
- OpenAI-compatible base URL: `http://127.0.0.1:7778/v1` (served by the local HyperNexus kernel; see `connection.json`)
- Auth: live key-mint per run via `node addons/shared/bin/meta-muse-key.mjs` into `META_API_KEY` (pi owns refresh; stdout only, never stored)
- MCP: `mcp.json` launches the kernel over stdio (`hypernexus.exe mcp` with `HYPERNEXUS_URL` + `HYPERNEXUS_WORKSPACE_ROOT`)
- Tool policy: shell tools disabled in this GUI harness; use the HyperNexus parity tools exposed over MCP instead
- Kernel health: `GET http://127.0.0.1:7778/healthz` (do not restart, kill, or rebuild the kernel)

## Skills, commands, hooks

- Skills: `skills/hypernexus/SKILL.md` (recall/discover/persist/verify loop).
- Commands: `commands/hn-{status,store,search,tools,session,context}.md`.
- Hooks: `hooks/hn-pre-tool.mjs` allow-gate (denies bash/powershell/shell; parity tools only).
- Model: `meta/muse-wonder-1.0-contributor`, minted live via `bin/meta-muse-key.mjs` (pi owns refresh).
- Install: `node addons/codex-gui/install.mjs [--global|--check|--uninstall]`; test: `node addons/codex-gui/bin/test-codex-gui-ext.mjs [--live]`.

## Swarm orchestration (one session controls the rest)

- Leader: `agent/swarm-leader.md` (main session fans out disjoint subtasks via per-thread messages, tracks roster, collects reports).
- Workers: `agent/swarm-worker.md` (execute assigned scope, report back in-thread ending `STATUS: DONE` / `STATUS: BLOCKED`).
- Skill: `skills/hypernexus-orchestrator/SKILL.md`; commands `commands/hn-swarm.md` (fan-out) + `commands/hn-report.md` (report-back); overlay `prompt-overlay.md`.
