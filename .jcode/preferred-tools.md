<!-- hypernexus:begin (managed by addons/jcode/install.mjs — do not edit inside this block) -->
## Preferred tool routing (HyperNexus)

Prefer these tool choices when both a native tool and a `mcp__hypernexus__*` tool fit:

- Cross-session / durable memory → `mcp__hypernexus__add_memory`, `mcp__hypernexus__search_memory`
  (Jcode's native `memory` remains preferred for harness-local notes; keep durable facts in both).
- Short-lived working state → `mcp__hypernexus__memory_scratchpad_get/set/append`.
- Finding a tool you don't have → `mcp__hypernexus__mcp_list_tools` then
  `mcp__hypernexus__mcp_call_tool` (routes into the assimilated 26k+ tool catalog).
- Kernel/ops questions → `mcp__hypernexus__system_status`, `mcp__hypernexus__billing_status`,
  `mcp__hypernexus__memory_stats`.
- Connectivity probe when MCP behaves oddly → `mcp__hypernexus__hello_world`.

Keep using Jcode-native tools for their own domains (browser, calendar, gmail, panels,
scheduling, swarm, git, web search). HyperNexus tools extend the plane; they never replace
native tools. If both a native tool and a HyperNexus tool can do the job, prefer the native
tool and use HyperNexus for persistence and cross-session recall.
<!-- hypernexus:end -->
