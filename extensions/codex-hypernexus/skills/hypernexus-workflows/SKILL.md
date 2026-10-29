---
name: "hypernexus-workflows"
description: "Reusable HyperNexus orchestration workflows for Codex — MEM-FIRST, DISCOVER, HARVEST, HANDOFF, OPS, and the RECALL to VERIFY loop, mapped to the hypernexus MCP tools."
---

# HyperNexus Workflows (Codex)

Loop: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

## MEM-FIRST (any multi-step task)

1. `search_memory` with the task topic — prior decisions/gotchas
2. Execute the task
3. `add_memory` the non-obvious outcomes (tags: `task,<topic>`)
4. `memory_extract_relations` on important findings (knowledge graph)

## DISCOVER (capability gap)

1. `mcp_list_tools` — what the bridge has assimilated
2. `mcp_call_tool` — route the call (`serverName`, `toolName`, `arguments`)
3. `add_memory` — remember which tool worked

## HARVEST (resuming after a break)

1. `search_memory` (empty query → recent; then topic query)
2. `memory_scratchpad_get` key `goal` — active goal if set
3. `memory_stats` — vault activity overview

## HANDOFF (end of session / context switch)

1. `add_memory` with a session summary, tags `session,summary`
2. `memory_scratchpad_set` key `goal` — what the next session should pick up
3. Append the summary to `HANDOFF.md` (multi-agent handoff protocol)

## muse-spark-1.3-contributor coordination

When acting as the contributor agent coordinating with Muse (https://muse.ai/)
via CDP: identify as `[muse-spark-1.3-contributor in codex in HyperNexus]`,
relay and prepare artifacts only — no commits, spend, deploys, or billing
without Robert's direct word. Keep Muse tracks separate; never merge the
spec track with exploratory pilot tracks.

## OPS (deployments / incidents)

See the `hypernexus-ops` skill: verify → act → verify → persist.

## Degradation

Every workflow degrades gracefully: if any kernel call fails, continue
the task with local tools and skip persistence (never stall the turn).
