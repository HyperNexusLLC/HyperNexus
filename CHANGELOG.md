# CHANGELOG.md — HyperNexus Version History

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
