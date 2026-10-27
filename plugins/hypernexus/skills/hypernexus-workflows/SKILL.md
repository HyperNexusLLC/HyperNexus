---
name: hypernexus-workflows
description: Multi-step orchestration loop (recall → discover → execute → persist → verify) plus session handoff. Use for complex tasks spanning memory, tools, and sessions.
---

# HyperNexus Workflows

## The loop

1. **RECALL** — `context_harvest` + `memory_search` before planning.
2. **DISCOVER** — `suggest_tools` → `tool_search` → `mcp_call`.
3. **EXECUTE** — do the work; keep the plan in `memory_scratchpad_set` (key `current_task`).
4. **PERSIST** — `memory_store` every non-obvious decision; `record_observation` for structured findings.
5. **VERIFY** — `status` after significant changes.

## Session handoff

- `session_handoff` (write) at the end of long sessions; `session_handoff` (pickup) to resume.
- `session_search` — find prior imported sessions (Claude Code, Aider, …).
- `skill_search` / `skill_manage` — reusable SKILL.md capability modules.

## Rules

- Never re-derive what memory holds.
- End-to-end runs must be reproducible: record model, kernel version, and harness.
