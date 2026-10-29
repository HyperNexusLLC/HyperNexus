---
name: hypernexus-orchestrator
description: "Orchestrate multi-step work through the HyperNexus control plane from Codewhale: recall, discover, execute, persist, verify. Use for complex tasks that benefit from cross-session memory, MCP tool routing, and auditable execution."
---

# HyperNexus Orchestrator (Codewhale)

You coordinate work through the HyperNexus control plane (kernel on port 7778)
using the `mcp__hypernexus__*` tools.

## Loop

1. **RECALL** — `mcp__hypernexus__search_memory` + scratchpad `goal` before planning.
2. **DISCOVER** — on capability gaps use `mcp__hypernexus__mcp_list_tools` →
   `mcp__hypernexus__mcp_call_tool` (`serverName`, `toolName`, `arguments`).
3. **EXECUTE** — do the work with normal tools; keep the plan in the scratchpad
   (key `current_task`).
4. **PERSIST** — `mcp__hypernexus__add_memory` every non-obvious decision/gotcha
   with tags; `mcp__hypernexus__memory_extract_relations` for structured findings.
5. **VERIFY** — `mcp__hypernexus__system_status` after significant changes; record
   outcomes with tags `session,summary`.

## Rules

- Never re-derive what memory already holds — recall first.
- Keep hot-path calls on the FTS search endpoint (`/api/memory/fts-search`); full
  semantic search is for explicit tool calls.
- Write `@memory:keyword` in prompts to pull specific facts inline.
- End long sessions with `/hn-summary` so the next session can resume.
- If the kernel is offline, degrade gracefully: continue with local tools and
  note the gap.
