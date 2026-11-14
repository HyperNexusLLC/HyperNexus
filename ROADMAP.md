# ROADMAP: TormentNexus Kernel & TormentNexus Dashboard

> Version source of truth: `VERSION`. Every milestone bump commits + pushes with the version in the message.

_Last updated: 2026-11-12, version 1.0.0-alpha.254_

## Completed (v1.0.0-alpha.254)

> SYNC4 (2026-11-11, v1.0.32): all feature branches merged or retained-as-archive; deepseek-harness at v0.2.2-rc.2; live kernel is the installed v1.0.0-b1 build (drift from repo version — see TODO). v1.0.33: dashboard startup-blocking helpers extracted to `dashboard-startup-blocking.ts`; v1.0.34: overview model extracted to `dashboard-overview-model.ts`; v1.0.35: dashboard test suite repaired (97/97 green) + research/manual totals crash fix; v1.0.36: final legacy dashboard pages retired to redirects; v1.0.37: embedding cache for semantic search; v1.0.38: mission-control header extracted to its own component; v1.0.39: integrations section extracted; v1.0.43: docs governance refresh + kernel swap to repo build; v1.0.44: `#research-workflows` section extracted to `dashboard-research-workflows-section.tsx` (home view 2451→2267 lines); v1.0.45: governance/security section + logic extracted to `dashboard-governance-security-section.tsx` (2267→1883 lines); v1.0.47: decomposition completed (760-line home view, 107/107 tests); v1.0.48: systray polish (version header, API-index item, CIM cleanup) + kernel swap to repo build; v1.0.49: harness-matrix fix pass (facts/add hang, attestation strip coverage, wonder in /v1/models, 10 new harness batteries, session-bus swarm floor); v1.0.50: dashboard below-fold sections lazy-loaded via `next/dynamic` (107/107 tests); v1.0.51: GUI kernel-path live smoke 30/30 across all 15 GUI pins; v1.0.52: harness-doctor endpoint (`/api/harness/doctor`, 37 ok / 3 partial of 40 addons).

| Layer | Status |
|---|---|
| Go kernel (:7778) | ✅ running, 49+ tools, systray (fixed ghost + TaskbarCreated) |
| Dashboard (:7779) | ✅ running (Next.js standalone) — **60 legacy page dirs / 4631-line home view (decomposition started v1.0.29: consolidated sections extracted)** |
| MCP server (stdio) | ✅ 58 tools, exposure:direct in pi/mimo |
| pi extension | ✅ 22 tools + 7 commands + 17 hooks (robust, honest, fast) |
| mimo plugin | ✅ 22 tools + 26 hooks (reliability + our features merged) |
| Watchdog | ✅ active (stall-vs-death aware) |
| Ollama | ⚠️ running but `llama-server` binary missing → native embeds dead (we use bundled MiniLM) |
| Marketing agent (:8084) | ❌ not running |

---

## Milestone 1 — Dashboard Consolidation (mostly DONE — polish remains)

**Actual state (verified 2026-10-21):** The dashboard navigation is **already
consolidated** into the single-page model. `nav-config.ts` has 7 value-ordered
sections (Core/Agents/Tools/Knowledge/Infra/Data/Admin), every nav item has a
tooltip, and all hrefs point to `dashboard-home-view.tsx` section anchors
(`#mission-control`, `#memory-graphrag`, `#mcp-registry`, …) — not to the 99
standalone pages. Those 99 `dashboard/*` pages are **legacy/dead** (not linked
from the nav).

`dashboard-home-view.tsx` (4958 lines) has 10 sections; 7 are substantive
(research-workflows 42KB, mcp-registry 18KB, governance-billing 18KB,
memory-graphrag 15KB, healer-cognition 10KB, integrations 8KB, mission-control
7KB) but **3 are thin stubs**:
- `health-metrics` (~676 chars)
- `skills-workflows` (~562 chars)
- `security-audit` (~550 chars)

**Remaining work (narrowed):**
1. Flesh out the 3 thin sections (health-metrics, skills-workflows, security-audit)
   with real content, forms, and tooltips.
2. Decompose `dashboard-home-view.tsx` (4958 lines) → one lazy component per
   section for maintainability.
3. Retire the 99 legacy `dashboard/*` pages (redirect to their home anchors) to
   remove dead weight and stop them reappearing in future navigation work.

## Milestone 2 — Kernel Resilience & Observability
- Embedding cache (in-memory vector matrix) for sub-second semantic search under load.
- Per-endpoint latency histogram exposed to the dashboard.
- Watchdog as a **scheduled task** (survives reboot) — currently a background process only.

## Milestone 3 — Extension Ecosystem Parity
- Port pi's `tn-orchestrate` + `workflow` + `browser` tools to mimo/opencode.
- Autonomous orchestration across harnesses via `addons/shared/hypernexus.manifest.json`.

## Milestone 4 — Data Integrity
- Memory `archive` vs `long_term` semantics — document + expose in UI (search now covers 100%, ranked).
- Backup/restore story for `memory.db` (currently ad-hoc `.bak` binaries, now gitignored).

