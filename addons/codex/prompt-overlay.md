## HyperNexus Discipline (Freebuff prompt overlay)

Every turn in this workspace runs memory-first through the HyperNexus kernel
(`http://127.0.0.1:7778`; MCP server `hypernexus`, 58 tools via stdio):

```
RECALL -> DISCOVER (if gap) -> EXECUTE -> PERSIST -> VERIFY
```

- **RECALL** — before re-deriving anything: FTS fast path
  (`/api/memory/fts-search?q=<topic>&limit=8`, ~15ms) for hot loops, semantic
  `search_memory` for depth. Include scratchpad `goal`.
- **DISCOVER** — on capability gaps: `mcp_list_servers` → `mcp_list_tools` →
  semantic `/api/mcp/tools/search`, then route with `mcp_call_tool`. Persist what
  worked (`add_memory`, tags `tool-routing`).
- **PERSIST** — non-obvious outcomes immediately: `add_memory`
  (tags `topic,kind`) + `memory_extract_relations` for entities/relations.
- **VERIFY** — around production changes: `system_status` + `billing_status`
  before and after; never present mock state when the kernel is down.

### Tool map (MCP `hypernexus` server)

| Need | Tool |
|---|---|
| fast recall | `memory_scratchpad_get/set/append`, FTS search endpoint |
| durable recall | `search_memory`, `add_memory`, `delete_memory`, `memory_stats` |
| graph | `memory_extract_relations`, `memory_extract_relations_batch` |
| discovery/routing | `mcp_list_servers`, `mcp_list_tools`, `mcp_call_tool`, `mcp_status`, `mcp_server_test` |
| code | `codebase_search`, `codebase_outline`, `repomap` |
| ops | `system_status`, `billing_status`, `get_system_stats`, `list_processes` |
| files/shell | `bash`, `read`, `write`, `edit`, `find`, `grep`, `ls` |
| misc | `code_interpreter`, `apply_search_replace`, `add_bookmark`, `jira_create_issue`, `confluence_search`, `cloud_troubleshoot`, `generate_devops_pipeline`, `install_mcp_server`, `launch_webview`, `download_llamafile`, `echo`, `hello_world` |

### Skills & command-skills

Skills (`/skill:<name>`): `hypernexus` (recall/store/discover), `hypernexus-ops`
(health/billing/runbook), `hypernexus-workflows` (MEM-FIRST / DISCOVER / GRAPH /
HANDOFF / OPS / HARVEST).
Command-skills: `/skill:hn-status` `/skill:hn-search` `/skill:hn-store`
`/skill:hn-session` `/skill:hn-context` `/skill:hn-summary` `/skill:hn-tools`
`/skill:hn-purge`.

### Meta model

`/model` already lists **Muse Spark 1.3** (paid-plan locked without a plan).
For the subscription/OAuth path, see `addons/freebuff/meta-model.freebuff.md`:
mint live with `node addons/freebuff/bin/meta-muse-key.mjs --check`.
