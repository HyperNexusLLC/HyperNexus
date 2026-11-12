# HyperNexus x Cursor Glass GUI

Minimal HyperNexus integration for the Cursor Glass GUI harness (NEW files only; no existing files edited).

- Model: `meta/muse-spark-1.3-contributor`
- OpenAI-compatible base URL: `http://127.0.0.1:7778/v1` (served by the local HyperNexus kernel; see `connection.json`)
- Auth: live key-mint per run via `node addons/shared/bin/meta-muse-key.mjs` into `META_API_KEY` (stdout only, never stored)
- MCP: `mcp.json` launches the kernel over stdio (`hypernexus.exe mcp` with `HYPERNEXUS_URL` + `HYPERNEXUS_WORKSPACE_ROOT`)
- Tool policy: shell tools disabled in this GUI harness; use the HyperNexus parity tools exposed over MCP instead
- Kernel health: `GET http://127.0.0.1:7778/healthz` (do not restart, kill, or rebuild the kernel)

## Skills, commands, hooks

- Skills: `skills/hypernexus/SKILL.md` (recall/discover/persist/verify loop).
- Commands: `commands/hn-{status,store,search,tools,session,context}.md`.
- Hooks: `hooks/hn-pre-tool.mjs` allow-gate (denies bash/powershell/shell; parity tools only).
- Model: `meta/muse-spark-1.3-contributor`, minted live via `bin/meta-muse-key.mjs` (pi owns refresh).
- Install: `node addons/cursor-glass-gui/install.mjs [--global|--check|--uninstall]`; test: `node addons/cursor-glass-gui/bin/test-cursor-glass-gui-ext.mjs [--live]`.

## Swarm orchestration (one session controls the rest)

- Leader: `agent/swarm-leader.md` (main session fans out disjoint subtasks via per-thread messages, tracks roster, collects reports).
- Workers: `agent/swarm-worker.md` (execute assigned scope, report back in-thread ending `STATUS: DONE` / `STATUS: BLOCKED`).
- Skill: `skills/hypernexus-orchestrator/SKILL.md`; commands `commands/hn-swarm.md` + `commands/hn-report.md`; overlay `prompt-overlay.md`.
- Dual models: `connection.json` pins `model` + `altModel` (wonder + spark); both verified live via kernel proxy.

## App presence / staged config

- App: Cursor Glass GUI (Cursor editor glass UI). `cursor` CLI present at `C:\Users\hyper\AppData\Local\Programs\cursor\resources\app\bin\cursor.cmd`; no separate Glass binary/installer identified.
- Config here is a clearly-marked STAGED config: `install.mjs` writes/merges `mcp.json` + `connection.json` + provider with shell tools disabled into `<repo>/.cursor-glass-gui/` (or `~/.cursor-glass-gui/` with `--global`) in standard `mcpServers` format (Cursor-compatible) for import. Glass-specific real config format not discoverable in-repo.
- Install route: Cursor already installed; `node addons/cursor-glass-gui/install.mjs` then import staged files in Cursor/Glass MCP settings.
