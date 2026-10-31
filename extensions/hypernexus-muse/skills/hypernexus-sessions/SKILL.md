---
name: hypernexus-sessions
description: Manage HyperNexus sessions end to end from Muse — supervised session lifecycle, imported third-party sessions, cross-agent handoff/pickup, session summaries, bootstrap context, and tool-context recall. Use for anything that spans turns: resuming work, handing off to another agent, or auditing what sessions exist.
---

# HyperNexus Sessions (Muse)

Local AI control plane (Go kernel, `http://127.0.0.1:7778`).

## Lifecycle

- `GET /api/sessions/summary`, `GET /api/sessions/context`.
- Supervised: `/api/sessions/supervisor/list|create|start|stop|logs|health`.
- Summaries: `POST /api/memory/session-summaries/capture`,
  `GET /api/memory/session-summaries/recent|search`.
- Bootstrap: `GET /api/memory/session-bootstrap`.

## Handoff

- `POST /api/agent-memory/handoff`, pickup via `/api/agent-memory/pickup`.
- Set scratchpad key `goal` to the next step after capturing.
