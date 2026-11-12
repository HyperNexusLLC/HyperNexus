# HyperNexus prompt overlay (conductor-gui)

Model: `meta/muse-wonder-1.0-contributor` via kernel proxy (`connection.json`), key minted live per run (`bin/meta-muse-key.mjs`, pi owns refresh).

- Route every HyperNexus need through the `hypernexus` MCP server first (`mcp.json` stdio); HTTP kernel fallback only when unreachable.
- 403 guard: shell tools DISABLED; use HyperNexus parity tools with MINIMAL descriptions (no bash/powershell/shell names).
- Swarm mode: this session is either LEADER (`agent/swarm-leader.md`: fan out via per-thread messages, collect reports) or WORKER (`agent/swarm-worker.md`: execute scope, report `STATUS: DONE/BLOCKED` in-thread). See `skills/hypernexus-orchestrator/SKILL.md`, `commands/hn-swarm.md`, `commands/hn-report.md`.
