---
name: hypernexus-workflows
description: Reusable HyperNexus orchestration workflows for Muse — MEM-FIRST, DISCOVER, HARVEST, HANDOFF, OPS, and the RECALL to VERIFY loop, mapped to the hypernexus MCP tools.
---

# HyperNexus Workflows (Muse)

Local AI control plane (Go kernel, `http://127.0.0.1:7778`).

Loop: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

## MEM-FIRST (any multi-step task)

1. Recall: memory search + `GET /api/memory/session-bootstrap`.
2. Discover: MCP tool list; route gaps through the kernel.
3. Execute: do the work; track the plan in scratchpad key `current_task`.
4. Persist: store non-obvious outcomes.
5. Verify: kernel status after significant changes.

## HANDOFF

Capture via `POST /api/memory/session-summaries/capture`; set
scratchpad `goal` to the next step.
