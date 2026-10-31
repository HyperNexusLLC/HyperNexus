---
name: hypernexus-workflows
description: "Reusable HyperNexus orchestration workflows for mini-swe-agent: MEM-FIRST, DISCOVER, HARVEST, HANDOFF, OPS, and the RECALL→DISCOVER→EXECUTE→PERSIST→VERIFY loop. Trigger on 'multi-step task', 'resume work', 'capability gap', 'handoff', 'session summary', or when starting complex work with hypernexus tools available."
---

# HyperNexus Workflows

Loop: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

## MEM-FIRST (any multi-step task)

1. `hypernexus_context_harvest` (topic = the task)
2. `hypernexus_memory_search` for prior decisions/gotchas
3. Execute
4. `hypernexus_memory_store` the non-obvious outcomes

## DISCOVER (capability gap)

1. `hypernexus_suggest_tools` — what the advertiser recommends for this conversation
2. `hypernexus_tool_search` — semantic search across 26k+ tools
3. `hypernexus_mcp_call` — route the call through the kernel
4. `hypernexus_memory_store` — remember what worked

## HARVEST (resuming after a break)

1. `hypernexus_context_harvest`
2. `hypernexus_session_context` — active goal + cross-session links
3. `hypernexus_session_handoff` (action=pickup) — restore the last handoff
4. `hypernexus_memory_list` — recent vault activity

## HANDOFF (end of session / context switch)

1. `hypernexus_session_handoff` (action=write, summary=…)
2. `hypernexus_memory_store` with tags `["session", "summary"]`
3. `/hn-summary` — model-generated session summary stored to L2

## OPS (deployments / incidents)

See the `hypernexus-ops` skill: verify → act → verify → persist.

## Inline recall

`@memory:keyword` in any prompt expands matching L2 context inline.
