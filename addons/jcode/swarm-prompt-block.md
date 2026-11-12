<!-- hypernexus:begin (managed by addons/jcode/install.mjs — do not edit inside this block) -->
### HyperNexus persistence for swarm workers

Swarm workers share this workspace's HyperNexus kernel (MCP server `hypernexus`,
tools `mcp__hypernexus__*`). Workers must persist findings, not just report them:

- Before multi-step work: `mcp__hypernexus__search_memory` for prior decisions/gotchas.
- After non-obvious outcomes: `mcp__hypernexus__add_memory` with tags including the
  task label (append-only; safe to retry).
- End of assignment: `mcp__hypernexus__add_memory` a short summary tagged
  `session,summary,<swarm-label>` and set scratchpad key `goal` if work continues.
- Knowledge-graph enrichment on important findings:
  `mcp__hypernexus__memory_extract_relations`.

If the HyperNexus MCP tools are unavailable, degrade silently and complete the task
locally. Never stall a worker turn on memory operations.
<!-- hypernexus:end -->
