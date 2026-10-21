<!-- hypernexus:begin (managed by addons/codewhale/install.mjs — do not edit inside this block) -->
## HyperNexus Control Plane (Codewhale)

This workspace is integrated with the local HyperNexus kernel (Go, port 7778) through the
`hypernexus` MCP server (config: `.codewhale/mcp.json` / `~/.codewhale/mcp.json`). Its
tools appear as `mcp__hypernexus__*` in the merged tool namespace.

Discipline loop for multi-step work: **RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY**

- **RECALL** — `mcp__hypernexus__search_memory` before re-deriving known answers or decisions.
- **DISCOVER** — on capability gaps use `mcp__hypernexus__mcp_list_tools` then `mcp__hypernexus__mcp_call_tool`.
- **PERSIST** — `mcp__hypernexus__add_memory` for non-obvious outcomes (tags: `topic,kind`);
  `mcp__hypernexus__memory_extract_relations` for entities/relations worth keeping in the graph.
- **VERIFY** — `mcp__hypernexus__system_status` before and after production changes.

Memory tiers: L1 scratchpad (`memory_scratchpad_get/set/append`) for short-lived working
state; L2 vault (`add_memory`/`search_memory`) for durable cross-session facts; L3 cold
archive via `search_memory` with `include_cold: true`. Codewhale's own skills and session
state are complementary to HyperNexus L2 — keep durable project facts in both.

Preferred routing when both a native tool and a `mcp__hypernexus__*` tool fit: durable
cross-session memory → `add_memory`/`search_memory`; short-lived state →
`memory_scratchpad_*`; missing capability → `mcp_list_tools` → `mcp_call_tool`;
kernel/ops → `system_status`/`billing_status`/`memory_stats`. Codewhale-native tools keep
their own domains (files, shell, git, web); HyperNexus extends the plane, it never
replaces them.

Subagent persistence: Codewhale workers share this kernel. Persist findings with
`mcp__hypernexus__add_memory` (append-only, safe to retry), summarize assignments tagged
`session,summary,<worker-label>`, and set scratchpad key `goal` when work continues.

Degradation contract: kernel calls never stall a turn. If `mcp__hypernexus__*` tools are
unavailable or the kernel is down, continue with local tools and note the gap in one
short sentence. All capabilities are also reachable over plain HTTP
(`http://127.0.0.1:7778/health`, `/api/memory/search?query=`, `/api/mcp/tools`,
`POST /api/agent/tool`) — the extension is an accelerator, not a dependency.
<!-- hypernexus:end -->
