---
name: hypernexus-workflows
description: "HyperNexus workflows from pi: kernel workflow status, dispatch-via-L2 pattern, command surface. Use when running or monitoring multi-step kernel workflows."
---

# HyperNexus Workflows (pi)

Kernel baseline: `http://127.0.0.1:7778`.

## Surfaces

- Tool: `hn_workflow_status` → `GET /api/workflows` (list; native runs via `POST /api/native/workflows/run`).
- Command: `/hn-workflow` (notify with truncated status JSON).
- Dispatch: `hn_agent_dispatch` / `/hn-dispatch` records workflow intent as an
  L2 `agent:dispatch` fact so a later turn (or agent) can pick it up.

## Pattern: durable multi-step work

1. `/hn-dispatch <goal>` — persist intent (task fact with ID + tags).
2. Work turns execute inline; each `turn_end` with tool results logs a summary fact.
3. `/hn-workflow` — check kernel-side workflow state.
4. `/hn-recall <topic>` — next session resumes from L2 facts.

## Rules

- Pi has no background-runner API: long workflows persist state in L2, they do
  not detach. Say so when the user expects fire-and-forget execution.
- Keep status payloads truncated (≤2000 chars) — raw workflow JSON can be large.
