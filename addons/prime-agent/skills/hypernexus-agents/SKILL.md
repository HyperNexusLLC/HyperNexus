---
name: hypernexus-agents
description: "Agent dispatch from Prime Agent via HyperNexus: record tasks to L2, harvest context, hand off across sessions with send/schedule. Use when delegating, deferring, or tracking multi-step work."
---

# HyperNexus Agent Dispatch (Prime Agent)

Kernel baseline: `http://127.0.0.1:7778`.

## Flow

1. Record intent to L2 (one task = one fact, `agent:dispatch` tags):

   ```python
   await hypernexus.memory_fact(
       "Dispatch: <short goal>",
       "Task: ...\nContext: ...\nStatus: dispatched",
       tags=["agent:dispatch", "task:<id>"], namespace="project")
   ```

   Task IDs: `pa-task-<base36 timestamp>`; keep them in tags for lookup.
2. Harvest starting context inline: `memory_search(topic)` /
   `tool_context("memory_search", active_goal="<goal>")` and hand the hits to
   the worker.
3. Live handoff to a running agent: `prime-agent send <agent> "<message>"`
   (`--follow-up` queues after the current turn, `--steer` nudges a busy agent).
   Track agents with `prime-agent list` / `prime-agent agents`.
4. Deferred work: `prime-agent schedule add <agent> "<cron>" -- "<prompt>"`
   (see `schedules/hn-standup.txt`). Cross-session continuity:
   `handoff(summary)` → artifact, `pickup(artifact)`.
5. Resume later: `memory_search` with tag `agent:dispatch`, or `/hn-dispatch`-style
   recall via the `hypernexus-sessions` skill.

## Rules

- Update status by appending a new fact, never editing.
- Agent-memory entries (`agent_memory_add(content, type="session")`,
  `agent_memory_recent(limit)`) complement task facts for session notes.
- Every dispatch step is logged as a `prime-agent-hook` observation for the audit trail.
