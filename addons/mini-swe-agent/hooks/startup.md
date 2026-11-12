# HyperNexus session primer (Reasonix SessionStart context hook)

HyperNexus is the local AI control plane: Go kernel at
`http://127.0.0.1:7778` (health: `GET /health`), with persistent multi-tier
memory (L1 scratchpad, L2 vector store, L3 cold archive), semantic MCP tool
discovery across 26k+ tools, a knowledge graph, session import, and billing.

Discipline for every multi-step task — **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**:

1. **RECALL first** — `ext__hypernexus__context_harvest` (or
   `ext__hypernexus__memory_search`) before re-deriving known answers.
2. **DISCOVER on capability gaps** — `ext__hypernexus__tool_search`, then
   `ext__hypernexus__mcp_call` to route through the kernel.
3. **PERSIST non-obvious outcomes** — decisions, gotchas, fixes go to
   `ext__hypernexus__memory_store` with tags.
4. **VERIFY around production changes** — `ext__hypernexus__status` before
   and after.
5. **FAST on hot paths** — prefer `ext__hypernexus__memory_fts_search`
   inside tight loops; it is the FTS-only (~15ms) variant.

Inline recall: `@memory:keyword` in a prompt expands matching L2 context.
Write `@memory:key` references and the input interceptor expands them.

If the kernel is unreachable, tools report a short degraded note — continue
with local tools, never stall the turn.
