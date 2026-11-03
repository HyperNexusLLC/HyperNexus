---
name: hypernexus-workflows
description: Reusable HyperNexus orchestration workflows for maki — MEM-FIRST, DISCOVER, HARVEST, HANDOFF, OPS, and the RECALL to VERIFY loop, mapped to the hypernexus MCP tools.
---

# HyperNexus Workflows (maki)

Loop: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

## MEM-FIRST (any multi-step task)

1. `search_memory` (or `hypernexus_memory_search`) with the task topic — prior decisions/gotchas
2. Execute the task
3. `add_memory` (or `hypernexus_memory_add`) the non-obvious outcomes (tags: `task,<topic>`)
4. `memory_extract_relations` on important findings (knowledge graph)

## DISCOVER (capability gap)

1. `mcp_list_tools` — what the bridge has assimilated
2. `mcp_call_tool` (or `hypernexus_mcp_call`) — route the call (`serverName`, `toolName`, `arguments`)
3. `add_memory` — remember which tool worked

## HARVEST (resuming after a break)

1. `search_memory` (empty query → recent; then topic query)
2. `memory_scratchpad_get` key `goal` — active goal if set
3. `hypernexus_session_bootstrap` (or `GET /api/memory/session-bootstrap`)
4. `memory_stats` — vault activity overview

## HANDOFF (end of session / context switch)

1. `add_memory` with a session summary, tags `session,summary`
2. `memory_scratchpad_set` key `goal` — what the next session should pick up
3. Append the summary to `HANDOFF.md` (multi-agent handoff protocol)

## Subagent persistence (workers)

Workers sharing this workspace kernel must persist findings, not just report:

- Before multi-step work: `search_memory` for prior decisions/gotchas.
- After non-obvious outcomes: `add_memory` with tags including the
  task label (append-only; safe to retry).
- End of assignment: `add_memory` a short summary tagged
  `session,summary,<worker-label>`; set scratchpad key `goal` if work continues.
- If MCP tools are unavailable, degrade silently and complete locally.

## OPS (deployments / incidents)

See the `hypernexus-ops` skill: verify → act → verify → persist.

## Memory hygiene (periodic)

Manual or scheduled: `memory_extract_relations_batch` (limit 100)
to keep the knowledge graph fresh, and `memory_stats` to watch growth.

## Degradation

Every workflow degrades gracefully: if any kernel call fails, continue
the task with local tools and skip persistence (never stall the turn).
