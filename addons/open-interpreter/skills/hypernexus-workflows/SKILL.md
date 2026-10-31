---
user-invocable: true
name: hypernexus-workflows
description: "Reusable HyperNexus orchestration workflows for Open Interpreter: MEM-FIRST, DISCOVER, HARVEST, HANDOFF, OPS, and the RECALL→DISCOVER→EXECUTE→PERSIST→VERIFY loop. Trigger on 'multi-step task', 'resume work', 'capability gap', 'handoff', 'session summary', or when starting complex work with hypernexus tools available."
---

# HyperNexus Workflows (Open Interpreter)

Invoke with `/skill:hypernexus-workflows`.

Loop: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

Open Interpreter maps the loop onto MCP tools + HTTP (no hooks surface — run each
step explicitly).

## MEM-FIRST (any multi-step task)

1. FTS recall: `GET /api/memory/fts-search?q=<topic>&limit=8` (fast, ~15ms)
2. Depth: `search_memory` for prior decisions/gotchas
3. Execute
4. `add_memory` the non-obvious outcomes (tags `topic,kind`)

## DISCOVER (capability gap)

1. `mcp_list_servers` — live inventory
2. `mcp_list_tools` + semantic `/api/mcp/tools/search?query=` — meaning match
3. `mcp_call_tool` — route the call (`serverName`, `toolName`, `arguments`)
4. `add_memory` — remember what worked (tags `tool-routing`)

## HARVEST (resuming after a break)

1. `search_memory` on the task topic + scratchpad `memory_scratchpad_get` (`goal`)
2. HTTP `/api/sessions/summary` for cross-harness resume
3. Recent vault activity via `memory_stats` / `search_memory` (empty query → recent)

## HANDOFF (end of session / context switch)

1. `/skill:hn-summary` — model-generated session summary stored to L2
2. `add_memory` with tags `["session", "summary"]`
3. start a new `interpreter` session in the same directory and recall the summary via `search_memory` with the task topic

## OPS (deployments / incidents)

See the `hypernexus-ops` skill (`/skill:hypernexus-ops`): verify → act → verify → persist.
