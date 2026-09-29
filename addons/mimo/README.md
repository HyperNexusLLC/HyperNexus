# HyperNexus MiMo Addons

Full-featured HyperNexus integration for **MiMoCode CLI** and **MiMo Desktop**.

## Contents

| Component | Target | Files |
|---|---|---|
| Skill | MiMoCode + MiMo Desktop + Agents | `skills/hypernexus/` (SKILL.md + locales) |
| Desktop tools (16) | MiMo Desktop `engine-config/tools/` | `tools/dist/*.js` |
| Commands (6) | MiMoCode `commands/` | `mimocode/commands/*.md` |
| Hooks | MiMoCode `hooks/` | `mimocode/hooks/config.json` |
| Agent | MiMoCode `agents/` | `mimocode/agents/hypernexus-orchestrator.md` |
| MCP config | MiMoCode `mimocode.jsonc` | merged at install time |

## Desktop Tools

`hypernexus_search_memory`, `hypernexus_memory_vector_search`, `hypernexus_memory_list`,
`hypernexus_add_fact`, `hypernexus_record_observation`, `hypernexus_knowledge_graph`,
`hypernexus_context_harvest`, `hypernexus_session_search`, `hypernexus_session_context`,
`hypernexus_mcp_search`, `hypernexus_tool_discover`, `hypernexus_mcp_call`,
`hypernexus_code_search`, `hypernexus_repomap`, `hypernexus_system_status`,
`hypernexus_billing_status`

## MiMoCode Commands

`/hn-store`, `/hn-search`, `/hn-status`, `/hn-tools`, `/hn-session`, `/hn-remember`

## Build & Install

```bash
node addons/mimo/generate.mjs    # regenerate sources (optional)
node addons/mimo/build-tools.mjs # bundle tools with zod (esbuild)
node addons/mimo/install.js      # install to MiMoCode + MiMo Desktop + Agents
```

## Requirements

- HyperNexus binary (`hypernexus.exe mcp`) — kernel on port 7778
- Node 20+
- zod (resolved from `~/.config/mimocode/node_modules/zod` or HyperNexus root)
- esbuild (resolved from HyperNexus root)