## Milestone 5 — Production Hardening
- Replace the per-restart kernel deploys with a graceful, zero-downtime reload where possible.
- Full `DEPLOY.md` parity for Hetzner + local.

## Milestone 6 - Repository Consolidation (v1.0.28, 2026-11-05; re-verified v1.0.30, 2026-11-07)
- Single-line `main` reconciled across GitHub + GitLab (258-commit fast-forward); all feature branches audited - the one divergent branch (`feature/cloud-dashboard-mcp-sse-*`) is an unrelated-history archive, retained unmerged. Re-audit 2026-11-07: 0 unique commits on all active branches; all 4 fast-forwarded to `main` (v1.0.30).
- Submodules pinned to latest upstream (`vendor/deepseek-harness` dsh 0.2.2-rc.1); structural map in `docs/SUBMODULES.md`.
- Memory/session state tracked in git (`.hypernexus/`, `.tormentnexus/` state, `.memory/branches/`); runtime DBs pending a Git LFS decision (see TODO.md). Live-kernel DB/archive churn left unstaged until a quiesced snapshot (SYNC3).

### Repository Synchronization & Upstream Merge
- Merged upstream `origin/main` (v1.0.29) into local `main` with local-wins conflict strategy; 22,092 remote-only files integrated, zero conflicts.
- Activated submodules `lumbros.me`, `vendor/deepseek-harness`, `vendor/grok-build` (see `docs/SUBMODULES.md`).
- Audited all remote feature branches: `clean-main`, `feat/mimo-plugin-max-surface`, `fix/functionality-hardening`, `fix/test-local-embed` fully contained upstream.

## Status Legend

- **Stable** — Production-intended, tested, maintained
- **Beta** — Usable, still evolving
- **Experimental** — Active R&D, not dependable
- **Vision** — Directional only

## Completed (v1.0.0-alpha.252)

### 1. Advanced OS Deep Link Schemes
- Implemented `focus`, `search-memory`, and `trigger-tool` protocol routing inside the Go sidecar.
- Wired interactive testing button anchors to the Next.js dashboard UI.

### 2. Configurable Gossip P2P Encryption Override
- Enabled custom shared key configuration via `TORMENTNEXUS_GOSSIP_SHARED_KEY` env overrides.
- Verified all Gossip mesh unit tests pass successfully.

### 3. Multi-Tenant Isolated Compose Realignment
- Configured docker compose and tenant provisioning scripts to deploy isolated companion sidecars and Next.js dashboards on port `7779`.

## Completed (v1.0.0-alpha.251)

### 1. Legacy Core Decommissioning
- Removed all active health checks, service descriptions, and port (`4100`) references in scripts (`verify_dev_readiness.mjs`, `dev_tabby_ready.mjs`), CLI status code, Docker compose files, and dashboard components.

### 2. Browser Extension SSE/WS Re-Targeting
- Re-aligned Chrome extension background connection URLs to point directly to the native Go Sidecar (`7778`) SSE/WS transport.

### 3. Readiness Suite Optimizations
- Implemented tRPC route pre-warming checks to prevent Next.js cold start timeouts during service evaluation.

## Completed (v1.0.0-alpha.132)

### 1. Comprehensive Documentation & Merge (STABLE)

- **README.md Rewrite**: Expanded from 82 lines to 657 lines covering full architecture, capabilities, monorepo structure, Go sidecar, dashboard, MCP ecosystem, memory model, swarm, and API surface.
- **Branch Reconciliation**: Intelligently merged `jules/baseline-128-hardened` into `main`, fast-forwarded `assimilation-pipeline` and `assimilation-final` to merged tip.
- **All Branches Synchronized**: `main`, `jules`, `feat/assimilation-pipeline`, `feature/assimilation-final` all point to `988ec114a`.

### 2. Autonomous Engineering & Orchestration (STABLE)

- **CI/CD Pipeline**: Integrated multi-stage `deployment_manager` (lint, build, test, containerize) via `.github/workflows/autonomous-deploy.yml`.
- **Repository Sync**: Automated dependency management and version alignment via `go/cmd/repo_sync`.
- **Self-Healing**: Native Go `health_monitor` and `repository_healer` for autonomous kernel maintenance.
- **Enterprise Security**: SSO/RBAC middleware and structured JSONL auditing in `go/internal/enterprise/`.

### 3. Dashboard Widgets (BETA)

- **BrowserToolWidget**: Real-time browser automation control panel.
- **VibeCheckWidget**: Code quality and pattern analysis widget.

### 4. Assimilation Scale (STABLE)

- **14,250+ MCP Servers Tracked**: In `assimilation_state.db` with 3,270 pending, 10,796 implemented.
- **3,900+ Native Go Tools**: Replacing external MCP server dependencies.
- **11,024+ Populated Catalog**: In `catalog.db` with verified metadata.

## Completed (v1.0.0-alpha.131)

- **Swarm v7 Recovery**: Generated ~130 new MCP server Go tool wrappers, removed 2,268 lines of obsolete files.
- **Session Import Pipeline**: Validated 49 candidates from `~/.claude` and `~/.aider` artifacts, 586 imported sessions tracked.
- **Version Sync**: All 35 workspace packages synchronized to `1.0.0-alpha.131`.

