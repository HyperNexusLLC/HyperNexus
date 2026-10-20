# HANDOFF — OpenCode Extension Max Surface + Full Verification (v1.0.17)

## Status: COMPLETE & VERIFIED (2026-10-19/20, four sessions)
Branch: feat/mimo-plugin-max-surface. Kernel: bin/hypernexus.exe **v1.0.17** (memory-store hardening included). Plugin manifest **1.0.17**.

## Session 4 (v1.0.17) — full stdio↔router parity + memory-store hardening
### COMPLETE TEST MATRIX: 293/293 ALL GREEN (7 batteries)
1. OpenCode plugin: **120/120**  2. OpenCode E2E (real service): **11/11**  3. MCP tools: **23/23**
4. MCP sweep (incl. parity assertions): **54/54**  5. Core without extension: **18/18**
6. MiMo extension: **51/51**  7. MiMo TUI: **16/16**

### Session-4 changes
- **Stdio↔router parity COMPLETE**: `go/internal/tools/console_parity.go` ports 10 stdio-only tools (billing_status, system_status, list_accessory_tools, update_supervisor_settings, click_chat_button, click_action_buttons, set_chat_input, submit_chat_input, simulate_input, advance_chat). All 58 advertised MCP tools work through BOTH surfaces; sweep asserts parity
- **`click_chat_button` was advertised-but-unimplemented on stdio** (no dispatch case → "Unknown tool") — now a real UIAutomation Invoke on both surfaces
- **MEMORY STORE CORRUPTION FIXED** (root cause of intermittent 503 storms across ALL harnesses): `memories.json` was written non-atomically; torn reads returned `invalid character '"' after top-level value` and 503'd the whole memory subsystem. Fixes: atomic temp+rename writes + in-process RMW mutex + self-healing salvage loader (merges balanced JSON docs on parse failure). Repaired live store: 1872 records, zero loss (backup: `.hypernexus/agent_memory/memories.json.corrupt.bak`)
- **Write-storm optimization**: compact JSON (no indent) + plugin audit flush now batches N events into ONE observation write (cadence 4s). Each memories.json mutation rewrites the whole file — write amplification was melting the 2-core box
- `get_supervisor_settings` router version now file-backed (was hardcoded map, drifted from stdio)
- **MCP stale-connection recovery**: after killing hypernexus processes (kernel swaps) OpenCode holds a stale "exited 255" MCP state; `opencode service restart` clears it (config touch does NOT). The stdio server itself was healthy all along

### Ops notes (2-core box at 100% CPU from sibling autopilot agents)
- `jules-autopilot` was burning 30k+ CPU-seconds; expect load-induced latency in ALL tests. Budgets hardened: memory_relate → slow-write budget, e2e poll 10s, sweep call timeout 40s
- Kernel startup under full load takes 10-40s before binding 7778 — don't declare it dead early
- **Swap trap (bit me twice)**: if `Copy-Item` fails on a locked exe, do NOT `Remove-Item` the staged `hypernexus-new.exe` afterwards — the rebuild costs minutes. Order: kill all `hypernexus` processes → verify gone → copy → start

## Session 3 (v1.0.16) — knowledge-graph writes + REAL e2e + concurrency fixes
### COMPLETE TEST MATRIX: 285/285 ALL GREEN (7 batteries)
1. OpenCode plugin battery: **120/120**  2. OpenCode E2E (real service, no model): **11/11**
3. MCP tools: **23/23**  4. MCP sweep (all tools + stdio): **46/46**  5. Core without extension: **18/18**
6. MiMo extension: **51/51**  7. MiMo TUI: **16/16**

### Session-3 changes
- `hypernexus_memory_relate` — knowledge-graph edges via `/api/memory/relations/add`
- `bin/test-opencode-e2e.mjs` — REAL end-to-end: `GET /api/plugin?location[directory]` load-state proof, live `POST /api/session/{id}/command` (body is `{name, text}`!), synthetic persistence (poll for async lag), command→kernel fact persistence
- FIXED: `memory_store` id was always null (kernel wraps record at `data.memory.id`) — ids now surface in search output `[id] content [tags]`
- FIXED (multi-agent): shared `bin/test-extensions.mjs` asserted exact mimo tool count (20) and broke when a concurrent mimocode agent grew it to 22 — now floor + required-names
- OPTIMIZED: auto-store dedupe (content hash), audit flush parallelized
- **API gotchas learned**: `opencode` CLI is an npm .ps1 shim — Node must spawn `cmd.exe /c opencode api ...`; `GET /api/plugin` is location-scoped (default `C:\Users\hyper`!) and takes `?location[directory]` deepObject; command endpoint wants `{name, text}` not `{command, arguments}`
- **Multi-agent live**: mimocode agent landed 6 commits concurrently (54d5b3d23..6209f45bb: mimo 22 tools + endpoint repairs); work stacked cleanly, shared batteries made additive-resilient

## Session 2 (v1.0.15) — lifecycle + graph capture + hot-path optimization
### COMPLETE TEST MATRIX: 269/269 ALL GREEN
1. OpenCode plugin battery: **115/115** (was 109; +memory lifecycle +file-observation kernel round-trip)
2. MCP tools battery: **23/23** · 3. MCP sweep: **46/46** · 4. Core without extension: **18/18**
5. MiMo extension battery: **51/51** · 6. MiMo TUI battery: **16/16**

### Session-2 changes
- `hypernexus_memory_delete` (id delete + tag fan-out) — full memory lifecycle
- `/hn-restore` — handoff pickup (completes HANDOFF workflow)
- Structured `file-change:*`/`file-read:*` observations with filesModified/filesRead → kernel knowledge graph
- Assistant-turn advertiser feed (throttled per role)
- FIXED: `/hn-purge` sent `{tag}` but `/api/agent-memory/delete` reads `{id}` (was inert); context-hook assistant feed used undefined `sessionID`
- OPTIMIZED: hot-path context injection parallelized (FTS harvest ∥ suggestion fetch); negative caching skips all network attempts while kernel known-down
- Live-verified in real OpenCode session: hooks fire (audit trail `src=opencode-plugin`), hot-reload picked up new tool mid-session (84→85 tools in merged namespace)

## Session 1 (v1.0.14) — full V2 plugin + kernel router parity
### COMPLETE TEST MATRIX (session 1): 196/196 ALL GREEN
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
