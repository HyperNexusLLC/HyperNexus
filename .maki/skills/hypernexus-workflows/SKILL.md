---
name: hypernexus-workflows
description: Reusable HyperNexus orchestration workflows for maki.
---

# HyperNexus Workflows

Loop: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

## MEM-FIRST (any multi-step task)

1. `hypernexus_context_harvest` (task = the task)
2. `hypernexus_memory_search` for prior decisions/gotchas
3. Execute
4. `hypernexus_memory_store` the non-obvious outcomes

## DISCOVER (capability gap)

1. `hypernexus_suggest_tools`
2. `hypernexus_tool_search`
3. `hypernexus_mcp_call`
4. Store what worked

## HARVEST (resuming)

1. `hypernexus_context_harvest`
2. `hypernexus_session_context`
3. `hypernexus_memory_handoff` (pickup)
4. `hypernexus_memory_list` (recent vault)

## HANDOFF (end of session)

1. `hypernexus_memory_handoff` (write)
2. `hypernexus_memory_store` with tags `["session", "summary"]`
3. `/project:hn-summary`

## OPS

See `hypernexus-ops`: verify → act → verify → persist.
