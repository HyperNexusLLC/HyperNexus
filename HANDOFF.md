# HANDOFF — OpenCode Extension Max Surface + Full Verification (v1.0.14)

## Status: COMPLETE & VERIFIED (2026-10-19)
Branch: clean-main worktree (commit below). Kernel: bin/hypernexus.exe **v1.0.14** (rebuilt this session).

## COMPLETE TEST MATRIX: 196/196 ALL GREEN
1. OpenCode plugin battery (`bin/test-opencode-ext.mjs`): **109/109** — registration surface, 28 tools live-kernel, 10 commands, 3 skills, MCP registration, worktree strategy, every hook, V1 shim, kernel-down degradation contract
2. MCP tools battery (`bin/test-mcp-tools.mjs`): **23/23**
3. MCP sweep (`bin/test-mcp-sweep.mjs`): **46/46** — every registry tool invoked with schema-derived safe args + stdio transport (initialize / tools/list=58 / tools/call). 6 destructive/external tools documented-skipped
4. Core WITHOUT extension (`bin/test-core-noext.mjs`): **18/18**

## What was delivered
### 1. OpenCode V2 plugin — `addons/opencode/` (THE deliverable)
- `plugin/hypernexus/index.js` — V2 `setup(ctx)` + V1 `server()` shim in one package
- 28 tools (namespace `hypernexus`): memory store/search/fts/vector/list, scratchpad, context_harvest, record_observation, tool_search/tool_discover/suggest_tools, mcp_status/servers/tools/search/call, session_search/context/handoff, skill_search/manage, code_search, knowledge_graph, billing_status, audit_log, subagent
- 10 commands: /hn-status /hn-store /hn-remember /hn-search /hn-tools /hn-session /hn-context /hn-plan /hn-summary /hn-purge (report commands → `session.synthetic`, context commands → `session.prompt`)
- 3 skills (hypernexus, hypernexus-ops, hypernexus-workflows) registered programmatically AND materialized as SKILL.md
- Hooks: session prompt (offset-safe `@memory:key` expansion + suggestion feed + session priming w/ active goal), context (≤400ms FTS status+recall+suggestions block), compaction (preserve pointers), model.request (identity headers), retry (observability), tool execute.before/after (RBAC + audit + auto-store), permission.evaluate (HYPERNEXUS_RBAC=audit|ask|deny), shell create.before (env injection), event stream (turn-end observation)
- MCP: auto-registers `hypernexus mcp` stdio server via `ctx.mcp.transform` (respects existing config; `codemode` option; startup timeout 45s)
- Worktree strategy (HyperNexus-managed, `.hypernexus-worktree.json` linkage)
- `plugin/hypernexus/rpc.js` — shared RPC contract (TOOL/COMMAND/CAPABILITY/KERNEL/BUDGET)
- `install.mjs` — project/global/uninstall/check modes; JSONC-safe config editing; `opencode mcp add` preferred, config-edit fallback
- Installed in-repo at `.opencode/plugins/hypernexus/` + `.opencode/skills/` + `.opencode/agent/hypernexus-orchestrator.md` + `.opencode/opencode.jsonc` (MCP server) — **live in this workspace** (verified via real OpenCode server: 84-tool merged namespace, skill catalog, MCP connect log)

### 2. Kernel router parity (v1.0.13 → v1.0.14)
`go/internal/tools/kernel_bridge.go` + registry entries: `mcp_status`, `mcp_list_servers`, `mcp_list_tools`, `mcp_call_tool`, `mcp_server_test`, `inspect_window_ui` now work through `POST /api/agent/tool` (previously only stdio MCP could serve them; router returned 503 "not implemented in Go"). Registry: 42 → 48 tools. Stdio unaffected (58 tools).

### 3. Multi-harness contract
`addons/shared/hypernexus.manifest.json`: `opencode` harness entry + all 14 capabilities bound to `opencode` tool names (from the rpc.js CAPABILITY map).

## KEY FIXES (must not regress)
1. **Skill.Info schema requires `path`** — omitting it fails the skill transform and OpenCode **disables the whole plugin** ("disabled plugin after transform failure ... state=skill"). Skills are now materialized to disk and registered with `path`.
2. **`options.baseUrl` must reach tool executors** — module-level `RUNTIME_BASE` is set by setup()/server(); tools calling `kernel()` directly honor it. (Battery §9 catches this.)
3. **Kernel endpoint truths** (verified against Go source): `skills/search?q=`, `agent-memory/pickup` POST JSON, no `sessions/imported/search` (use `list` + filter), `cross-session-links` POST JSON body, `relations/graph?id=`, `facts/add` accepts `{content,title,tags,namespace,metadata}`, `observations/record` accepts `{content,type,toolName,title,narrative,facts,concepts,filesRead,filesModified,metadata}`, `/api/agent/tool` body `{name, args}`.
4. **UTF-8 without BOM** for anything Go/Node parses (Windows PowerShell writes BOM by default — use fs.writeFileSync utf8 / [IO.File]::WriteAllBytes).
5. **Test regexes must not match inside payload content** — assert on the router envelope (`r.success !== false && !r.error`), not `/error.*failed/i` over memory text.

## Batteries (run all after any kernel/plugin change)
```bash
node bin/test-opencode-ext.mjs    # 109 — OpenCode plugin (mock ctx, live kernel, dead kernel)
node bin/test-mcp-tools.mjs       # 23 — MCP router tools
node bin/test-mcp-sweep.mjs       # 46 — ALL MCP tools + stdio transport (skips documented)
node bin/test-core-noext.mjs      # 18 — kernel endpoints without any extension
```

## Watch items
- Mid-sweep kernel death observed ONCE during the binary-swap chaos (stale Oct-17 `hypernexus` pid 5900 + dual instances in the mix); identical sweep then passed twice clean. If a kernel dies under tool load again, capture stderr via `Start-Process -RedirectStandardError` and check `bin/serve-*.log`.
- Stale process pid 5900 (started 2026-10-17, path unknown, not listening on 7778) was left running deliberately — confirm whether it is still needed before killing.
- `inspect_window_ui`/chat-automation tools are Windows-only PowerShell UIAutomation; they need a desktop session.
- `hypernexus_mcp_call` router tool passes `{name, args}`; the stdio `mcp_call_tool` wants `{serverName, toolName, arguments}` — both now work.
- OpenCode reloads plugins on `.opencode` changes but a `opencode service restart` is the reliable path after edits.

## Legacy
Retired V1-experimental adapters (invented hook API that V2 ignores) moved to `addons/opencode/legacy/` for reference. Do not reinstall them.
