# HyperNexus → Jcode Integration

Fully featured HyperNexus integration for the **Jcode** harness: MCP server registration,
skills, prompt overlay, preferred-tool routing, swarm persistence guidance, and a test
battery. Core functionality works **with and without** this extension — everything the
extension touches is also available over plain HTTP on the kernel (port 7778).

## What you get

| Surface | Where | Purpose |
|---|---|---|
| **MCP server `hypernexus`** | `.jcode/mcp.json` (project) or `~/.jcode/mcp.json` (global) | 58 tools: L2 memory (add/search/delete/stats), L1 scratchpad, knowledge-graph relation extraction, MCP discovery + call routing, code search, kernel health/billing |
| **4 skills** | `.jcode/skills/` | `hypernexus` (tool map + discipline), `hypernexus-ops` (verify loop + degradation), `hypernexus-workflows` (MEM-FIRST / DISCOVER / HARVEST / HANDOFF / OPS), `hypernexus-sessions` (continuity + agent dispatch) |
| **13 slash-commands** | `.jcode/skills/hn-*/` (from `addons/jcode/commands/`) | `/hn-status` `/hn-store` `/hn-remember` `/hn-search` `/hn-tools` `/hn-session` `/hn-context` `/hn-plan` `/hn-summary` `/hn-restore` `/hn-purge` `/hn-auth` `/hn-models` (jcode exposes every skill as a `/command`) |
| **Lifecycle hooks** | `.jcode/hooks/` + `[hooks]` block in `~/.jcode/config.toml` | `hn-observe.mjs` (session_start/end, turn_start/end, post_tool observers → kernel facts + observations), `hn-pre-tool.mjs` (RBAC gate: audit/ask/deny), `hn-post-feedback.mjs` (hyphen-token trap note), `hn-pre-transform.mjs` (hyphen-query repair) — all 8 hook events covered |
| **Prompt overlay** | `.jcode/prompt-overlay.md` | RECALL → DISCOVER → EXECUTE → PERSIST → VERIFY discipline + memory tiers |
| **Preferred tools** | `.jcode/preferred-tools.md` | Routes memory/discovery/ops intents to `mcp__hypernexus__*` without displacing Jcode-native tools |
| **Swarm prompt block** | `~/.jcode/swarm-prompt.md` (global install) | Workers persist findings to L2 (append-only, safe to retry) |

## Install

```bash
node addons/jcode/install.mjs             # project scope → .jcode/
node addons/jcode/install.mjs --global    # global scope → ~/.jcode/ (+ swarm prompt)
node addons/jcode/install.mjs --check     # verify (exit 1 on gaps)
node addons/jcode/install.mjs --uninstall # remove managed blocks/files
node addons/jcode/install.mjs --target <dir>  # override install root (used by the test battery)
```

Then restart the Jcode session (or run the `mcp` tool with `{"action":"reload"}`) so the
`hypernexus` MCP server connects. In a session, ask: "load the hypernexus skill".

## MCP server config

`mcp.json` follows Jcode's schema (`mcpServers` map; stdio entries carry
`command`/`args`/`env`):

```json
{
  "mcpServers": {
    "hypernexus": {
      "command": "C:\\...\\HyperNexus\\bin\\hypernexus.exe",
      "args": ["mcp"],
      "env": {
        "HYPERNEXUS_WORKSPACE_ROOT": "C:\\...\\HyperNexus",
        "HYPERNEXUS_URL": "http://127.0.0.1:7778"
      }
    }
  }
}
```

Notes:

- `.jcode/mcp.json` and `~/.jcode/mcp.json` are the canonical locations. A project
  `.mcp.json` or `.claude/mcp.json` with the same `mcpServers` shape also works for
  compatibility.
- The stdio server auto-spawns the kernel (`hypernexus.exe serve`) if none is running and
  resolves the kernel port from the lockfile, so `HYPERNEXUS_URL` is only an override.
- Remote (HTTP/SSE) transports can be added alongside via Jcode's `mcp` manager tool
  (`url`, `transport`, `headers`).

## Tool map (58 tools, `mcp__hypernexus__*`)

- **Memory**: `add_memory`, `search_memory` (tag/category filters, `include_cold` → L3),
  `delete_memory`, `memory_stats`, `memory_scratchpad_get/set/append`,
  `memory_extract_relations`, `memory_extract_relations_batch`
- **Discovery/routing**: `mcp_list_servers`, `mcp_list_tools`, `mcp_status`,
  `mcp_server_test`, `mcp_call_tool` (`serverName`, `toolName`, `arguments`)
- **Code**: `codebase_search`, `codebase_outline`, `repomap`, `search`, `grep`, `find`,
  `ls`, `read`, `write`, `edit`, `apply_search_replace`
- **Ops**: `system_status`, `get_system_stats`, `billing_status`, `list_processes`
- **Probes**: `hello_world`, `echo`
- Plus chat-surface/UI-automation and accessory tools (Windows-only surfaces degrade
  gracefully on other hosts).

## Without the extension (core)

Everything is reachable over plain HTTP — no extension required:

