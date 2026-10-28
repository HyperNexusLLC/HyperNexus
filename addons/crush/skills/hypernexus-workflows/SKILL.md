---
user-invocable: true
name: hypernexus-workflows
description: "Reusable HyperNexus orchestration workflows for Crush: MEM-FIRST, DISCOVER, HARVEST, HANDOFF, OPS, and the RECALL->DISCOVER->EXECUTE->PERSIST->VERIFY loop. Trigger on 'multi-step task', 'resume work', 'capability gap', 'handoff', 'session summary', or when starting complex work with hypernexus tools available."
---

# HyperNexus Workflows (Crush)

Loop: **RECALL -> DISCOVER -> EXECUTE -> PERSIST -> VERIFY**

All tools below are the hypernexus MCP server tools (58 total).

## MEM-FIRST (any multi-step task)

1. `search_memory` (topic = the task; FTS `GET /api/memory/fts-search?q=` on hot paths)
2. `memory_scratchpad_get` (key `goal`) for the active objective
3. Execute
4. `add_memory` the non-obvious outcomes (+ `memory_extract_relations` for entities)

## DISCOVER (capability gap)

1. `mcp_list_servers` — live bridge inventory
2. `mcp_list_tools` + semantic `GET /api/mcp/tools/search?query=` — find the tool
3. `mcp_call_tool` — route the call through the kernel
4. `add_memory` (tags `tool-routing`) — remember what worked

## HARVEST (resuming after a break)

1. `search_memory` (topic = the task)
2. `memory_scratchpad_get` (key `goal`) — active goal
3. `GET /api/sessions/summary` — recent cross-harness sessions
4. `memory_stats` — vault activity snapshot

## HANDOFF (end of session / context switch)

1. `memory_scratchpad_set` (key `goal`, next objective)
2. `add_memory` (tags `session,summary`) with what changed + verification numbers
3. `memory_extract_relations` on the summary when entities matter
4. `/hn-summary` — the slash-command form of this workflow

## OPS (deployments / incidents)

See the `hypernexus-ops` skill: verify -> act -> verify -> persist.
