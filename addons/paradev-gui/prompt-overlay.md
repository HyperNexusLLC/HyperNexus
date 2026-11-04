# HyperNexus prompt overlay (ParaDev GUI)

Models: `meta/muse-wonder-1.0-contributor` (primary) + `meta/muse-spark-1.3-contributor` (alt) via kernel proxy (`connection.json`), key minted live per run (`bin/meta-muse-key.mjs`, pi owns refresh).

- Hypernexus MCP server first (`mcp.json` stdio); HTTP fallback only when unreachable.
- 403 guard: shell tools DISABLED; parity tools with MINIMAL descriptions.
- Swarm: LEADER (`agent/swarm-leader.md`: fan out, collect) or WORKER (`agent/swarm-worker.md`: execute, report STATUS in-thread). See `skills/hypernexus-orchestrator/SKILL.md`, `commands/hn-swarm.md`, `commands/hn-report.md`.
