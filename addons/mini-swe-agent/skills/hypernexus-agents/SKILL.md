---
name: hypernexus-agents
description: "Agent dispatch from pi via HyperNexus: record tasks to L2, harvest context inline, track with tags. Use when delegating, deferring, or tracking multi-step work."
---

# HyperNexus Agent Dispatch (pi)

Pi executes work inline (`ctx.executeTool`); there is no live sub-agent
spawn. Dispatch = persist intent + harvest context so work survives sessions.

## Flow

1. Record: `hn_agent_dispatch` with `{ task, context? }`
   → `POST /api/memory/facts/add` body:
   ```json
   { "content": "[AGENT TASK] <id>\nTask: ...\nContext: ...\nStatus: dispatched",
     "tags": ["agent:dispatch", "task:<id>"], "type": "task" }
   ```
2. Harvest: the tool calls `ctx.executeTool("hn_memory_search", ...)` inline and
   returns the top L2 hits as the starting context.
3. Resume later: `hn_memory_search` with tag `agent:dispatch`, or `/hn-dispatch <task>` (command variant, no harvest).
4. Observe: every step is logged as a `pi-hook` observation for the audit trail.

## Rules

- One task = one fact; update status by appending a new fact, never editing.
- Task IDs: `pi-task-<base36 timestamp>`; keep them in tags for lookup.
- Reminders/agents UIs: pi has no native reminder/agent registration API, so
  L2-backed task facts are the portable equivalent — they render in any client.
