---
name: hypernexus-workflows
description: Reusable HyperNexus orchestration workflows for VS Code — MEM-FIRST, DISCOVER, HARVEST, HANDOFF, OPS, and the RECALL to VERIFY loop, mapped to the hypernexus MCP tools.
---

# HyperNexus Workflows (VS Code)

Loop: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

## MEM-FIRST (any multi-step task)

1. Recall: `search_memory` + `GET /api/memory/session-bootstrap`.
2. Discover: `mcp_list_tools`; route gaps via `mcp_call_tool`.
3. Execute: do the work; track the plan in scratchpad key `current_task`.
4. Persist: `add_memory` for non-obvious outcomes.
5. Verify: `system_status` (VS Code: `hypernexus.runOpsCheck`).

## HANDOFF

Capture via `hypernexus.captureHandoff`
(`POST /api/memory/session-summaries/capture`); set scratchpad `goal`.

## OPS

Verify-before/after around production changes; persist with tags
`ops,deploy`. Kernel `http://127.0.0.1:7778` (8080 is stale).
