## HyperNexus Discipline (Open Interpreter prompt overlay)

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

### Skills, agents & command-skills

Skills (`/skill:<name>`): `hypernexus` (recall/store/discover), `hypernexus-ops`
(health/billing/runbook), `hypernexus-workflows` (MEM-FIRST / DISCOVER / GRAPH /
HANDOFF / OPS / HARVEST).
Agents: `/skill:hypernexus-orchestrator` (multi-step RECALL→VERIFY loop),
`/skill:hypernexus-researcher` (read-only context harvest + code map).
Command-skills: `/skill:hn-status` `/skill:hn-search` `/skill:hn-store`
`/skill:hn-session` `/skill:hn-context` `/skill:hn-summary` `/skill:hn-tools`
`/skill:hn-purge` `/skill:hn-plan` `/skill:hn-remember` `/skill:hn-restore`.

### Meta model (subscription/OAuth)

Open Interpreter targets **Muse Spark 1.3** via its OpenAI-compatible model
config (`~/.openinterpreter/config.toml`: `model =
"muse-spark-1.3-contributor"`, `api_base = "https://api.meta.ai/v1"`).
The subscription path mints a Model API key live from pi OAuth
(`node addons/open-interpreter/bin/meta-muse-key.mjs`, pi owns refresh) into
`META_MUSE_API_KEY` (the `use-meta-model.ps1` launcher also mirrors it into
`OPENAI_API_KEY` + `OPENAI_BASE_URL` for this run only). Key never stored.
Full wiring: `addons/open-interpreter/meta-model.open-interpreter.md`
(`--check` to verify).
