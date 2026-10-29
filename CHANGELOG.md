# CHANGELOG.md — HyperNexus Version History

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Codewhale HARNESS max-extent integration + native Meta OAuth via kernel proxy (v1.0.22)
- **Codewhale 11-command parity (`addons/codewhale/`)** — added `hn-plan`, `hn-remember`, `hn-restore` (matching the claude-code plugin); bundle now ships 11 `/hn-*` commands, 4 skills (+`hypernexus-orchestrator`), 2 agents (`hypernexus-orchestrator` + read-only `hypernexus-researcher`), 3 by-convention hooks (`hn-session.mjs` bootstrap, `hn-rbac.mjs` RBAC guard, `hn-pre-tool.mjs` pre-tool gate — 8/8 allow+deny probes green). Manifests declare the agents path (`plugin.json`/`plugin.toml`); installer ships agents/hooks/skills/commands to project + global scopes.
- **Meta `muse-spark-1.3-contributor` native in Codewhale** — Codewhale 0.10.2 ships a native `meta` provider route; OAuth login flows through the kernel proxy (`providers.meta.base_url = http://127.0.0.1:7778/v1`, Bearer re-read from pi `auth.json` per request — `codewhale auth external-consent` reports no supported pi credential source, so the proxy is the native path) plus the secret-store fast lane (`scripts/sync-meta-oauth-codewhale.ps1`, verified in-sync). `meta-model.codewhale.md` documents both routes; `use-meta-model.ps1` launches Codewhale on the subscriber model. Live proofs: repeated exact-reply `exec` round-trips on `meta/muse-spark-1.3-contributor` via the proxy.
- **Battery `bin/test-codewhale-ext.mjs` 99/99 green** — fixed T5 managed-block regex (namespaced `:freebuff`/`:codex` blocks no longer miscounted) and T4 command count 8→11; added 4-skill T3 coverage + agents-path/hooks-byte-identity T4 coverage per independent review; full stdio round-trips, parity, memory features, and core-without-extension HTTP all pass; global bundle re-stamped to VERSION.

