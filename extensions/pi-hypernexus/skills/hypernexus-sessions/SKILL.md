---
name: hypernexus-sessions
description: "HyperNexus session lifecycle from pi: start/shutdown/compact hooks, session listing, handoff facts. Use when resuming work, compacting context, or handing off across sessions."
---

# HyperNexus Sessions (pi)

Kernel baseline: `http://127.0.0.1:7778`.

## Lifecycle hooks (all log `pi-hook` observations to L2)

- `session_start` → status-bar presence + `[pi-hook:session_start]` fact.
- `turn_end` → stores turn summaries (tool-result turns, 50+ char summaries).
- `session_before_compact` → logs entry count + reason before compaction.
- `session_compact` → logs success for continuity.
- `session_shutdown` → clears the `hn` status key + logs shutdown fact.

## Listing / handoff

- Tool: `hn_session_list` → `GET /api/sessions` (detail: `/api/sessions/context`, `/api/sessions/summary`).
- Handoff pattern: store `type: "task"` facts with `agent:dispatch` tags;
  the next session recalls them with `hn_memory_search`.
- Command surface: `/hn-recall <topic>` pulls the L2 context a new session needs.

## Rules

- Compaction hooks observe only — they never mutate the compaction payload.
- Shutdown always clears UI keys it set; never leak a stale `hn` status.
