---
name: hypernexus-sessions
description: "HyperNexus session continuity and agent dispatch for Jcode: resume prior cross-harness sessions, read the active goal from scratchpad, hand off to the next session, and dispatch swarm/scheduled subagents that persist back to L2. Trigger on 'resume', 'handoff', 'session summary', 'active goal', 'swarm', 'dispatch', or 'continue previous work'."
---

# HyperNexus Sessions & Dispatch (Jcode)

Cross-session continuity plus subagent orchestration, backed by the
`hypernexus` MCP server (`mcp__hypernexus__*`).

## Resume (HARVEST)

1. `mcp__hypernexus__search_memory` with the task topic — prior decisions/gotchas
   (empty query returns recent).
2. `mcp__hypernexus__memory_scratchpad_get` key `goal` — the active goal, if set.
3. `mcp__hypernexus__memory_stats` — vault activity overview.
4. Never invent history: if the kernel is down, say continuity is unavailable
   this turn and continue locally.

## Hand off (HANDOFF)

1. `mcp__hypernexus__add_memory` a short session summary (delivered, verified
   with numbers, remaining) — tags `"session,summary"` plus one topic tag.
2. `mcp__hypernexus__memory_scratchpad_set` key `goal` — what the next session
   should pick up (clear it when the work is complete).
3. `mcp__hypernexus__memory_extract_relations` on the summary when
   entities/relations matter for future work.

## Dispatch agents

- Jcode-native `swarm` spawns inline subagents; `schedule` resumes work later.
- Every worker persists findings itself (see the swarm prompt block):
  `mcp__hypernexus__search_memory` before multi-step work,
  `mcp__hypernexus__add_memory` after non-obvious outcomes, summary tagged
  `session,summary,<swarm-label>` at the end of the assignment.
- The dispatcher records the task spine first (`mcp__hypernexus__add_memory`,
  tags `"session,dispatch"`), so a dead worker never loses the assignment.

## Degradation

Kernel calls are budgeted and never throw. If any `mcp__hypernexus__*` call
fails, continue with local tools and skip the persistence step.
