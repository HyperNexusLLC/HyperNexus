# CHANGELOG.md — HyperNexus Version History

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.19] - 2026-10-20

### Added
- **Jcode harness integration (`addons/jcode/`)** — full HyperNexus integration for the Jcode harness: MCP server registration (`.jcode/mcp.json` / `~/.jcode/mcp.json`, `mcpServers` stdio schema), 3 skills (`hypernexus`, `hypernexus-ops`, `hypernexus-workflows`), prompt overlay (RECALL→DISCOVER→EXECUTE→PERSIST→VERIFY), preferred-tool routing block, swarm-prompt persistence block, and an idempotent installer (`install.mjs`: project/global/check/uninstall, managed-block markers)
- **`bin/test-jcode-ext.mjs` battery (43 checks)** — config shape, installer idempotence, skills byte-identity + frontmatter, managed-block balance, stdio MCP via the *configured* command (initialize, full inventory, memory round-trips add→search→delete with async-propagation polling, concurrent dispatch), stdio↔router parity
- **Shared manifest `jcode` harness entry** — capability map bound to `mcp__hypernexus__*` tool names

### Fixed
- **MCP stdio `tools/list` degraded under kernel load** — `getMergedTools()` fetched the upstream inventory with a hard 3s timeout and no cache: whenever the kernel was busy (graph builds, sweeps, sibling agents) the fetch timed out and clients saw only the 49-tool static fallback instead of the full 58-tool merged inventory (core memory/search tools missing). Now: 8s fetch timeout + one retry + 15s-TTL last-good cache (stale cache preferred over degraded listing)
- **MCP stdio serialized dispatch** — one slow `tools/call` (60s upstream budget) blocked every subsequent request behind it (tools/list, other calls); requests now dispatch concurrently (bounded semaphore, serialized writes) with id-based correlation preserved

### Verified
- Jcode extension battery **43/43** · MCP tools **23/23** · MCP sweep **54 invoked (53 pass + 1 load-induced soft, 0 fail)** · core-noext **18/18** · mimo **51/51** · mimo TUI **16/16** · OpenCode plugin battery re-run green on the swapped kernel
- Live in this session: Jcode MCP manager connects `hypernexus` (58 tools), `hello_world`/`search_memory` round-trip through the harness's own MCP tool manager
- Memory lifecycle quirks documented: `search_memory` keyword matching needs natural-language tokens (hyphenated ids don't tokenize), delete propagation is asynchronous across stores

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
