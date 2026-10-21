# HANDOFF — Jcode Harness Integration + MCP Stdio Resilience (v1.0.19)

## Session 6 (v1.0.19) — Jcode extension + "fix mcp in jcode" + stdio resilience

### DELIVERED
1. **`addons/jcode/` — full Jcode harness integration** (the deliverable)
   - `install.mjs` — project/global/check/uninstall modes; managed-block markers (`<!-- hypernexus:begin/end -->`); merges `mcpServers.hypernexus` without clobbering other servers
   - MCP config at `.jcode/mcp.json` AND `~/.jcode/mcp.json` (`mcpServers` stdio schema: command/args/env) — Jcode's MCP manager picks these up via `mcp` reload
   - 3 skills → `.jcode/skills/` (hypernexus, hypernexus-ops, hypernexus-workflows) — tool map uses real Jcode tool names (`mcp__hypernexus__*`), Jcode-native synergies (panel/schedule/memory complementarity)
   - `prompt-overlay.md` (RECALL→DISCOVER→EXECUTE→PERSIST→VERIFY + memory tiers + degradation contract), `preferred-tools.md` (routing without displacing native tools), `swarm-prompt-block.md` (worker persistence discipline)
   - `bin/test-jcode-ext.mjs` — 43-check battery (config, installer idempotence, skills byte-identity, managed blocks, stdio via the *configured* command, memory round-trips, concurrency, parity)
   - Shared manifest: `jcode` harness entry + capability `harness.jcode` bindings
2. **"Fix MCP in jcode" root cause found and fixed in the kernel** (`go/cmd/tormentnexus/mcp_server.go`)
   - `getMergedTools()` had a hard 3s upstream timeout + NO cache: under load `/api/mcp/tools` exceeds 3s and every client saw only the 49-tool static fallback (memory/search tools missing). Now: 8s fetch + 1 retry + 15s-TTL last-good cache (stale cache > degraded list)
   - Stdio dispatch was serial: one slow tools/call (60s budget) blocked tools/list and other calls. Now concurrent (bounded sem 16, write mutex, id correlation)
   - **Schema shadowing (follow-up)**: local-first name collision made stdio advertise EMPTY input schemas for 10 arg-taking tools (code_interpreter, jira_create_issue, add_bookmark, cloud_troubleshoot, confluence_search, install_mcp_server, launch_webview, download_llamafile, generate_devops_pipeline, apply_search_replace) — models literally could not construct arguments. Now the strictly richer upstream (registry) schema/description wins on collision. Plus catalog fix: `code_interpreter` was documented as "JavaScript" but takes `language`+`code` (handler runs shell langs) — corrected in `go/internal/tools/tool_schemas.go`. Regression checks: test-jcode-ext.mjs T9b schema parity (stdio ⊇ registry props) + code_interpreter code+language
   - **SQLITE_BUSY under load (round 5)**: `db.Exec("PRAGMA busy_timeout")` only covered the FIRST pooled connection — on recycle, new connections ran busy_timeout=0 and concurrent writes 500'd ("memorystore commit insert: database is locked", "scratchpad set failed"). Fixed: `_pragma=busy_timeout(10000)` etc. embedded in the DSN (every connection inherits) + 3-attempt busy-retry on Commit/scratchpad writes. Also: mcp_list_servers harness entries relabeled `installed`/`kind:harness` (were `available`, contradicting mcp_server_test "not configured"); battery T11 (scratchpad lifecycle, tag filter, relations) + T12 (skills tool refs all live) + load-hardened budgets (90s RPC, local-builtin quick call in T10 head-of-line check) — 51 checks
3. **Jcode-side MCP registration live**: `mcp reload` → Connected 1/1, 58 tools under `mcp__hypernexus__*`; hello_world/search_memory round-trip through Jcode's own MCP manager
4. **Rounds 6-8 follow-ups**: gossip hang on /api/memory/add (fire-and-forget + 5s bound) · stale L1 cache after delete_memory (VectorStore.DeleteMemory evicts cache + rows) · search_memory empty query returned 0 instead of recent (ListVault path) · live degradation contract proven in Jcode (kernel killed mid-session: structured -32000 errors, local builtins alive, static inventory fallback, clean recovery) · installer preserves foreign MCP servers through install/uninstall · DeleteMemory + empty-query unit tests added

### MULTI-AGENT OPS NOTE (round 8)
- The kernel is a shared resource: a sibling agent (pi) builds/versions it too (binary reported v1.0.20 via ldflags while the tree says 1.0.19) and `scripts/kernel-watchdog.ps1` (powershell, 30s health checks) restarts it when down. A mid-matrix kernel death with no panic trace = a sibling binary swap — NOT your regression. Re-check health + re-run the failed batteries; the extension layers degrade gracefully during the gap (mimo plugin tools return proper error notes — free degradation validation).

### VERIFIED matrix (all on the swapped 1.0.19 kernel)
- Jcode ext battery **43/43** · MCP tools **23/23** · MCP sweep **54 invoked = 53 pass + 1 load-soft, 0 fail, 10 documented skips** · core-noext **18/18** · mimo **51/51** · mimo TUI **16/16** · OpenCode plugin **120/120**

