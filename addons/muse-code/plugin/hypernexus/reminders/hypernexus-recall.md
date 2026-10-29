# HyperNexus recall discipline

Before deriving answers from scratch on any multi-step task:

1. **RECALL** — search HyperNexus memory first: `mcp__hypernexus__memory_fts_search`
   (fast) then `mcp__hypernexus__memory_search` (deep), plus scratchpad goal.
   HTTP fallback: `GET http://127.0.0.1:7778/api/memory/fts-search?q=` and
   `GET http://127.0.0.1:7778/api/memory/search?query=`.
2. **DISCOVER** — on a capability gap, list servers/tools and route via
   `mcp__hypernexus__mcp_call_tool` (`POST /api/agent/tool` fallback).
3. **EXECUTE** — do the work with local tools.
4. **PERSIST** — store non-obvious outcomes (`mcp__hypernexus__memory_store` /
   `POST /api/memory/facts/add`); never store secrets or credentials.
5. **VERIFY** — kernel `/health` before and after production changes.

If the kernel is down, say so in one sentence and continue with local tools —
never present mock state.
