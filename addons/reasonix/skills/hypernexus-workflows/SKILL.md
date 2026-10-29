---
name: hypernexus-workflows
description: "Reusable HyperNexus orchestration workflows for Reasonix: MEM-FIRST, DISCOVER, HARVEST, HANDOFF, OPS, and the RECALL→DISCOVER→EXECUTE→PERSIST→VERIFY loop. Trigger on 'multi-step task', 'resume work', 'capability gap', 'handoff', 'session summary', or when starting complex work with hypernexus tools available."
---

# HyperNexus Workflows (Reasonix)

Loop: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

## MEM-FIRST (any multi-step task)

1. `ext__hypernexus__context_harvest` (topic = the task)
2. `ext__hypernexus__memory_search` for prior decisions/gotchas
3. Execute
4. `ext__hypernexus__memory_store` the non-obvious outcomes

## DISCOVER (capability gap)

1. `ext__hypernexus__suggest_tools` — what the advertiser recommends for this conversation
2. `ext__hypernexus__tool_search` — semantic search across 26k+ tools
3. `ext__hypernexus__mcp_call` — route the call through the kernel
4. `ext__hypernexus__memory_store` — remember what worked

## HARVEST (resuming after a break)

1. `ext__hypernexus__context_harvest`
2. `ext__hypernexus__session_context` — active goal + cross-session links
3. `ext__hypernexus__session_handoff` (action=pickup) — restore the last handoff
4. `ext__hypernexus__memory_list` — recent vault activity

## HANDOFF (end of session / context switch)

1. `ext__hypernexus__session_handoff` (action=write, summary=…)
2. `ext__hypernexus__memory_store` with tags `["session", "summary"]`
3. `/hypernexus:hn-summary` — model-generated session summary stored to L2

## OPS (deployments / incidents)

See the `hypernexus-ops` skill: verify → act → verify → persist.

## Inline recall

`@memory:keyword` in any prompt expands matching L2 context inline (sidecar interceptor).