```bash
curl -s http://127.0.0.1:7778/health
curl -s "http://127.0.0.1:7778/api/memory/search?query=<term>&limit=<n>"
curl -X POST http://127.0.0.1:7778/api/memory/facts/add -H 'Content-Type: application/json' \
  -d '{"title":"...","content":"...","tags":["..."],"namespace":"project"}'
curl -s http://127.0.0.1:7778/api/mcp/tools
curl -X POST http://127.0.0.1:7778/api/agent/tool -H 'Content-Type: application/json' \
  -d '{"name":"<tool>","args":{}}'
```

`bin/test-core-noext.mjs` asserts this surface stays green with no extension installed.

## Lifecycle hooks

`node addons/jcode/install.mjs` copies 4 hook scripts into `.jcode/hooks/`
(or `~/.jcode/hooks/` with `--global`) and prints the exact `[hooks]` block to
merge into `~/.jcode/config.toml`. The installer never edits `config.toml`
itself. All 8 jcode hook events are covered:

- `hn-observe.mjs` — observer for `session_start` / `session_end` /
  `turn_start` / `turn_end` / `post_tool`. Session boundaries log to
  `POST /api/memory/facts/add` (tags arrays like
  `["jcode","session","session-start"]`) **and**
  `POST /api/memory/observations/record`; turn ends log compact facts with
  full provider token accounting when reported; `post_tool` logs failures +
  touched-path observations (`JCODE_HOOK_TOUCHED_PATHS`). Always exits 0.
- `hn-pre-tool.mjs` — `pre_tool` gate with `HYPERNEXUS_RBAC` policy:
  `audit` (default, allow + audit-mirror), `ask` (allow + flag sensitive for
  review), `deny` (block destructive shell + sensitive-path writes, exit 2).
  Fail-open on any internal error. Audit mirror is detached (no hot-path I/O).
- `hn-post-feedback.mjs` — `post_tool_feedback`: silent except the known
  hyphenated-token search trap (one-line retry hint, no recall fetch).
- `hn-pre-transform.mjs` — `pre_tool_transform`: rewrites single-hyphenated
  `search_memory` queries to spaced form (`foo-bar` → `foo bar`) so the call
  succeeds; everything else passes through byte-identical.

Validate without secrets:

```powershell
$env:JCODE_HOOK_EVENT = 'session_start'; $env:JCODE_HOOK_SESSION_ID = 'smoke'
node addons/jcode/hooks/hn-observe.mjs   # exit 0 + {"continue":true}
'{"command":"t"}' | node addons/jcode/hooks/hn-pre-tool.mjs  # needs stdin JSON
```

## Meta model (muse-spark-1.3-contributor)

Two routes, native first. Neither stores a secret. jcode ships a built-in
`meta-muse` provider (Model API key path, reads `META_MUSE_API_KEY`),
distinct from the `muse-subscription` native route — `jcode auth status`
confirms both.

**Route 1 (primary — native jcode OAuth):**

```powershell
$env:JCODE_EXPERIMENTAL_MUSE_SUBSCRIPTION = '1'
jcode login --provider muse-subscription     # one-time device flow, jcode-owned ~/.jcode/muse_subscription.json
.\addons\jcode\use-meta-model.ps1 "hello"   # runs on the native subscription
```

**Route 2 (bridge — pi OAuth session, per-shell mint into the BUILT-IN provider):**

```powershell
.\addons\jcode\use-meta-model.ps1 -Bridge "hello"   # mints via addons/jcode/bin/meta-muse-key.mjs, exports META_MUSE_API_KEY shell-local ~24h, runs jcode run -p meta-muse -m muse-spark-1.3-contributor
```

Verified live this session: `BRIDGE-OK` one-shot inference turn on
`meta-muse/muse-spark-1.3-contributor` (exact reply + token report). No custom
`[providers.meta]` profile needed — `meta-model.jcode.toml` is a
legacy/optional snippet only.
`/hn-auth` reports all three readiness lines (native credential, bridge mint,
provider wiring) and `/hn-models` lists the live catalog. A passing turn is
never claimed as billing proof.

## Degradation contract

- Kernel calls are budgeted and never throw; a dead kernel degrades to short notes.
- The stdio server merges the live kernel inventory with its static core list, serves the
  last-good inventory when the kernel is slow (15s TTL cache + retry), and handles
  requests concurrently so one slow tool call never blocks `tools/list`.
- Stale MCP connections after kernel swaps recover via the `mcp` tool with
  `{"action":"reload"}`.

## Testing

```bash
node bin/test-jcode-ext.mjs     # Jcode extension battery (config, surfaces, stdio MCP)
node bin/test-mcp-tools.mjs     # MCP router tools
node bin/test-mcp-sweep.mjs     # every MCP tool invoked + stdio transport + parity
node bin/test-core-noext.mjs    # kernel endpoints without any extension
```

## Meta model: two routes (both live)
- `meta-muse` (default): built-in provider, key from `META_MUSE_API_KEY` env + `~/.config/jcode/meta-muse.env`. Verified: `jcode -p meta-muse run '...'` (JCODE-META-OK).
- `meta-kernel` profile: `jcode provider add meta-kernel --base-url http://127.0.0.1:7778/v1 --model muse-spark-1.3-contributor`, then `jcode --provider-profile meta-kernel ...` (JCODE-KERNEL-OK). Immune to pi's 24h token rotation (kernel re-reads pi auth.json per request). NOTE: `auth-test` for this profile reports FAIL on model discovery (probe goes direct-to-Meta per its model catalog); `run` works — that FAIL is a probe quirk, not a functional failure.
