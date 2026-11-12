---
name: hn-restore
description: "Restore prior session context via the agent-memory handoff pickup path from Jcode. Trigger on '/hn-restore', 'pickup handoff', or 'restore session'."
---

# /hn-restore [session-id]

$ARGUMENTS

Pick up where a prior session left off (completes the HANDOFF workflow that
`/hn-summary` starts):

1. `mcp__hypernexus__memory_scratchpad_get` key `goal` — the active goal.
2. `mcp__hypernexus__search_memory` with the current task topic, tags
   `session,summary` — the last handoff summary.
3. If a session id was given, fetch its structured context over HTTP:
   `GET http://127.0.0.1:7778/api/sessions/context?id=<id>`
   (or `/api/agent-memory/pickup` for handoff notes).
4. Summarize: goal, delivered state, remaining work. Then continue.
   If the kernel is down, say continuity is unavailable and continue locally.
