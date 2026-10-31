---
name: "hypernexus-sessions"
description: "Manage HyperNexus sessions end to end from Codex — supervised session lifecycle, imported third-party sessions, cross-agent handoff/pickup, session summaries, bootstrap context, and tool-context recall. Use for anything that spans turns: resuming work, handing off to another agent, or auditing what sessions exist."
---

# HyperNexus Sessions (Codex)

Port **7778** is authoritative. Every call below degrades: if the kernel
is unreachable, continue locally and say so in one line.

## Lifecycle

- `GET http://127.0.0.1:7778/api/sessions/summary` — active sessions
- `GET http://127.0.0.1:7778/api/sessions/context` — current context
- Supervised: `/api/sessions/supervisor/list|create|start|stop|logs|health`
- Summaries: `POST /api/memory/session-summaries/capture`,
  `GET /api/memory/session-summaries/recent|search`
- Bootstrap: `GET /api/memory/session-bootstrap`

## Handoff

- `POST /api/agent-memory/handoff` / pickup via `/api/agent-memory/pickup`
- Set scratchpad key `goal` to the next step after capturing.

## Imported sessions

`GET /api/sessions/imported/list|get|scan` (claude-code, cursor,
opencode, aider, windsurf, continue, copilot).
