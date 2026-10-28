---
name: hypernexus-workflows
description: Reusable HyperNexus orchestration workflows for Droid: MEM-FIRST, DISCOVER, HARVEST, HANDOFF, OPS, and the RECALL-DISCOVER-EXECUTE-PERSIST-VERIFY loop over the hypernexus MCP server. Trigger on 'multi-step task', 'resume work', 'capability gap', 'handoff', 'session summary', or when starting complex work with hypernexus tools available.
---

# HyperNexus Workflows (Droid)

Loop: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

## MEM-FIRST (any multi-step task)

1. `memory_scratchpad_get` + `search_memory` for prior decisions/gotchas
2. Execute
3. `add_memory` the non-obvious outcomes

## DISCOVER (capability gap)

1. `mcp_list_tools` — search the live MCP inventory for the capability
2. `mcp_call_tool` — route the call through the kernel
3. `add_memory` — remember what worked

## HARVEST (resuming after a break)

1. `search_memory` for the topic
2. `memory_scratchpad_get` — active goal
3. `add_memory`-stored session summaries with tag `session`

## HANDOFF (end of session / context switch)

1. `memory_scratchpad_set` the goal + next steps
2. `add_memory` a session summary with tags `["session", "summary"]`
3. `/hn-summary` — model-generated session summary stored to L2

## OPS (deployments / incidents)

See the `hypernexus-ops` skill: verify → act → verify → persist.

## Inline recall

`@memory:keyword` in any prompt expands matching L2 context inline via the plugin hook.