### Claude Code HARNESS max-extent integration + kernel Anthropic shim Responses migration (v1.0.22)
- **Claude Code native plugin max-extent (`addons/claude-code/`)** — 11 `/hn-*` commands (+hn-plan/hn-remember/hn-restore), 3 skills, 2 agents (orchestrator + read-only researcher), 7 hook events (SessionStart/UserPromptSubmit/PreToolUse-Bash-RBAC-gate/PostToolUse/PreCompact/Stop/SubagentStop) as dependency-free Node scripts, MCP stdio 58/58 via plugin `.mcp.json` + project `.mcp.json` (`mcpServers` in plugin.json), prompt-overlay + preferred-tools + swarm-prompt docs, idempotent installer (project/global/check/uninstall + installed-copy drift check + minter ship check).
- **Meta `muse-spark-1.3-contributor` native in Claude Code** — kernel Anthropic shim reads the pi Meta OAuth identity per request (pi owns refresh, nothing stored); `bin/meta-muse-key.mjs` mints fresh per-run override keys; `use-meta-model.ps1` launches `claude --plugin-dir ... --model muse-spark-1.3-contributor`. Live proof: `CLAUDE_META_OK` (non-stream) + `CLAUDE_PLUGIN_OK` (plugin loaded) exact-reply round-trips.
- **Kernel `go/internal/httpapi/anthropic_compat.go` migrated chat-completions → Responses API** — Meta now rejects `/v1/chat/completions` for subscription keys (`client_attestation_denied`: subscription covers the Responses API only; pi's own Meta provider uses `openai-responses`). Shim now POSTs `https://api.meta.ai/v1/responses` with Responses input items (`function_call_output`/`function_call`/`output_text`), flat function tools, `max_output_tokens` + `store:false`; response parsed from `output[]` items + Responses `usage`. SSE replay + tool-loop pairing preserved. Regression test `anthropic_responses_test.go` (tool-loop translation + flat-tool shape + text extraction).
- **Battery `bin/test-claude-code-ext.mjs` (85 checks hermetic green)** — manifest entry + 31 capability bindings, addon sources, 11-command parity, skills/agents, plugin bundle validity (plugin.json schema incl. mcpServers, .mcp.json, 7-event hooks.json, node --check all scripts), hook safety, installer wiring, meta wiring (minter mirrors droid flow, pi auth shape), no-secrets scan. Live leg: mint OK, /health 1.0.21, /v1/models lists muse-spark, MCP stdio 58 tools + system_status round-trip, hook behavior probes 6/6, installed copy byte-identical (21 files).
- **Shared manifest `claude-code` harness entry** — all 31 capabilities bound to `mcp__hypernexus__*` tool names.
- **PENDING kernel swap**: rebuilt binary with the Responses migration is staged at `bin/hypernexus-new.exe` (content-gated on `v1/responses`) but NOT yet live — the running 1.0.22 kernel is elevated/unkillable from a normal shell and the watchdog respawns it inside the swap window (3 attempts). Next agent: stop the respawner, swap via `bin/swap-kernel.ps1 -Start -Expect "v1/responses"`, re-run the live `claude -p` proof (expect real model text, not 403), then delete the staged exe.

### Maki HARNESS full integration + native Meta OAuth (v1.0.21)
- Meta OAuth native: lua/meta_oauth.lua (device-code flow + pi auth.json mint, auto-refresh on 401/TTL); model meta/muse-spark-1.3-contributor verified headless + tool-call round-trip (system_status -> 1.0.21).
- Full extension (extensions/maki-hypernexus/ + project .maki/ + %APPDATA%/maki): 35 kernel-backed tools, 12 md commands, 7 autocmds, 4 slots (bash guard/@memory recall/secret redact/completion), F7/F8 keymaps, prompt hints, hypernexus stdio MCP, 4 skills.
- Double-load fix: global+project init.lua both require modules; pcall-skip on duplicate provider/slot registration (maki _G is readonly).
- Battery bin/test-maki-ext.mjs: 61/61 green. Manifest maki entry added.


### Added
- **Jcode HARNESS max-extent integration (native Meta OAuth + full HyperNexus surfaces)** — `meta/muse-spark-1.3-contributor` in jcode via TWO routes, native first: Route 1 = native `jcode login --provider muse-subscription` (device flow, jcode-owned `~/.jcode/muse_subscription.json`, `muse-spark-1.3-contributor` as the deliberate contributor variant; no pi needed); Route 2 = pi-OAuth live-mint bridge (`addons/jcode/bin/meta-muse-key.mjs` replays pi's `POST https://api.meta.ai/muse-code/key` mint → shell-local ~24h key, `--check` verified live) into the BUILT-IN `meta-muse` provider (`jcode auth status`: reads `META_MUSE_API_KEY`, runtime + tool validated — no custom `[providers.meta]` profile needed; `meta-model.jcode.toml` kept as legacy/optional snippet; `use-meta-model.ps1` runs `jcode run -p meta-muse -m muse-spark-1.3-contributor`, verified live with exact-reply BRIDGE-OK turn). HyperNexus extension at max jcode surface: 4 skills, **13** `/hn-*` commands (+hn-remember/hn-plan/hn-restore/hn-auth/hn-models), **4** hooks covering all **8** hook events (hn-observe session_start/end + turn_start/end + post_tool w/ token accounting + touched paths; hn-pre-tool RBAC audit/ask/deny w/ detached audit mirror; hn-post-feedback hyphen-trap note; hn-pre-transform hyphen-query repair), MCP stdio 58/58 merged inventory. `bin/test-jcode-ext.mjs` now **110 checks** (T1-T13 + T14 hooks live-exec + T15 13-command sync + T16 Meta auth incl. built-in-provider assertion), green at normal load; under extreme saturation individual upstream calls can exceed the 60s stdio budget (measured stats 58.9s, 0.7s-59s-refused swings) — same calls pass on retry and via direct HTTP, extension code unchanged. Shared manifest `jcode` entry updated (commands/hooks/meta-model surfaces)
- **Droid (Factory HARNESS) full integration (`addons/droid/`)** — Meta `meta/muse-spark-1.3-contributor` runs NATIVELY in Droid via BYOK `apiKeyHelper` (`addons/droid/bin/meta-muse-key.mjs` mints a ~24h Model API key from the pi `~/.pi/agent/auth.json` OAuth identity via `POST https://api.meta.ai/muse-code/key`, mirroring pi-ai's own Meta OAuth flow; static `apiKey` removed from `~/.factory/settings.json`, session default stays `custom:Meta-Muse-Spark-1.3-Contributor-0`). Full HyperNexus plugin v1.2.0 installed + enabled (`hypernexus@marketplace`, user scope): stdio MCP server (58 tools, `droid mcp list` = connected), 3 skills, 11 `/hn-*` commands, 8 lifecycle hooks (SessionStart/UserPromptSubmit/PreToolUse/PostToolUse/Stop/SessionEnd/PreCompact/SubagentStop) as dependency-free Node scripts (no bash on Windows), 2 droids (orchestrator + read-only researcher), 1 output style. RBAC via `HYPERNEXUS_RBAC` (audit/ask/deny) on destructive `Execute` patterns
- **`addons/droid/bin/test-droid-ext.mjs` battery (76 checks, 0 fail)** — plugin layout, hooks.json 8 events, `node --check` all hooks, plugin + user mcp.json, kernel surface (`/health` v1.0.21, fts/vector/list, `agent-memory/stats`, system overview, mcp status, billing, scratchpad get/set, facts/add + search round-trip, observations), mint `--check` OK, custom-model `apiKeyHelper` wiring, session default. Live verification: all 8 hooks executed, RBAC deny/ask, `droid exec --auto high` native-model proof (MCP add_memory + search_memory round-trip, L2-confirmed), CDP coordination to muse.ai delivered
- **Shared manifest `droid` harness entry** — capability map bound to `mcp__hypernexus__*` tool names + apiKeyHelper note
- **`bin/test-hax-ext.mjs` battery (70 checks)** — provider wiring, presets, installer idempotence, skill byte-identity + frontmatter, overlay presence, all 33 driver verbs incl. store→search→update→delete round-trip (via searchable `facts/add` write path), turn scripts, 5 live hax runs on meta/muse-spark-1.3-contributor (preset, flags, effort, overlay-driven tool use), doc accuracy, kernel-down degradation
- **Shared manifest `hax` harness entry** — capability map bound to exact `hn.mjs` verbs

### Fixed
- **Stale endpoint references remapped in hax driver** — `/api/memory/stats` -> `/api/agent-memory/stats`, `/api/routes` -> MCP tool inventory fallback, `/api/code/repomap` -> `repomap` via `/api/agent/tool` (relative dirs resolved client-side to absolute; kernel maps CWD-relative paths against its own root), `/api/memory/update` -> delete + re-store (no in-place route published), `/api/memory/delete` -> `delete_memory` via dispatcher (mirrors pi tn-purge), `/api/memory/handoff` (GET+POST) -> `/api/agent-memory/handoff` (POST, payload key `notes`) + `/api/agent-memory/pickup`. Same staleness exists in the pi extension paths; hax driver uses the true published endpoints
- **Saturated-host hardening in hax driver** — `HN_FAST_MS`/`HN_RETRIES` env overrides (battery: 30s/120s/2 retries), one backoff retry on transport timeouts only (4xx/5xx never retried); repomap maps source extensions only (`.go/.ts/.js/.py/…`) so non-source dirs legitimately return an empty map
- **Memory-write visibility gap** — `/api/memory/add` appends to the gossip mirror only (visible via `list`, invisible to `search`/`fts`); driver `store`/`observe`/`update` now write via searchable `/api/memory/facts/add` (agent-memory store + vector dual-write), so stored items are recallable immediately

## [1.0.21] - 2026-10-21

### Added
- **Codewhale harness integration (`addons/codewhale/`)** — full HyperNexus integration for the Codewhale harness: MCP server registration (`mcpServers` stdio config in `.codewhale/mcp.json` / `~/.codewhale/mcp.json`), Agent Plugins v1.0.0 bundle (`plugin.json` + legacy `plugin.toml`, bundle `mcp.json`, 8 `/hn-*` commands: hn-status/hn-store/hn-search/hn-tools/hn-session/hn-context/hn-summary/hn-purge), 3 skills (bundle + direct mirror), AGENTS.md managed prompt-overlay block (RECALL→DISCOVER→EXECUTE→PERSIST→VERIFY + preferred routing + subagent persistence + degradation contract), and an idempotent installer (`install.mjs`: project/global/check/uninstall; version stamped from `/VERSION` so the bundle cannot drift; uninstall never destroys user-edited skills)
- **`bin/test-codewhale-ext.mjs` battery (85 checks)** — config shape across 4 locations, installer check + idempotence, skills byte-identity (bundle + mirror × project + global), plugin manifest validity (plugin.json/plugin.toml/commands frontmatter), managed-block balance, stdio MCP via the *configured* command (initialize, 58-tool inventory, memory round-trips with async-delete polling, concurrent dispatch, head-of-line regression), stdio↔router parity + schema parity, memory feature coverage (scratchpad lifecycle, tag filter, relation extraction), doc accuracy (skill/command tool refs all live), and core-WITHOUT-extension HTTP surface
- **Shared manifest `codewhale` harness entry** — capability map bound to `mcp__hypernexus__*` tool names

### Fixed
- **Memory writes failed with SQLITE_BUSY under multi-second cross-process lock contention** (`memorystore commit insert: database is locked (5)`) — `execBusyRetry` window was 3 attempts/350ms against 10s+ lock holds. Now 5 attempts with exponential backoff (~3.1s) and DSN `busy_timeout` 10s→20s. Verified: `go test ./internal/memorystore/` green; MCP tools battery add_memory clean under load

### Changed
- `bin/test-core-noext.mjs` memory-search budget 15s→30s (vector+embed search is ~800ms nominal but observed 6-14s under host CPU saturation from unrelated processes)
- `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` §6 rewritten for the current CodeWhale integration (58 tools, config paths, plugin bundle activation flow, verification commands)

---

## [1.0.19] - 2026-10-20

### Added
- **Jcode harness integration (`addons/jcode/`)** — full HyperNexus integration for the Jcode harness: MCP server registration (`.jcode/mcp.json` / `~/.jcode/mcp.json`, `mcpServers` stdio schema), 3 skills (`hypernexus`, `hypernexus-ops`, `hypernexus-workflows`), prompt overlay (RECALL→DISCOVER→EXECUTE→PERSIST→VERIFY), preferred-tool routing block, swarm-prompt persistence block, and an idempotent installer (`install.mjs`: project/global/check/uninstall, managed-block markers)
- **`bin/test-jcode-ext.mjs` battery (43 checks)** — config shape, installer idempotence, skills byte-identity + frontmatter, managed-block balance, stdio MCP via the *configured* command (initialize, full inventory, memory round-trips add→search→delete with async-propagation polling, concurrent dispatch), stdio↔router parity
- **Shared manifest `jcode` harness entry** — capability map bound to `mcp__hypernexus__*` tool names

### Fixed
- **MCP stdio `tools/list` degraded under kernel load** — `getMergedTools()` fetched the upstream inventory with a hard 3s timeout and no cache: whenever the kernel was busy (graph builds, sweeps, sibling agents) the fetch timed out and clients saw only the 49-tool static fallback instead of the full 58-tool merged inventory (core memory/search tools missing). Now: 8s fetch timeout + one retry + 15s-TTL last-good cache (stale cache preferred over degraded listing)
- **MCP stdio serialized dispatch** — one slow `tools/call` (60s upstream budget) blocked every subsequent request behind it (tools/list, other calls); requests now dispatch concurrently (bounded semaphore, serialized writes) with id-based correlation preserved
- **MCP stdio schema shadowing** — local-first name collision advertised EMPTY input schemas for 10 arg-taking tools (`code_interpreter`, `jira_create_issue`, `add_bookmark`, `cloud_troubleshoot`, `confluence_search`, `install_mcp_server`, `launch_webview`, `download_llamafile`, `generate_devops_pipeline`, `apply_search_replace`), so model callers could not construct arguments; the strictly richer registry schema/description now wins on collision. `code_interpreter` catalog entry corrected (was "JavaScript", actually `language`+`code` for shell langs)
- **SQLITE_BUSY memory-write failures under load** — `PRAGMA busy_timeout` was applied via one-shot `db.Exec` to the first pooled connection only; when `database/sql` recycled it, new connections ran with `busy_timeout=0` and concurrent writes failed with `database is locked` (`memorystore commit insert`, `scratchpad set failed`). Now: pragmas embedded in the DSN (`_pragma=busy_timeout(10000)` etc., inherited by every connection) + bounded busy-retry on Commit/scratchpad writes. Verified under 100% CPU: `add_memory` 17ms round-trip
- **`mcp_list_servers` vs `mcp_server_test` contradiction** — installed harnesses were listed with `status: "available"` (reads like probeable MCP connections) while the probe correctly checked connection config. Harness entries now `status: "installed", kind: "harness"` and the probe error explains the distinction
- **`/api/memory/add` hung indefinitely** — the handler awaited P2P gossip propagation (`IncrementClock` + `BroadcastUpdate`) inline; with the gossip transport in a broken state the request never completed (25s+ hangs while the identical write without gossip returned in ~300ms). Gossip propagation is now fire-and-forget with a 5s bound (side effects must never stall the request path)
- **`delete_memory` left stale search results** — the handler deleted SQL rows only, but search serves from the in-memory L1 cache first; deleted records kept resurfacing until LRU eviction. New `VectorStore.DeleteMemory` evicts L1 + rows atomically (with busy-retry); verified gone from search in <1s (was resurfacing 15s+)
- **`search_memory` empty query returned 0** — the schema contract says "empty returns recent" but the FTS path matches nothing for an empty term; empty queries now serve recent vault records via `ListVault` (with tag/category filters and offset/limit honored)

### Verified
- Jcode extension battery **51/51** (schema parity, head-of-line ordering, memory features, doc accuracy) · MCP tools **23/23** · MCP sweep **54 invoked (53 pass + 1 load-induced soft, 0 fail)** · core-noext **18/18** · mimo **51/51** · mimo TUI **16/16** · OpenCode plugin battery re-run green on the swapped kernel
- Live in this session: Jcode MCP manager connects `hypernexus` (58 tools), `hello_world`/`search_memory` round-trip through the harness's own MCP tool manager
- Memory lifecycle quirks documented: `search_memory` keyword matching needs natural-language tokens (hyphenated ids don't tokenize), delete propagation is asynchronous across stores

## [1.0.21] - 2026-10-21

### Fixed
- **Kernel tools lied about external side effects (honesty fix, 2026-10-23)** — `jira_create_issue` claimed "Created issue..." when nothing was created, `confluence_search` returned fabricated documents, `cloud_troubleshoot` presented invented root causes as findings — a model would cite these as real. All simulated outputs now **lead with** `[NOT CREATED — ...]` / `[SIMULATED DEMO OUTPUT — ...]` markers (front-loaded so truncation can't hide them); `generate_devops_pipeline` reclassified as a real template generator (positive assertion, not a stub). New `bin/test-reality.mjs` battery (33 checks) executes the plugin's `run()` methods **live against the kernel** (the ext battery only validates shapes in a mock ctx): verified side effects (orchestrate's persisted fact is findable afterwards) + 14 edge cases (unicode, injection-shaped, oversized, path-traversal, scheme-smuggling) + stub-honesty probes. Wired into the gauntlet
- **Crash attribution hardened (2026-10-22)** — `debug.SetCrashOutput` resolved its path relative to cwd, so a kernel spawned from `bin/` by a watchdog scattered crash logs outside `.hypernexus/`. The path now walks up from cwd to the workspace root (`.hypernexus/` or `VERSION` marker) and the startup log names the absolute crash-log location (`[CrashCapture] kernel fatals -> ...`)
- **Kernel swap vs elevated tokens** — the `HyperNexus-KernelWatchdog` scheduled task spawns the kernel with an ELEVATED token that `Stop-Process` cannot touch (Access is denied), so swaps aborted. `bin/swap-kernel.ps1` now requests a graceful `POST /api/shutdown` first (works regardless of token), falls back to kill, and prints an actionable elevation hint on failure; verified: shutdown in 4s, clean swap
- **httpapi test suite outgrew go-test timeouts — root-caused and fixed (900s+ timeout → 34s)**: two compounding problems. (1) `config.Default()` resolved to the real `~/.hypernexus`, so all ~200 tests opened the **production `memory.db`** through a 1-connection sqlite pool while the live kernel wrote to it — 20s busy-waits serialized everything and `TestMemorySearchIntegration` hung 5m+ in `database/sql.(*DB).conn`. `TestMain` now points config/main-config/workspace roots at fresh temp dirs. (2) Every `New()` leaked a full kernel's background loops (mesh ticker, gossip, coder agent, alwaysOn MCP spawner, ONNX preloader, catalog/session/maintenance loops, prompt-evolution ticker, supervisor conversation monitor). New `HYPERNEXUS_DISABLE_BACKGROUND_SERVICES` gate makes those loops exit immediately in tests (constructors still run; handlers see non-nil collaborators). Diagnostic helper: `zz_leak_probe_test.go` (`HN_LEAK_PROBE=1` dumps live goroutine origins)
- **Dead provider held the session queue hostage (real e2e regression, root-caused)** — a 503 "Endpoint is unavailable" model retried 5+ times in one assistant turn while queued command outputs (`ctx.session.synthetic`) never landed: hn-store **executed** (fact reached the kernel) but its confirmation message vanished. The plugin's `retry` hook now caps retries (2 for hard 5xx/provider.internal failures, 4 otherwise) via `event.decision = { retry: false }` — the turn dies fast, report outputs flow, and the user sees the error instead of a hung session
- **Third kernel-fatal race (found by completing the shared-state audit)** — `DecisionSystem.SearchTools` read `ds.loaded` (the `IsLoaded` flag) **without** `ds.mu` while `LoadTool`/`UnloadTool`/`evictIfNeededLocked`/`rebuildKnownLocked` write it under lock — the same `fatal error: concurrent map read and map write` class as the advertiser race. Fires whenever `search_and_call` runs while tools load/unload (every battery sweep, plugin storms). Fixed with a standalone `isToolLoaded` helper (self-locking, deadlock-safe); regression `decision_race_test.go` (9 goroutines searchers+loaders+unloaders, 5× repeat)
- **Flaky advertiser race regression test** — 30s cooldown meant only the first `GetAdvertisements` call returns ads; under load the main goroutine could starve the readers and leave the coverage counter at zero. Test now uses zero cooldown (map read still exercised every call) and counts all callers

### Added
- **pi-tool parity for the OpenCode extension (2026-10-23)** — `hypernexus_workflow` (list/run kernel workflows via `/api/workflows`), `hypernexus_orchestrate` (one-call RECALL→DISCOVER→PERSIST leg: memory search + tool search + task record; EXECUTE stays with the model), `hypernexus_browser` (scrape/status with graceful degradation when the browser service is down). Plugin is now **33 tools / 11 commands / 3 skills**; `rpc.js` TOOL contract + battery counts updated; drift battery auto-validates the new kernel endpoints (89→95 checks). mimo port still pending
- **`bin/soak.mjs` — the sustained-load soak test** (the no-`-race` substitute): hammers the exact hot paths that historically raced (tool-suggestion storms, memory writes/searches, `tools/search` + `agent/tool`, stdio round-trips) continuously while detecting kernel death, health gaps, and crash-log growth. `--minutes=N --concurrency=N`; PASS = alive throughout, zero crash-log growth, <2% error rate after warmup. First run: all streams 0% errors, 888 suggestion + 720 decision calls/min
- **`bin/test-drift.mjs` (89 checks) — the schema-drift guard** (in the gauntlet): every `/api/...` endpoint the extension references must exist on the live kernel (404 = drift), every `rpc.js` TOOL promise must be registered in `index.js`, every CAPABILITY mapping must resolve, and core registry tools must be live. Siblings rename kernel APIs daily — "extension broke because kernel moved" is now a red line
- **`bin/verify-all.mjs`** — one-command gauntlet: 8 Node batteries + 5 Go suites + crash-log check, single PASS/FAIL summary, `--fast` for batteries-only. Any agent on the shared branch can now verify in one shot
- **`bin/swap-kernel.ps1`** — the one sanctioned kernel swap path: lockfile (with stale-lock steal) → kill → verify gone → copy → verify size → optional **content verification** (`-Expect <fix-unique string literal>`; catches stale pre-commit builds — a real trap hit on 2026-10-21) → delete staged. Kills the multi-agent staged-binary collision class
- **Gauntlet hardening** — `verify-all.mjs` uses `-timeout 30m` for httpapi (goroutine-leak growth documented by the sibling agent); the e2e battery captures full message dumps on store-confirmation failures and polls 20s

### Verified
- **Gauntlet ALL GREEN 10/10 in ~3 minutes** (8 batteries incl. the new drift guard = 382 assertions + 5 Go suites + empty crash log) — the go-all step alone went from a 30m timeout to 82s
- Shared-state race audit now complete: cache ✓, auditor ✓, metrics ✓, PreemptiveAdvertiser ✓, DecisionSystem ✓ (fixed), gossip ✓ (peerKeys/PeerSet guarded), SkillStore ✓ (working-set guarded)
- Batteries 293/293; both race regressions 5× repeat under load; crash log empty

## [1.0.20] - 2026-10-20

### Fixed
- **Second kernel-fatal race (proactively hunted)** — `PreemptiveAdvertiser.GetAdvertisements` read the `injected` cooldown map **outside** `pa.mu` while concurrent calls wrote it under lock; an unlocked map read racing a locked write is still `fatal error: concurrent map read and map write` (process death). This fired whenever parallel tool-suggestion GETs overlapped — exactly what the OpenCode plugin's session hooks and every battery do. Cooldown reads now hold the lock; regression test `preemptive_advertiser_race_test.go` (8 goroutines hammering, 3× repeat, covered filter path)
- **Silent advertiser history loss** — `OnMessage` window-trim drops zero-timestamp messages instantly, so any caller that forgets `Timestamp` silently disables the suggestion feed; zero timestamps now default to now

### Verified
- Go suites green (`internal/mcp` incl. new race regression, httpapi, tools, memorystore, repograph)
- Batteries 293/293 across 7 runs; crash log empty through full load

## [1.0.19] - 2026-10-20

### Added
- **`recoverMiddleware`** (outermost HTTP layer) — Go's net/http does not recover handler panics, so one buggy route could take down the whole control plane; panics now return 500 with detail + full stack in the log. Tests: `recover_middleware_test.go` (recovery, pass-through, chain wiring)
- **Self-diagnosing kernel crashes** — `debug.SetCrashOutput` redirects unrecoverable runtime fatals (map races, OOM) to `.hypernexus/kernel-crash.log` at startup regardless of which parent spawned the process; every future crash is now attributable
- **README troubleshooting section** — MCP stale-state recovery (`opencode service restart`), slow-boot expectations, load tolerance, binary-swap trap, BOM trap

### Verified
- Go suites green (httpapi full 248s — note: Go's default 10m test timeout trips under load, use `-timeout 25m`), tools, memorystore, repograph
- Batteries 293/293 across 7 runs; crash log stayed empty through full battery load (kernel survives sweep + mimo + e2e + core suites back-to-back)

## [1.0.18] - 2026-10-20

### Fixed
- **Kernel-killing data race (the recurring "kernel dies mid-battery" mystery)** — `RepoGraphService.Build` published the Nodes map after pass 1 while pass 2 kept writing it, racing `SearchSymbols`/`FindReferences` readers into `fatal error: concurrent map iteration and map write` (an UNRECOVERABLE runtime fatal that kills the process instantly). The graph is now published atomically after both passes; import resolvers thread the in-build graph instead of the shared pointer. Regression test: `go/internal/repograph/graph_race_test.go` (concurrent build + search hammering)
- **Upstream bridge payloads silently discarded** — 32 bridge-success handlers called `callUpstreamJSON(..., new(any))` and threw the decoded result away, returning empty success envelopes on every upstream-bridged route (autonomy, config, council, settings, workflow, api-keys, UI-helper…). All now decode into a real value and return `data` (fixes 7 failing BridgeRoutes test groups)
- **Tool schema authority** — stale MCP inventory-cache entries shadowed correct argument schemas (first-wins merge); the Go-native catalog now overrides schemas/descriptions in every merge pass, and 22 missing catalog entries were added. All arg-taking tools expose real schemas on `/api/mcp/tools`
- **`lightweightSymbolSearch` unbounded repo walk** — the codebase-search fallback walked the entire tree with no skip list growth, no cap, and no context checks (90s+ hangs under load); now skips build/cache dirs, caps at 2000 files, honors ctx
- **Stale workflow test** — `TestWorkflowReadRoutesFallBackToEngineZeroState` assumed an empty engine, but built-in workflows (`go/internal/workflow/builtins.go`) seed it; renamed + per-case status/needles

### Added
- `go/internal/httpapi/agent_memory_local_test.go` — 5 tests locking in memory-store durability (salvage merge/dedupe, garbage rejection, corrupt-file self-heal to 200, atomic write leaves no `.tmp`, delete keeps store valid)
- `go/internal/repograph/graph_race_test.go` — concurrent Build+Search regression
- Sweep readiness gate (never race a 15s+ kernel boot) and 90s per-call tolerance for saturated shared boxes

### Verified
- **Go suites green**: `internal/httpapi` (full), `internal/tools`, `internal/memorystore`, `internal/repograph` — first fully green kernel test run of this series
- **Batteries green (293)**: OpenCode plugin 120 · E2E 11 · MCP tools 23 · MCP sweep 54 (53 pass + 1 graceful) · core-noext 18 · mimo 51 · mimo TUI 16

## [1.0.17] - 2026-10-20

### Added
- **Complete stdio↔router tool parity** — `go/internal/tools/console_parity.go` ports the 10 stdio-only tools (`billing_status`, `system_status`, `list_accessory_tools`, `update_supervisor_settings`, `click_chat_button`, `click_action_buttons`, `set_chat_input`, `submit_chat_input`, `simulate_input`, `advance_chat`) to the HTTP tool router; all 58 advertised MCP tools now work through both surfaces
- **`click_chat_button` actually implemented** — it was advertised in `tools/list` on stdio but had NO dispatch case (fell through to "Unknown tool"); now a real UIAutomation button Invoke on both surfaces
- **Sweep parity assertions** — `bin/test-mcp-sweep.mjs` verifies every stdio tool exists in the router inventory and safely exercises the newly-portable tools (SendKeys tools remain call-skipped: input injection is verified via parity + listing only)

### Fixed
- **Memory store corruption/torn reads** — `memories.json` writes were non-atomic `os.WriteFile`; concurrent read-during-write produced torn JSON that 503'd the ENTIRE memory subsystem (`invalid character '"' after top-level value`). Now: atomic temp+rename writes, an in-process mutex around every read-modify-write, and a **self-healing loader** that salvages balanced JSON documents instead of failing. Repaired the live store with zero data loss (1872 records; original preserved as `memories.json.corrupt.bak`)
- **Supervisor settings drift** — `get_supervisor_settings` on the router returned a hardcoded map while stdio read `~/.hypernexus/supervisor-settings.json`; the router version is now file-backed with identical defaults
- **Budget flakes under multi-agent load** — `memory_relate` now uses the slow-write budget; e2e synthetic-persistence poll widened to 10s; sweep tool timeout raised to 40s

### Optimized
- **Compact JSON memory writes** — the store is rewritten on every mutation; dropping indent whitespace cuts CPU/IO under write storms
- **Batched audit flush** — N plugin events now coalesce into ONE observation write per flush (was 1 write per event), cadence 2s→4s; materially reduces kernel load when several harness plugins run concurrently

### Verified (293 assertions green across 7 batteries)
- OpenCode plugin 120/120 · OpenCode E2E 11/11 · MCP tools 23/23 · MCP sweep 54/54 (incl. parity) · core-without-extension 18/18 · mimo extension 51/51 · mimo TUI 16/16

## [1.0.16] - 2026-10-20

### Added
- **`hypernexus_memory_relate`** — write knowledge-graph edges (`source_id → relation_type → target_id`, weighted) via `/api/memory/relations/add`
- **`bin/test-opencode-e2e.mjs`** — REAL end-to-end through the OpenCode HTTP API (no mock, no model): plugin load-state (`GET /api/plugin?location[directory]`), live session creation, `/hn-*` command execution via `POST /api/session/{id}/command`, synthetic-output persistence, and command→kernel fact persistence (11 checks)

### Fixed
- **`memory_store` returned `id: null`** — the kernel wraps the record (`data.memory.id`); id extraction now unwraps the envelope so search results and `memory_delete`/`memory_relate` are actionable
- **Shared mimo battery stale exact-count** — `bin/test-extensions.mjs` asserted exactly 20 mimo tools and broke when a concurrent harness agent grew the surface to 22; now asserts the floor (≥20) + required core names so additive changes from sibling harness agents don't false-fail

### Optimized
- **Search results surface record ids** (`[id] content [tags]`) across memory_search/list/harvest — delete/relate are directly actionable from output
- **auto-store dedupe** — identical tool results are stored once (content-hash set)
- **Audit flush parallelized** — the 2s observation batch now flushes concurrently

### Verified (285 assertions green across 7 batteries)
- OpenCode plugin 120/120 · OpenCode E2E (real service) 11/11 · MCP tools 23/23 · MCP sweep 46/46 · core-without-extension 18/18 · mimo extension 51/51 · mimo TUI 16/16

## [1.0.15] - 2026-10-19

### Added
- **`hypernexus_memory_delete`** — full memory lifecycle: delete by id, or tag fan-out (capped) through `/api/agent-memory/delete`
- **`/hn-restore`** — pick up the last session handoff artifact (completes the HANDOFF workflow from the `hypernexus-workflows` skill)
- **Structured file observations** — tool hooks now record `file-change:*` / `file-read:*` observations with `filesModified`/`filesRead` into the kernel knowledge graph (edit/write/multiedit/apply_search_replace + read/grep/glob/ls)
- **Assistant-turn advertiser feed** — both conversation roles now feed the preemptive tool-suggestion monitor (throttled per role)

### Fixed
- **`/hn-purge` was inert** — it sent `{tag}` but `/api/agent-memory/delete` reads `{id}`; now id-shaped keys delete directly and other keys fan out over tag matches
- **Context-hook assistant feed scope bug** — referenced an undefined `sessionID` local instead of `event.sessionID`

### Optimized
- **Hot-path context injection parallelized** — FTS harvest and suggestion fetch run concurrently inside the 400ms hook budget
- **Negative caching** — while the kernel is known-down (status cache), hot-path hooks skip all network attempts instead of re-probing every turn

### Verified (269 assertions green)
- OpenCode plugin battery 115/115 · MCP tools 23/23 · MCP sweep 46/46 · core-without-extension 18/18 · mimo extension 51/51 · mimo TUI 16/16

## [1.0.14] - 2026-10-19

### Added
- **OpenCode V2 plugin (new)** — `addons/opencode/` full bridge: 28 typed tools (`hypernexus_*` namespace), 10 `/hn-*` commands, 3 skills, session hooks (prompt admission with `@memory:key` expansion + suggestion feed + session priming, per-turn fast-FTS context injection, compaction enrichment, model-request identity headers, retry observability), tool hooks (RBAC pre-check + fire-and-forget audit + result auto-store), permission hook (`HYPERNEXUS_RBAC=audit|ask|deny`), shell env injection, worktree strategy, event-stream turn observation, and auto-registration of the `hypernexus mcp` stdio server. V1 `server()` shim keeps OpenCode 1.x working from the same package. Installer: `addons/opencode/install.mjs` (project/global/uninstall/check)
- **OpenCode shared RPC contract** — `addons/opencode/plugin/hypernexus/rpc.js` exposes TOOL/COMMAND/CAPABILITY/KERNEL/BUDGET maps; `addons/shared/hypernexus.manifest.json` now binds all 14 capabilities to `opencode` tool names
- **Kernel router parity for 6 stdio-only tools** — `go/internal/tools/kernel_bridge.go` registers `mcp_status`, `mcp_list_servers`, `mcp_list_tools`, `mcp_call_tool`, `mcp_server_test`, `inspect_window_ui` so every advertised MCP tool also works through `POST /api/agent/tool` (previously "not implemented in Go and Node server is unreachable")
- **Test batteries** — `bin/test-opencode-ext.mjs` (109 checks: registration, tools, commands, hooks, V1 shim, kernel-down degradation), `bin/test-mcp-sweep.mjs` (46 invoked + stdio transport: initialize/tools-list/tools-call; destructive tools documented-skipped)

### Fixed
- **Skill registrations must include `path`** — OpenCode V2 `Skill.Info` schema requires `path`; a missing key failed the skill transform and **disabled the entire plugin** ("disabled plugin after transform failure"). Skills now materialize SKILL.md files and register with `path`
- **`options.baseUrl` never reached tool executors** — plugin tools fell back to the module-level kernel URL even when a per-instance base was configured; a runtime base now propagates from `setup()`/`server()` to every kernel call
- **Adapter endpoint drift** — `skills/search` needs `q` (not `query`), `agent-memory/pickup` is POST-with-JSON-body, `sessions/imported/search` does not exist (list+filter), `cross-session-links` requires a JSON body, `relations/graph` takes `id`
- **Flaky test regexes** — `bin/test-mcp-tools.mjs` asserted on `/error.*failed/i` inside memory *content* (false positives on real data) and read a non-existent `VERSION.md`; assertions now use the router envelope

### Verified (1.0.14 kernel: 196 assertions green)
- OpenCode plugin battery 109/109 · MCP tools 23/23 · MCP sweep 46/46 (6 documented skips) · core-without-extension 18/18 · stdio transport: initialize + 58 tools + tools/call

## [1.0.13] - 2026-10-06


### Changed
- **Dual-remote sync** — `clean-main` fast-forwarded to `github/main`/`gitlab/main`; both remotes verified in sync
- **Submodules updated** — `lumbros.me` → 16261e00 (origin/main), `vendor/deepseek-harness` → 5badb150 (dsh-v0.2.1-alpha.1), `vendor/grok-build` → 2bdd1d6a (main)
- **Feature branch audit (HyperNexus)** — `gitlab/feature/cloud-dashboard-mcp-sse-389806464713532918` confirmed fully redundant: orphaned history (2687 commits, alpha.159, no merge base), all unique features already in main under `archive/go_enterprise_sales_bot/borg/` and live SSEPlugin.ts
- **realestatecrm feature branch reconciliation** — reverse-merged `main` into 4 stale AI branches and pushed; leadg `main` fast-forwarded to 2e9feb0
- **Workspace branch scan** — only legacy develop/canary branches remain (element-web, hyper, FFmpeg, topaz-ffmpeg, timidity, ArrowVortex); no unmerged AI feature branches under robertpelloni

### Verified
- **Dashboard single-page consolidation** — all features on `/dashboard` with 6 anchored sections (mission-control, memory-graphrag, mcp-registry, research-workflows, governance-billing, integrations); nav-config maps every former subpage with tooltips
- **System tray** — `go/internal/systray/systray_windows.go` has activity notification, last-10-log menu, `TriggerFullShutdown()` quit path wired from `httpapi/server.go`

## [1.0.12] - 2026-10-02

### Fixed
- **Batch scripts** — `build.bat` and `build-editions.bat` now use correct Go entrypoint (`./cmd/tormentnexus`) and module path (`gitlab.com/HyperNexusLLC/HyperNexus`); `push-to-gitlab.bat` and `commit-and-push.bat` now push to `github`/`gitlab` remotes on `clean-main` branch
- **build-editions.bat** — fixed duplicate `:build_hypernexus` label (second section now `:build_corporate`); `:build_both` correctly calls both editions

### Changed
- **Feature branch audit** — `gitlab/feature/cloud-dashboard-mcp-sse-389806464713532918` fully analyzed: all 4 unique features (L3 Cold Archive, P2P gossip mesh with AES-GCM encryption, Skill Evolution Engine, MCP SSE remote connectivity) already present in clean-main in equal or superior form. Branch is fully redundant — old TormentNexus/AIOS lineage with independently-merged features.

## [1.0.11] - 2026-10-02

### Added
- **MCP auto-start** — 4 `alwaysOn` servers (filesystem, hypernexus-supervisor, desktop-commander, ripgrep) connect at kernel boot via `autoStartAlwaysOnMCPServers`
- **MCP Connect All** — `POST /api/mcp/connect-all` connects all 56 enabled servers (56/56 verified)
- **`Aggregator.ConnectedCount()`** — live stdio connection count in `/api/mcp/status`
- **HTTP fallback hooks** — `use-mcp-http.ts` with 7 read hooks + 8 mutation helpers (tRPC primary + kernel HTTP fallback)
- **MCP client examples** — Python, TypeScript, Go in `examples/mcp-clients/`

### Fixed
- **`mcp-yfinance-server`** — config updated to use `uvx` (binary not on PATH)
- **All Go tests pass** — 3 pre-existing failures fixed (`TestToolResultSnapshots`, `TestResolveClientTargets`, `TestVerifyLicense`)
- **mcpimpl vet errors** — 7 files with `string(int)` conversions → `strconv.Itoa`
- **ai-tools page** — wired to HTTP fallbacks (was pure tRPC)

### Changed
- **Script cleanup** — archived 16 obsolete one-off deploy scripts and legacy marketing bots to `scripts/archive/` (nondestructive). Active deploy scripts consolidated under `scripts/deploy-hetzner.sh`, `scripts/ci-deploy-hetzner.sh`.
- **Dashboard single-page consolidation** — nav-config now uses anchor links (`#mission-control`, `#memory-graphrag`, `#mcp-registry`, `#research-workflows`, `#integrations`, `#governance-billing`) into the unified dashboard home. All 57 subdirectory pages remain accessible as deep links.
- **API docs** — `API_ENDPOINTS.md` MCP section expanded with 15 new endpoints; `QUICKSTART.md` updated with `mcp_servers.json` and connect-all usage

### Verified
- Go kernel builds clean (`go build ./...`)
- Dashboard standalone build on Windows
- Both GitHub and GitLab remotes in sync at `main`
- Hetzner production running v1.0.11
- 56/56 MCP servers connect via `POST /api/mcp/connect-all`

## [1.0.10] - 2026-10-01

### Fixed
- **Sidebar navigation** — links pointed to `?tab=page-a/b/c/d` but dashboard uses anchor sections. All sidebar clicks now correctly scroll to `#mission-control`, `#memory-graphrag`, `#mcp-registry`, `#research-workflows`, `#integrations`, `#governance-billing`.
- **catalog.db corruption** — Git LFS pointer files replaced real SQLite databases. Backed up as `.lfs-pointer.bak`, kernel rebuilds catalog on startup.
- **Stale kernel binary** — running binary was from Aug 9 (v1.0.0-b1); rebuilt from source (v1.0.8). All API endpoints now return 200.

### Added
- **Intelligent merge from feature branch** — 79 `go/internal/` files (L3 cold archive, P2P gossip, skill evolution engine, catalog indexer, enterprise audit, 70+ mcpimpl tool handlers)
- **Analysis documentation** — ANALYSIS_MISSING_FEATURES.md, future_memory_spec.md, PORTING_MAP.md, TORMENTNEXUS_FEATURE_ASSESSMENT.md, MCP_ASSIMILATION_REPORT.md
- **Sidebar redesign** — 7 value-ordered sections (Overview > Agents > Tools > Memory > Infra > Integrations > Admin) with descriptive tooltips on every item

## [1.0.9] - 2026-10-01

### Added
- **HTTP fallback for startupStatus** — health, system, and integrations pages survive tRPC outages via kernel HTTP. New `use-startup-status.ts` hook with tRPC primary + kernel fallback for startupStatus, browserStatus, mcpStatus.
- **Dashboard-compatible startup checks** — `/api/startup/status` now returns `mcpAggregator`, `sessionSupervisor`, `extensionBridge`, `executionEnvironment`, `configSync` matching the `DashboardStartupStatus` shape. Includes `uptime` field.

## [1.0.8] - 2026-10-01

### Added

- **Real provider breakdown** — `/api/metrics/provider-breakdown` aggregates request/success/error counts, avg latency, models, and last-used from local routing history (was hardcoded zeros). Merged with the provider catalog.
- **Token usage in routing** — `RoutingEvent.tokenInput/tokenOutput` recorded from LLM `Usage`; provider breakdown `tokenCount` aggregates them and overlays live `QuotaManager` totals
- **Model-pricing cost estimates** — `providers.EstimateCostUSD` + static price table; `totalCostUsd` on provider breakdown and billing model-pricing preview; dashboard Cost column
- **Metrics stats enrichment** — local stats fallback now includes `providerBreakdown` and `routingHistory` so one call feeds the dashboard
- **Routing history persistence** — `metrics.MetricsService.SetRoutingPersistence` loads/saves the 500-event ring to `MainConfigDir/metrics/routing-history.json` (atomic write). Survives kernel restarts (verified on Hetzner).
- **Dashboard metrics fallback** — `/dashboard/metrics` fetches kernel HTTP stats/provider-breakdown when tRPC is down; new Provider Breakdown table

### Changed

- **GitHub Actions Node 22** — `actions/checkout@v5`, `setup-go@v6`, `setup-node@v5`, `node-version: 22` / Go 1.25 across workflows (clears Node 20 deprecation warnings)

### Fixed

- **Routing persistence wiring** — `ensureMetricsPersistence` ran before `s.metricsService` was assigned, so the disk-backed ring was set on the unused global singleton

---

## [1.0.7] - 2026-10-01

### Added

- **Live routing history** — `AutoRoute`, `AutoRouteWithModel`, `Router.Route`, and `/api/agent/tool` record `RoutingEvent`s into the local metrics ring (provider, model, tool, strategy, latency, success)
- **Dashboard skills working set** — load/unload buttons and a Working Set panel on `/dashboard/skills` backed by `/api/skills/load|unload|list-loaded`
- **Dashboard routing history** — `/dashboard/metrics` shows recent routing decisions (auto-refresh 10s)

### Fixed

- **`<nil>` leakage** — `metrics.track` routing normalization used `fmt.Sprint` on missing map keys; empty fields now serialize as `""`
- **Stale process on :7778** — `/usr/local/bin/hypernexus` script wrapper held the port after binary swap; deploy script now kills listeners before install

---

## [1.0.6] - 2026-10-01

### Added

- **Local metrics event store fallbacks** — `/api/metrics/stats`, `/timeline`, `/routing-history` return 200 from `metrics.MetricsService` when upstream tRPC is down (was 503)
- **Metrics dual-write** — `/api/metrics/track` always records locally; routing-shaped payloads feed a 500-entry routing history ring
- **Skill working-set API** — `/api/skills/load`, `/unload`, `/list-loaded` backed by an in-memory working set (was 501 stubs)
- **Next.js dashboard redeploy** — standalone build live on Hetzner `:7779` (`hypernexus-dashboard.service`)

### Verified

- Metrics stats/timeline/routing-history 200 with `fallback: go-local-metrics` on live Hetzner kernel
- Skill load → list-loaded → unload round-trip green on Hetzner
- Dashboard `/dashboard` 200 on `:7779` after overlay deploy (BUILD_ID `P9HUWlTE6tqDCp2aXxkua`)

### Fixed

- **Metrics fallback tests** — expected 503 preview; now assert 200 local-store responses
- **Windows pnpm symlinks break Linux standalone** — overlay deploy keeps Hetzner `node_modules` and replaces only `.next-build`/`.next`/`server.js`/`public`

---

## [1.0.5] - 2026-09-30

### Added

- **Bearer token auth** — dashboard and write APIs accept `Authorization: Bearer <token>` in addition to `X-Dashboard-Token`, `?token=`, and `hn_dash_token` cookie
- **Deploy smoke tests** — `deploy-hetzner.yml` verifies binary size after transfer and checks live health/dashboard/write-API auth after restart

### Verified

- L2 import/cleanup reject unauthenticated writes (401); accept `X-Dashboard-Token` and `?token=`
- Dashboard returns 401 without token on live Hetzner kernel
- Bearer token auth live on Hetzner (import/cleanup 200 with `Authorization: Bearer`)
- GitHub secrets set; HyperNexus CI green; `deploy-hetzner.yml` green (push + workflow_dispatch)

### Fixed

- **repomap tests** — `Generate` calls updated for `context.Context` first arg
- **deploy-hetzner.yml** — secrets not allowed in `if:`; gate via `env.HAS_SSH_KEY`; extract `scripts/ci-deploy-hetzner.sh`
- **deploy-landing.yml** — removed duplicate `deploy-hypernexus` job key

---

## [1.0.4] - 2026-09-30

### Added

- **L2 export/import API** — `/api/memory/l2/export` + `/l2/import` for VectorStore backup/transfer
- **Knowledge graph API + UI** — `/api/memory/graph`, canvas viz, edges table, entity labels (`ent-ollama`)
- **GraphRAG relation extraction** — `memory_extract_relations` + batch corpus extractor (pattern + Ollama + co-occurrence)
- **MCP tool schemas** — `tools.NativeToolMeta` catalog with full `inputSchema` for all native tools
- **Ollama chat fallback** — `agent.chat` falls back to local Ollama when AutoRoute fails
- **Dashboard token auth** — `HYPERNEXUS_DASHBOARD_TOKEN` with login form; write APIs guarded
- **Relation-aware search** — GraphRAG neighbor boost in `SemanticSearch`
- **Search `sources` array** — `/api/memory/search` reports upstream / local-json / vectorstore
- **Deploy + backup automation** — `deploy-hetzner.yml`, `scripts/backup-l2.sh` (daily cron), L2 round-trip test

### Fixed

- **Over-superseding** — contradiction detector uses Jaccard + word-boundary polarity; upsert skips conflict detection
- **memory_relations FTS** — proper external-content FTS5 delete triggers; legacy table dropped on open
- **L2 import silent failures** — `memory_type` CHECK normalized; per-record errors returned
- **Export timestamps** — flexible parse (RFC3339 / SQLite datetime); zero CreatedAt defaulted on commit
- **Hashed entity IDs** — `/api/memory/graph/cleanup` drops opaque `ent-xxxxxxxx` edges
- **MCP configs** — serena uvx args split; missing binaries converted to uvx/npx (0 missing)
- **agent tool API** — accepts `name`/`toolName` and `arguments`/`args` aliases

### Verified

- L2 round-trip stable: 27 export → import 27 → 27
- Graph 36+ nodes after slug IDs and cleanup
- Dashboard 401 without token, 200 with token

---

## [1.0.1] - 2026-07-17

### Fixed

- **Dashboard API Routing** - Fixed CORS errors and 404s when accessing dashboard remotely
  - `endpoints.ts`: Use same origin (nginx proxy) when remote, not hardcoded `:7778`
  - `StreamStatus.tsx`: Health check uses `/api/go/health` when remote
  - nginx config: Added `/api/go/` location block before `/api/` for proper proxy chain
- **Dashboard Branding** - Both dashboards now show "HyperNexus" (was "TormentNexus")
- **GitLab CI Pipeline** - Fixed pnpm install and artifact paths

### Verified

- **Stripe Checkout** - Fully working: session creation, price ID, webhook endpoint
- **API Endpoints** - All proxied correctly through nginx
- **tRPC** - Working through nginx proxy

### Added

- **MEMORY.md** - Multi-agent insights and critical architecture lessons
- **AGENTS.md** - Dashboard API routing architecture documentation

---

## [1.0.0-b2] - 2026-07-27

### Added

- **MiMo v2.5 LLM Integration** - Marketing bots now generate intelligent, contextual replies
- **Reddit Reply Queue Generator** - Scrapes Reddit for relevant threads and generates replies
- **BobbyBookmarks Ingestion** - 509 new URLs being processed with LLM enrichment
- **Competitive Analysis** - Analyzed competitors: mem0, Zep, LangMem, Letta, Hindsight
- **VISION.md** - Comprehensive project vision and goals
- **DEPLOY.md** - Detailed deployment instructions
- **IDEAS.md** - Creative ideas and pivots
- **PROJECT_STATE.md** - Current project status analysis

### Changed

- **Marketing Bot URLs** - Fixed hypernexus.io → hypernexus.site
- **Context-Aware URLs** - Reddit/Twitter/LinkedIn bots use appropriate URLs based on context
- **Stripe Credentials** - Updated to new account with monthly/yearly pricing
- **GitLab CI Pipeline** - Fixed pnpm install and artifact paths

### Fixed

- **Import Errors** - Restored generate_reply import in marketing bot
- **CDP Connection** - Fixed WebSocket connection issues for browser automation
- **Build Pipeline** - Updated pnpm-lock.yaml for HyperNexus rebranding

---

## [1.0.0-b1] - 2026-07-18

### Added

- **Progressive Tool Routing** - Semantic vector search for tool selection (60% token savings)
- **LLM Waterfall** - 3-tier failover: Primary → Secondary → Local → Queue
- **Dual-Tier Memory** - L1 session scratchpad + L2 permanent semantic storage
- **Knowledge Graph** - graph_nodes and graph_edges tables for relationship tracking
- **A2A Protocol Support** - Agent2Agent protocol for inter-agent communication
- **MCP Server Management** - Native integration with Model Context Protocol
- **Biomimetic Decay** - Ebbinghaus forgetting curve for memory heat scores
- **Multi-Agent Orchestration** - Swarm architecture with role rotation

### Changed

- **Rebranding** - TormentNexus → HyperNexus across entire codebase
- **Module Path** - gitlab.com/robertpelloni/TormentNexus → gitlab.com/HyperNexusLLC/HyperNexus
- **Go Backend** - 446 HTTP handlers, goroutines, sqlite-vec
- **Next.js Dashboard** - 57 subpages consolidated into 5-tab interface

### Fixed

- **Database Schema** - Added missing columns and indexes
- **API Endpoints** - Fixed authentication and authorization
- **Build Process** - Updated CI/CD pipeline for new module path

---

## [0.9.0] - 2026-06-15

### Added

- **Initial Release** - Basic AI agent framework
- **Tool Routing** - Simple tool injection into context
- **Memory System** - Basic session memory
- **MCP Support** - Initial MCP server integration
- **Dashboard** - Basic web interface

### Changed

- **Architecture** - Monolithic Go binary
- **Database** - SQLite for storage
- **API** - REST endpoints

---

## [0.8.0] - 2026-05-01

### Added

- **Proof of Concept** - Initial AI agent prototype
- **Basic Memory** - Simple key-value storage
- **Tool Execution** - Execute tools from context
- **CLI Interface** - Command-line interface

### Changed

- **Language** - Go for backend
- **Storage** - File-based storage

---

## Version Naming Convention

- **Major.Minor.Patch** - Standard semantic versioning
- **-b1, -b2, etc.** - Beta releases
- **-rc1, -rc2, etc.** - Release candidates
- **-alpha.1, -alpha.2, etc.** - Alpha releases

---

## Release Process

1. Update VERSION file
2. Update CHANGELOG.md
3. Create git tag: `git tag v1.0.0-b2`
4. Push tag: `git push origin v1.0.0-b2`
5. Create GitLab release
6. Deploy to production
7. Announce on social media

---

*"The only way to do great work is to love what you do."* — Steve Jobs

## v1.0.2 (2026-08-21)

### Features

- MCP observability dashboard with real-time traffic monitoring
- Testimonials page with developer reviews
- Changelog page with release history

### Repository Sync

- Merged feature/cloud-dashboard-mcp-sse branch into main
- Merged jules-autopilot upstream branches (session kanban board, debug log removal)
- Merged freellm dependabot dependency updates
- Updated all submodules to latest commits

### Infrastructure

- Fixed TormentNexus dashboard branding
- Fixed nginx proxy configuration for telemetry API
- All services verified operational on hypernexus.site
## [1.0.3] - 2026-09-22

### Removed
- Dead TypeScript bridge code from `sessionbridge.go` — removed 4 hardcoded upstream URLs (7787, 7779, 4000, 3847) that pointed to the decommissioned `hypernexus-core` control plane
- `resolveLockedTRPCBase`, `DefaultTRPCBasesFromDiscovery`, `defaultTRPCBases` — dead code from TS-core era
- `BridgePort` / `BridgeBaseURL` from `ServiceDiscovery` — bridge service no longer exists
- Dead `tsCore` health check and async upstream race from `system_overview_handler.go`
- Dead TS control plane launch from `start.sh` (`node packages/cli/...`)
- ~150 `bridge.fallback` / `"upstream unavailable"` response patterns eliminated as primary path

### Changed
- `ResolveTRPCBases` now returns `nil` unless `HYPERNEXUS_TRPC_UPSTREAM` is explicitly set (Go kernel is sole control plane)
- `DefaultServiceDiscovery`: `KernelPort` 4300→7778, `DashboardPort` 3000→7779 (matching production)
- `TRPCUpstreamURLs` empty by default — external upstream is opt-in only
- `system_overview_handler.go`: `health.tnKernel` → `health.goSidecar`, removed `health.tsCore`
- `service_connectivity.go`: `trpcUpstream` reports `not-configured` instead of `unreachable`
- `start.sh`: Go kernel port 4300→7778, removed TS control plane launch step
- `docs/ARCHITECTURE.md`: rewritten to reflect current Go-kernel-only architecture

### Fixed
- `TestSystemOverviewHandlerReturnsGoNativeData` now passes (`goSidecar` naming aligned)
- `TestResolveTRPCBasesNoUpstreamWhenNoEnv` replaces stale lockfile-based test
- All discovery tests updated to match production port topology (7778/7779)
## [1.0.3] - 2026-09-22

### Added
- HyperNexus MCP integration for MiMoCode (global config + skill)
- HyperNexus MCP integration for MiMo Desktop (skill + 6 JS tools)
- HyperNexus skill for Agents platform
- Updated Codex skill with full API reference (554 routes, 40+ MCP tools)
- `db` export with Drizzle schema generic in `apps/web/src/lib/db.ts`
- `drizzle-orm` and `pg` dependencies for dashboard
- Registered `/api/catalog/stats` route (was listed in API index but never wired)

### Fixed
- Dead TypeScript bridge code removed — `callUpstreamJSON` returns immediately unless `HYPERNEXUS_TRPC_UPSTREAM` is set
- `links_backlog` schema: added missing `researched_at` and `raw_payload` columns, aligned column types with queries
- `links_backlog` DB path: `catalog.db` → `hypernexus.db` (matches test seed and production `localHyperNexusDBPath()`)
- MCP server list: merge JSONC-created servers with DB results (create/list storage mismatch)
- System overview: `health.tnKernel` → `health.goSidecar`, removed dead `tsCore` health check
- Dashboard build: added missing `db` export with schema generic
- 9 of 11 pre-existing test failures fixed

### Changed
- `DefaultServiceDiscovery`: `KernelPort` 4300→7778, `DashboardPort` 3000→7779
- `TRPCUpstreamURLs` empty by default (Go kernel is sole control plane)
- `start.sh`: removed dead TS control plane launch, fixed Go port
- `docs/ARCHITECTURE.md`: rewritten to reflect current architecture
- All 67 MCP servers from `settings/mcp.jsonc` imported into kernel DB

### Removed
- `BridgePort` / `BridgeBaseURL` from `ServiceDiscovery`
- Dead upstream URLs (7787, 7779, 4000, 3847) from `sessionbridge.go`
- `resolveLockedTRPCBase`, `DefaultTRPCBasesFromDiscovery`, `defaultTRPCBases`
- Dead TS control plane launch from `start.sh`
## [1.0.22] - 2026-10-28 
### Added 
- Codex HARNESS addon: codex-native install.mjs (TOML upsert with managed markers, 12 skills, 3 hooks, AGENTS.md overlay, --check/--uninstall). 
- addons/codex/bin/test-codex-ext.mjs battery: 13 checks (config, skills, hooks, overlay, mint, kernel health, CLI presence). 
- addons/codex/use-meta-model.ps1 launcher and meta-model.codex.md wiring doc (MODEL_API_KEY from pi live-mint, never stored). 
- addons/codex/README.md rewritten codex-native (was a freebuff copy). 
### Verified 
- install --check green; uninstall (17 items) + reinstall cycle green; config untouched. 
- Meta mint OK (key hidden); kernel 1.0.21 ok:true; battery 13 pass / 0 fail / 1 env-SKIP. 
- CDP identification delivered to Chat-Bobbi (submit hit, text present at index 2462). 