### Gotchas learned (Jcode + memory semantics)
- Jcode MCP config locations: `~/.jcode/mcp.json` or project `.jcode/mcp.json` (`mcpServers` map; `.mcp.json`/`.claude/mcp.json` also read). Reload via the `mcp` tool — config touch alone doesn't reconnect stale stdio state
- `search_memory` keyword matching needs **natural-language tokens**: a hyphenated single token (`jcode-ext-probe-123`) finds nothing even right after write; phrase queries work. Battery probes use word probes + poll
- Memory delete propagates **asynchronously** across stores — assert "gone" with a ~6s poll, not an immediate re-check
- `add_memory` writes vectorstore ids (`mem-general-*`); resolve ids for deletion via `GET /api/memory/search` (MCP search output has no ids)
- Kernel binary swap trap again: `if errorlevel 1 (echo A) else (echo B) & copy ...` swallows the trailing `&` commands in cmd.exe — run copies as standalone statements
- Version bump: `go/internal/buildinfo/buildinfo.go` + `/VERSION` + `node scripts/sync-versions.mjs` (34 packages)

---

# HANDOFF — OpenCode Extension Max Surface + Full Verification (v1.0.19)

## Status: COMPLETE & VERIFIED (2026-10-19/20, six sessions)
Branch: feat/mimo-plugin-max-surface. Kernel: bin/hypernexus.exe **v1.0.19**.

## Session 6 (v1.0.19) — panic containment + self-diagnosing crashes
### VERIFIED: Go suites green + 293 battery assertions + empty crash log under load
- `recoverMiddleware` outermost in the HTTP chain — handler panics return 500 + stack in log instead of killing the process (Go net/http does NOT recover panics; one buggy route = dead control plane). 3 tests incl. chain-wiring
- **`debug.SetCrashOutput`** → `.hypernexus/kernel-crash.log` at startup: unrecoverable fatals (map races, OOM) now captured regardless of spawning parent. Empty log through full battery load = kernel stability confirmed
- README troubleshooting table (MCP stale-state → `opencode service restart`; slow boot 10–40s; binary-swap + BOM traps)
- **Ops notes**: Go's default `go test` 10m timeout trips under load — use `-timeout 25m` for httpapi; `where.exe gcc` absent so `-race` unavailable (cgo) — the SetCrashOutput hook is the crash-attribution strategy

## Session 5 (v1.0.18) — kernel-killing race + bridge payloads + schema authority
### VERIFIED: full Go suites + 293 battery assertions
- **Go suites ALL GREEN (first time)**: `internal/httpapi` (full, 92s), `internal/tools`, `internal/memorystore`, `internal/repograph` — includes 6 new regression tests
- Batteries: plugin 120 · E2E 11 · MCP tools 23 · MCP sweep 54 · core-noext 18 · mimo 51 · mimo TUI 16

### Session-5 headline fixes
1. **THE RECURRING KERNEL-DEATH MYSTERY SOLVED**: `repograph.Build` published the Nodes map after pass 1 while pass 2 kept writing it → readers (`SearchSymbols` etc.) hit `fatal error: concurrent map iteration and map write` — an UNRECOVERABLE runtime fatal (not a panic — recover() can't help). Triggered whenever code-search overlapped a graph build (sweeps, parallel battery runs). Fixed: single atomic publish at end of Build; resolvers thread the in-build `*Graph` instead of reading `rgs.graph`. Regression test `graph_race_test.go`. NOTE: `-race` needs cgo (unavailable here) — the fatal reproduces without it anyway
2. **Bridge payloads discarded**: 32 handlers did `callUpstreamJSON(..., new(any))` and dropped the decoded result — every upstream-bridged route returned `{success:true, bridge}` with NO `data`. Mechanical fix (var + `&var` + `"data"` in response) across 5 files. Root cause found via `TestAutonomyBridgeRoutes` expecting `"high"` from the stub
3. **Schema authority**: MCP inventory cache entries shadowed Go schemas (first-wins merge); `mergeAccessoryTools` now lets `tools.NativeToolMeta` override schema/description in a final pass + 22 catalog entries added. Only genuinely no-arg tools show empty schemas now
4. **`lightweightSymbolSearch` unbounded walk** (codebase-search fallback): no growing skip list, no cap, no ctx → 90s hangs. Now skipDirs + 2000-file cap + ctx-aware
5. Stale workflow test (built-in workflows seed the engine — `builtins.go`) updated; sweep readiness gate added (kernel boot is 15s+ on saturated boxes)

### Multi-agent ops (2-core box at 100% CPU)
- `jules-autopilot` + `Tabby` + the pi-agent's own kernel test loops run concurrently — expect load-induced timeouts; budgets: sweep 90s/call + readiness gate, e2e 10s poll
- The kernel gets restarted by sibling agents and a watchdog mid-run — always re-check health before trusting battery results
- **Go trap**: Set-Content -Encoding utf8 writes BOM — auto-strip after any PS string edit (script now checks bytes 239,187,191)

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
