<!-- hypernexus:begin (managed by addons/jcode/install.mjs — do not edit inside this block) -->
## HyperNexus Control Plane

This workspace is integrated with the local HyperNexus kernel (Go, port 7778) through the
`hypernexus` MCP server. Its tools appear as `mcp__hypernexus__*` in the tool namespace.

Discipline loop for multi-step work: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

- **RECALL** — `mcp__hypernexus__search_memory` before re-deriving known answers or decisions.
- **DISCOVER** — on capability gaps use `mcp__hypernexus__mcp_list_tools` then `mcp__hypernexus__mcp_call_tool`.
- **PERSIST** — `mcp__hypernexus__add_memory` for non-obvious outcomes (tags: `topic,kind`);
  `mcp__hypernexus__memory_extract_relations` for entities/relations worth keeping in the graph.
- **VERIFY** — `mcp__hypernexus__system_status` before and after production changes.

Memory tiers: L1 scratchpad (`memory_scratchpad_get/set/append`) for short-lived working
state; L2 vault (`add_memory`/`search_memory`) for durable cross-session facts; L3 cold
archive via `search_memory` with `include_cold: true`. Jcode's native `memory` tool and
HyperNexus L2 are complementary — keep durable project facts in both.

Degradation contract: kernel calls never stall a turn. If `mcp__hypernexus__*` tools are
unavailable or the kernel is down, continue with local tools and note the gap in one
short sentence. All capabilities are also reachable over plain HTTP
(`http://127.0.0.1:7778/health`, `/api/memory/search?query=`, `/api/mcp/tools`,
`POST /api/agent/tool`) — the extension is an accelerator, not a dependency.
<!-- hypernexus:end -->
