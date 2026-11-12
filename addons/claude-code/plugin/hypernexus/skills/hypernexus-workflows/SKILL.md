---
name: hypernexus-workflows
description: "Reusable HyperNexus orchestration workflows for Claude Code: MEM-FIRST, DISCOVER, HARVEST, HANDOFF, OPS, and the RECALL→DISCOVER→EXECUTE→PERSIST→VERIFY loop, mapped to the hypernexus MCP tools. Trigger on 'multi-step task', 'resume work', 'capability gap', 'handoff', 'session summary', or when starting complex work with hypernexus tools available."
---

# HyperNexus Workflows (Claude Code)

Loop: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

## MEM-FIRST (any multi-step task)

1. `mcp__hypernexus__search_memory` with the task topic — prior decisions/gotchas
2. Execute the task
3. `mcp__hypernexus__add_memory` the non-obvious outcomes (tags: `task,<topic>`)
4. `mcp__hypernexus__memory_extract_relations` on important findings (knowledge graph)

## DISCOVER (capability gap)

1. `mcp__hypernexus__mcp_list_tools` — what the bridge has assimilated
2. `mcp__hypernexus__mcp_call_tool` — route the call (`serverName`, `toolName`, `arguments`)
3. `mcp__hypernexus__add_memory` — remember which tool worked

## HARVEST (resuming after a break)

1. `mcp__hypernexus__search_memory` (empty query → recent; then topic query)
2. `mcp__hypernexus__memory_scratchpad_get` key `goal` — active goal if set
3. `mcp__hypernexus__memory_stats` — vault activity overview

## HANDOFF (end of session / context switch)

1. `mcp__hypernexus__add_memory` with a session summary, tags `"session,summary"`
2. `mcp__hypernexus__memory_scratchpad_set` key `goal` — what the next session should pick up
3. Append the summary to `HANDOFF.md` (multi-agent handoff protocol)

## Subagent persistence (Claude Code workers)

Claude Code subagents share this workspace's HyperNexus kernel (MCP server `hypernexus`,
tools `mcp__hypernexus__*`). Workers must persist findings, not just report them:

- Before multi-step work: `mcp__hypernexus__search_memory` for prior decisions/gotchas.
- After non-obvious outcomes: `mcp__hypernexus__add_memory` with tags including the
  task label (append-only; safe to retry).
- End of assignment: `mcp__hypernexus__add_memory` a short summary tagged
  `session,summary,<worker-label>` and set scratchpad key `goal` if work continues.
- If the HyperNexus MCP tools are unavailable, degrade silently and complete the task
  locally. Never stall a worker turn on memory operations.

## OPS (deployments / incidents)

See the `hypernexus-ops` skill: verify → act → verify → persist.

## Memory hygiene (periodic)

Manual or scheduled: `mcp__hypernexus__memory_extract_relations_batch` (limit 100)
to keep the knowledge graph fresh, and `mcp__hypernexus__memory_stats` to watch growth.

## Degradation

Every workflow degrades gracefully: if any `mcp__hypernexus__*` call fails, continue
the task with local tools and skip the persistence step (never stall the turn).
