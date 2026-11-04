# HyperNexus x Paseo GUI

Dual-model HyperNexus integration (`meta/muse-wonder-1.0-contributor` primary + `meta/muse-spark-1.3-contributor` alt).

- Models via kernel proxy `http://127.0.0.1:7778/v1` (`connection.json` pins `model` + `altModel`); auth live-minted per run into `META_API_KEY` (pi owns refresh; stdout only, never stored).
- MCP: `mcp.json` launches kernel over stdio with `HYPERNEXUS_URL` + `HYPERNEXUS_WORKSPACE_ROOT`.
- Tool policy: shell tools disabled; HyperNexus parity tools with MINIMAL descriptions (Meta 403 guard).
- Kernel health: `GET http://127.0.0.1:7778/health`.

## Skills, commands, agents, hooks

- Skills: `skills/hypernexus/SKILL.md`, `skills/hypernexus-orchestrator/SKILL.md`.
- Commands: `commands/hn-{status,store,search,tools,session,context,swarm,report}.md`.
- Agents: `agent/swarm-leader.md` (main session controls the rest) + `agent/swarm-worker.md` (report back in-thread).
- Hooks: `hooks/hn-pre-tool.mjs` allow-gate. Overlay: `prompt-overlay.md`.
- Install: `node addons/paseo-gui/install.mjs [--global|--check|--uninstall]`; test: `node addons/paseo-gui/bin/test-paseo-gui-ext.mjs [--live]`.