## Completed (v1.0.0-alpha.130)

- **Skill HTTP API**: Implemented `/api/skills/list`, `/api/skills/get`, `/api/skills/search` with 10 passing unit tests.
- **API Documentation**: Updated `docs/API_ENDPOINTS.md` with skill endpoints.

## Completed (v1.0.0-alpha.129)

- **Browser Automation**: Native `chromedp` handlers (navigate, screenshot, evaluate, click, fill) replacing 5+ separate MCP entries.
- **A2A Skill Registry**: Global singleton with `FindAgentForSkill` helper.

## Completed (v1.0.0-alpha.128)

- **Bulk Skill Assimilation**: 3,229 unique skills from 7 harness ecosystems with Jaccard deduplication.
- **Hardened Kernel**: Restored ~60 swarm tool registrations and verified compilation.

## Completed (v1.0.0-alpha.127)

- **Native Go Tools**: High-performance handlers for `ripgrep`, `anyquery`, `codemod`.
- **E2E Integration Testing**: Formal test suite in `go/internal/tools/e2e_test.go`.
- **API Documentation**: 600+ endpoint reference in `docs/API_ENDPOINTS.md`.

## Completed (v1.0.0-alpha.126)

- **Universal Rebrand**: Case-insensitive refactoring across all source modules.
- **Catalog SQLite Storage**: 11,024 populated MCP servers in `tormentnexus.db`.

## Active Sprint: Phase 8 - Predictive Intelligence & Enterprise Readiness

### A. Track A: Full MCP Assimilation (BETA)

- [ ] Assimilate top 500 MCP servers as native Go modules. (3,900+ done, 3,270 pending)
- [x] Eliminate all external MCP server dependencies and submodules. (Completed alpha.183)
- [x] Native memory MCP tools: add_memory, search_memory, delete_memory, memory_stats wired into tools.Registry and MCP call handler. (Completed alpha.239)

### B. Track B: Skill Registry Progressive & Relational Linkage (STABLE)

- [x] Jaccard Duplication Rules (90% Threshold): Near-duplicate skills linked to canonical entry.
- [x] Progressive Loading: Implemented `skill_list`, `skill_get`, `skill_search`.
- [x] Win-rate tracking and auto-retirement of low-performing skills. (Completed alpha.182)

### C. Track C: Enterprise Licensing & Compliance (EXPERIMENTAL)

- [x] Ed25519-signed license token validation in Go sidecar.
- [x] Enterprise dashboard page with license info, RBAC roles, and audit log viewer. (Completed alpha.193)
- [x] Tool-call RBAC enforcement via pi extension (dangerous patterns blocked). (Completed alpha.194)
- [x] Structured audit logs for native tool execution. (Completed alpha.182)
- [x] RBAC permission schema for multi-user environments. (Completed alpha.182)

### D. Track D: Default Agent Harness Integration (BETA)

- [x] Integrate Tabby, Warp, Hyper, Hyperharness, Hermes Agent, and Pi-Mono as default harnesses.
- [x] Automate Bobbybookmarks ingestion (use Smithery.ai or Glama.ai as alternative). (Completed alpha.182)

### E. Phase 8: Predictive Intelligence (VISION)

- [ ] Predictive Conversational Tool Injection: Local model-based prediction of relevant tools.
- [x] L3 Cold Archive: Long-term compressed memory tier for infinite context. (Completed alpha.186)
- [x] L4 Limbo: Discarded/lost memory vault with resurrection. (Completed alpha.193)
- [x] Per-project .memdb portable memory files: git-tracked, auto-imported into global index. (Completed alpha.239)
- [x] Fleet-Wise Mesh dashboard page: peer discovery, capabilities, load, status. (Completed alpha.194)
- [ ] Fleet-Wide Intelligence: Cross-machine memory sharing via encrypted mesh.

### F. Phase 9: Native Runtime (VISION)

- [x] Wails Native Runtime: Build chain complete — tormentnexus-gui.exe (18MB). (Completed alpha.194)
- [ ] Deep Link Protocol: Expand `tormentnexus://` for browser-to-kernel attachment.

### G. pi Extension (STABLE)

- [x] 9 custom tools: memory, search, tools, sessions, skills, code, context, scratchpad, subagents. (Completed alpha.194)
- [x] 6 slash commands: /tn-store, /tn-search, /tn-status, /tn-plan, /tn-purge, /tn-summary. (Completed alpha.194)
- [x] 3 keyboard shortcuts: Ctrl+Shift+M/T/P. (Completed alpha.194)
- [x] RBAC enforcement on dangerous tool calls. (Completed alpha.194)
- [x] Per-project memory support (project parameter on tn_memory_store). (Completed alpha.239)
- [x] npm package: pi install npm:tormentnexus. (Completed alpha.239)
- [x] codewhale integration: .codewhale/skills/tormentnexus/SKILL.md. (Completed)

---
_Outstanding! Magnificent! Insanely Great! The collective grows._
