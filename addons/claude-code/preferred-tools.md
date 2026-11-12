# HyperNexus preferred tools (Claude Code)

Route every HyperNexus need through the `hypernexus` MCP server first; fall back
to the HTTP kernel API only when the MCP server is unreachable.

1. **Memory recall** — `search_memory` (semantic) → FTS endpoint (hot loop) →
   `memory_scratchpad_get` for `goal`/`persona`/`human`.
2. **Memory store** — `add_memory` (+ `importance`, topic tags) then
   `memory_extract_relations` when entities matter.
3. **Tool discovery** — `mcp_list_servers` (inventory) → `mcp_list_tools`
   (capabilities) → semantic `/api/mcp/tools/search?query=` (meaning match).
4. **Tool routing** — `mcp_call_tool` (`serverName`, `toolName`, `arguments` JSON).
5. **Health** — `system_status` → `mcp_status` → `billing_status` →
   `memory_stats`; HTTP fallbacks `/health`, `/api/mcp/status`, `/api/billing/status`.
6. **Code** — `codebase_search` (symbols|definitions|references) → `repomap` →
   `codebase_outline`; files via `read`/`write`/`edit`, search via `grep`/`find`/`ls`.
7. **Sessions** — `search_memory` scoped by session + scratchpad `goal`; HTTP
   `/api/sessions/summary` for cross-harness resume.
8. **Skills** — HTTP `/api/skills*` registry; local plugin `skills/`.
