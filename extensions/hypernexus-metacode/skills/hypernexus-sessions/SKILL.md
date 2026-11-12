---
name: hypernexus-sessions
description: Manage HyperNexus sessions end to end from Meta Code — supervised session lifecycle, imported third-party sessions, cross-agent handoff/pickup, session summaries, bootstrap context, and tool-context recall. Use for anything that spans turns: resuming work, handing off to another agent, or auditing what sessions exist.
---

# HyperNexus Sessions (Meta Code)

Port **7778** is authoritative. Every call below degrades: if the kernel
is unreachable, continue locally and say so in one line.

## Supervised sessions

- `GET /api/sessions` — list; `GET /api/sessions/summary` — overview
- `GET /api/sessions/context` — current context window state
- `GET /api/sessions/supervisor/list|create|start|stop|logs|health`
- `GET /api/memory/tool-context` — what the last tools touched
- `GET /api/memory/session-bootstrap` — resume context after a break

## Imported sessions (read-only mirrors)

`GET /api/sessions/imported/list` then per-source detail:

- `.../get`, `.../scan` with `source` in
  `claude-code, cursor, opencode, aider, windscribe, continue, copilot`

## Handoff / pickup (cross-agent)

- `POST /api/agent-memory/handoff` — publish `{content, tags, namespace}`
- `POST /api/agent-memory/pickup` — claim the next pending handoff
- `POST /api/memory/session-summaries/capture` — needs
  `sessionId`, `status`, `summary`; read back via
  `GET /api/memory/session-summaries/recent|search`

## Scratchpad continuity

- `memory_scratchpad_get/set/append` key `goal` — the active next step
- `memory_stats` — vault / scratchpad / relation tier counts

## MCP equivalents (stdio-first)

`search_memory` (empty query returns recent), `add_memory` with tags
`session,summary,<worker-label>`, `memory_extract_relations` for the
knowledge graph.
