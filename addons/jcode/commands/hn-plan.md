---
name: hn-plan
description: "Plan a multi-step task through the HyperNexus RECALL-DISCOVER-EXECUTE-PERSIST-VERIFY loop from Jcode. Trigger on '/hn-plan' or 'plan with hypernexus'."
---

# /hn-plan <goal>

$ARGUMENTS

Structure the work before executing:

1. RECALL — `mcp__hypernexus__search_memory` with the goal topic (prior
   decisions/gotchas) + `mcp__hypernexus__memory_scratchpad_get` key `goal`.
2. DISCOVER — if the task needs a capability you lack,
   `mcp__hypernexus__mcp_list_tools` then `mcp__hypernexus__mcp_call_tool`.
3. Present a short numbered plan (steps, verification per step). Do NOT execute
   yet — wait for confirmation unless the user already said to proceed.
4. On confirmation, execute and PERSIST the outcome
   (`mcp__hypernexus__add_memory`, tags `session,plan` + one topic tag).
