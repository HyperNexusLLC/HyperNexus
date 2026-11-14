# TODO

> Version source: `VERSION`. Reference the exact version in every commit.

_Last updated: 2026-11-12, version 1.0.0-alpha.254_

- [x] **Repository Sync (alpha.254)**: Merged `origin/main` v1.0.29 into `main` (local-wins, unrelated histories), initialized 3 submodules, audited all remote feature branches.
- [ ] **Post-merge validation**: Run full Go + web test suites against remote-only code merged in alpha.254 before relying on it.
- [ ] **Version script**: Run `pnpm install` then `node scripts/sync-versions.mjs` to restore scripted version sync (needs `glob`).

- [x] ~~Owner: reinstall Git for Windows~~ — **done v1.0.43** (winget, 2.56.0.windows.4). Still owner-pending: rotate Groq/HF keys + decide GitHub secret-blob unblock (see HANDOFF v1.0.43).
- [x] ~~Kernel build drift~~ — **done v1.0.43**: live :7778 is now the repo build `bin/hypernexus-new.exe serve` reporting v1.0.43 (exact-pid swap; other sessions' MCP processes untouched).

- [x] ~~Dashboard consolidation~~ — **verified already consolidated** (nav = 7 value-ordered sections, all tooltips present, all hrefs → home-view anchors). Remaining polish below.
- [x] **Flesh out 3 thin home-view sections** — `health-metrics`, `skills-workflows`, `security-audit` now carry tooltips (`title`), `aria-label`, `data-testid` wraps, and truth-pass copy (loading/error/empty, never mocked) in `dashboard-home-view.tsx`. Remaining: per-card forms/filters live in sub-pages.
- [x] ~~**Decompose `dashboard-home-view.tsx`**~~ → one lazy-loaded component per section. Progress (v1.0.29): consolidated sections extracted to `dashboard-consolidated-sections.tsx` (4698→4631 lines, tsc+build green). Progress (v1.0.33): startup-blocking helpers extracted to `dashboard-startup-blocking.ts` (4888→4509 lines, tsc+build green). Progress (v1.0.43): overview builders extracted to `dashboard-overview-model.ts` (~3750 lines, tsc+build green). Progress (v1.0.44): `#research-workflows` section extracted to `dashboard-research-workflows-section.tsx` (2451→2267 lines, tsc+build green). Progress (v1.0.45): governance/security section extracted to `dashboard-governance-security-section.tsx` with its full logic block (2267→1883 lines, tsc+build green). **Done v1.0.47**: decomposition completed by workspace lane (home view 1883→760 lines; workflow-orchestration, prompts-deployments, system-recovery sections extracted; route tests repaired — 15 files / 107 tests green). Per-tab lazy loading **done v1.0.50** (8 sections via `next/dynamic`; 107/107 tests).
- [x] ~~Fix pre-existing dashboard test breakage~~ — **done v1.0.43**: `apps/web/vitest.config.ts` (source aliases, single React, inline deps, build-output excludes) + test mocks; 14 files / 97 tests green. Also fixed research/manual `data?.totals` crash + memory-detail shadowing found by the revived tests.
- [x] ~~Retire legacy `dashboard/*` pages~~ — **done v1.0.43**: zero `GenericDashboardPage` files remain; final 10 generic JSON viewers (browser, browser-extension, cli-harnesses, cloud-dev, deerflow, healer, imports, logs-metrics, observability, runtime) verified byte-identical templates and converted to `RedirectPage` deep-links into consolidated sections.
- [x] ~~Kernel `facts/add` hang~~ — **fixed v1.0.49**: async bounded L2 dual-write; swarm/session buses live-green; regression test for chat-shape attestation strip.
- [ ] **Harness matrix follow-ups**: per-GUI live completion smokes; cross-driver (swarm vs session-bus) interop check; codewhale `.codewhale` payload install; freebuff/hax CLI on PATH (owner installs).
- [ ] **Marketing agent (:8084)** — `scripts/autonomous_marketing.py` is down; decide: start it, or document as optional and gate the health check.
- [x] **Cross-session interconnect in dashboard** (2026-11-13) — `CrossSessionBusPanel` (registry, unanswered, replies, web deliveries; loading/error/empty) under Mission Control + `docs/DASHBOARD_CONSOLIDATION_AUDIT.md`; sidebar duplicate anchors merged, Healer anchor corrected to `#healer-cognition`, tray menu verified (Dashboard/Logs/Autostart/Exit All).

- [ ] **Harness matrix follow-ups**: ~~per-GUI live completion smokes~~ **kernel-path done v1.0.51 (30/30; GUI app launches still unexercised)**; ~~cross-driver (swarm vs session-bus) interop check~~ **done v1.0.54 (test-bus-interop.mjs 7/7)**; ~~codewhale `.codewhale` payload~~ **installed v1.0.51**; freebuff/hax CLI on PATH (owner installs).
- [x] ~~**Marketing agent (:8084)**~~ **audited v1.0.60**: optional/non-critical (`watchdog.py` critical:False; health checks for it target the VPS service). Documented optional; not started locally.
- [x] ~~Watchdog as scheduled task~~ — **verified done 2026-10-23**: `HyperNexus-KernelWatchdog` is registered and Running (spawns the kernel with an elevated token — see HANDOFF session 9 for the swap implications).
- [x] **Port pi tools to opencode** — `hypernexus_workflow`, `hypernexus_orchestrate`, `hypernexus_browser` added to the OpenCode plugin (33 tools total; gauntlet 10/10). **mimo port done (33 tools incl. workflow/orchestrate/browser; battery v1.0.55).**

## P0 — Must do now (Stability, Testing & Validation)
- [x] **Chrome Extension Integration**: Point Chrome extension event-stream and websocket URLs to port `7778` (Go Sidecar). (Completed alpha.250)
- [x] **Legacy Core Decommissioning**: Remove all references, port mappings, and services for the decommissioned TS core. (Completed alpha.251)
- [x] **Track A: MCP Discovery**: Execute discovery script to rank top 500 MCP servers and seed state DB. (14,250 rows in assimilation_state.db)
- [x] **Track B: Skill Registry**: Verify 3-tier loading with comprehensive unit tests. (Completed alpha.128)
- [x] **Track B: Bulk Skill Assimilation**: Assimilated 3,229 unique skills from 7 harness ecosystems. (Completed alpha.128)
- [x] **Track D: Prompt Migration**: Migrate hardcoded prompts to SQLite. (Completed alpha.127)
- [x] **Branch Merge**: Intelligently merged `jules/baseline-128-hardened` into `main`, fast-forwarded `assimilation-pipeline` and `assimilation-final`. (Completed alpha.132)
- [x] **README Rewrite**: Comprehensive 657-line README with full architecture, capabilities, and roadmap. (Completed alpha.132)
- [x] **Data Integrity**: 14,250 total / 10,796 done / 10 pending / 9 processing (swarm actively finishing). (alpha.134)
- [x] **Swarm Output**: Swarm running persistently with 7-model pool. Generated 34 new Go tool stubs. (alpha.134)
- [x] **Go Build Verification**: Root build passes clean (4,042 tool files). (alpha.134)

## P1 — Should do next (Integrations)
- [x] **Harness Integration**: Integrate Tabby, Warp, Hyper, Hyperharness, Hermes Agent, and Pi-Mono. (Verified alpha.127)
- [x] **A2A Skill Registry**: Map assimilated skills into FreeLLM A2A registry. (Completed alpha.128)
- [x] **Skill HTTP API**: Wire skill store into Go sidecar HTTP endpoints. (Completed alpha.130)
- [x] **Browser Automation MCP**: Finalize tests and add optional args. (Completed alpha.129)
- [x] **ChunkHound / Probe Integration**: Implement remaining assimilated MCP search tools as native handlers.
- [x] **Bobbybookmarks Sync**: Configure automatic sync call triggers for catalog scraping. (Blocked by DNS failure — use Smithery.ai or Glama.ai)
- [x] **New Native Tools**: Implement `browser-use` and `browsermcp` specialized logic if needed (currently aliased to playwright).
- [x] **Session Import**: Format resolved — wraps JSONL in ExportPackage format (228 sessions detected). Orchestrator POST endpoint missing for actual restoration.
- [x] **Git LFS**: Consider tracking large `.db` files (provider_metrics.db 145MB, tormentnexus.db 34MB) with Git LFS to avoid repo bloat.
- [x] **.out Cleanup**: `swarm_*.out` and `*.pid` added to `.gitignore`. (alpha.133)

- [x] ~~**Embedding cache**~~ **done v1.0.61**: in-memory vector matrix + mtime-keyed memories.json cache; search ~2.8s->~1.1s, recent 1161->165ms. Residual: store-mutex contention under write load (heat writes under `s.mu`).
- [x] ~~**Ollama install**~~ **audited v1.0.60**: optional - embeddings use bundled MiniLM; Ollama (:11434) not required locally.
- [x] ~~**Port pi tools** to mimo + opencode~~ **done (opencode v1.0.43-era, mimo verified v1.0.55, 33 tools + battery 7/7)**.
- [x] ~~**`codebase_search` docs**~~ **done v1.0.59**: pi tool now advertises `symbols|definitions|references` (default symbols); battery-guarded.
- [x] ~~**Gossip (:7878)**~~ **audited v1.0.60**: no local expectation found; treated as optional, not started.

## P2 — Enterprise Readiness & Security
- [x] **License Validation**: Implement Ed25519 license token validation in Go sidecar. (Verified alpha.127)
- [x] **Compliance Boundary**: Separate SSO/RBAC/Audit logic into enterprise wrapper.
- [x] **Enterprise Security**: SSO/RBAC middleware and JSONL auditing added from jules merge. (alpha.132)
- [x] **Autonomous CI/CD**: `deployment_manager`, `health_monitor`, `repository_healer` added from jules merge. (alpha.132)

## P3 — Future Enhancements
- [x] **Skill Evolution**: With ~3,000+ skills loaded, implement win-rate tracking, auto-retirement of low-performing skills, and `/evolve` command.
- [x] **Catalog DB Sync**: Index new skills into `catalog.db` for unified search.
- [x] **Submodule Removal**: Systematic removal of redundant submodules after native reimplementation.
- [x] **P2P Memory**: Implement gossip protocol for decentralized context sharing.
- [x] **L3 Cold Archive**: Implement long-term compressed memory tier for infinite context.
- [x] **Fleet-Wide Intelligence**: Cross-machine memory sharing via encrypted mesh.
- [x] **Wails Native Runtime**: Replace Electron with Go-native desktop shell.
- [x] **Deep Link Protocol**: Expand `tormentnexus://` protocol for browser-to-kernel attachment.

- [x] **Script consolidation (bin/)** — done 2026-11-13: 14 `hypernexus*.exe.bak*` binaries (606 MB) archived non-destructively to `archive/bin-legacy-20261113/`; live exes untouched. Dashboard-death root cause also resolved v1.0.53 (`/api/shutdown` full-suite sweep; swaps use exact-pid stop only). Remaining script consolidation: — `bin/` has many one-off `hypernexus-*.exe.bak` binaries + old `serve-*.log`; archive (non-destructively) to an `archive/` dir. (binaries already `.gitignore`d.)
- [ ] **`bin/_pitest*.txt` + `_mcpall*.txt`** test artifacts — deleted; add to `.gitignore`.
- [ ] **Docs sweep** — refresh `VISION.md`, `MEMORY.md`, `DEPLOY.md`, `IDEAS.md`, `CHANGELOG.md` to reflect the systray fix, search-coverage fix, hybrid retrieval, and dashboard consolidation plan.
- [ ] **Version bump** — bump `VERSION.md` + CHANGELOG for this batch of fixes.

## ✅ Done this session
- [x] Merged `clean-main` into `feat/mimo-plugin-max-surface` (resolved 6 conflicts, kept both reliability + features).
- [x] Started the dashboard (:7779) — was down.
- [x] Systray: no more ghost icons (NIM_DELETE on shutdown) + survives explorer restarts (TaskbarCreated).
- [x] Watchdog activated (stall-vs-death aware, won't thrash).
- [x] Verified tray menu is feature-complete (Dashboard / Logs / Auto-Start / Exit All Processes).

## Repo Sync (2026-11-07, v1.0.30)

- [x] Re-audit all feature branches (0 unique commits each, fully merged) and fast-forward `clean-main`, `feat/mimo-plugin-max-surface`, `fix/functionality-hardening`, `fix/test-local-embed` to `main` (see HANDOFF Session SYNC3).
- [x] Repair working-tree regression to 1.0.28-era content (version refs, CHANGELOG/HANDOFF/ROADMAP/TODO/SUBMODULES, dashboard decomposition, supervisor mapping); keep `DashboardConsolidatedSections` as canonical.
- [ ] **Drop `stash@{0}`** ("pre-sync-wip-2026-11-05") after verifying push landed (carried over).
- [ ] Quiesce kernel before ever staging `catalog.db`/`hypernexus.db` rewrites or session-archive pruning (live churn left unstaged in SYNC3); `data/tormentnexus.db` (210MB) still needs Git LFS.

## Repo Sync (2026-11-05, v1.0.28)

- [x] Fast-forward local `main` to remote (258 commits); audit all feature branches (see HANDOFF Session RS).
- [ ] **Drop `stash@{0}`** ("pre-sync-wip-2026-11-05") after verifying v1.0.28 push landed.
- [x] ~~**deepseek-harness re-verify**~~ **done v1.0.63**: battery 8/8 against current vendor (e8f7b93; rc.1 bump not checked out).
- [ ] **Git LFS for runtime DBs**: `data/tormentnexus.db` (210MB), `data/catalog.db` (52MB), `.tormentnexus/skills.db` (49MB) exceed GitHub's 100MB file limit and stay untracked until LFS is adopted. Gemini lane cautions (2026-11-13): run `PRAGMA wal_checkpoint(TRUNCATE)` in the quiesced window so `-wal`/`-shm` sidecars are flushed, keep sidecars untracked, and weigh `git lfs migrate import` (rewrites SHAs across main) vs pointer cutover in a fresh commit (leaves old blobs in history).
- [ ] **Archive or delete** `feature/cloud-dashboard-mcp-sse-389806464713532918` (unrelated history, superseded layout, features already in main) once archival need lapses; kept for now per retention policy.
- [x] ~~Prune stale remote-tracking refs~~ **done v1.0.63** (8 refs deleted; remotes decommissioned).

## Harness Rollout (2026-11-05, v1.0.28)

- [x] **`/login meta` in pi** - done 2026-11-05; spark+wonder live in pi/codex/muse-cli, 403 bisection reproduced and strip-list fixed (`apply_patch`/`update_plan`). Remaining: spot-check other harnesses' `--live` batteries opportunistically.
- [ ] Replace `%LOCALAPPDATA%\HyperNexus\hypernexus.exe` with the v1.0.28 build once the pre-existing `hypernexus.exe mcp` process (pid 26812) ends; running kernel is workspace `bin\hypernexus.exe` (pid 28660).
- [ ] Install missing GUI apps or accept staged configs: juggler, openchamber, paseo, paradev, omnigent, t3code, conductor, openwebui; retarget antigravity-gui installer at the real Antigravity `mcp.json`.
- [x] Native cross-session execution: `POST /api/agent/orchestrate` implemented natively in Go (`orchestrate_handlers.go`, merged v1.0.29 via Session XB; live after next kernel swap) + cross-session bus (`addons/shared/session-bus.mjs`, scratchpad transport, battery 12/12) + CDP bridge for web threads.
- [ ] Rotate the pre-existing plaintext provider apiKey in `~/.config/mimocode/mimocode.jsonc` to an env ref.
- [x] prime-agent 0.10.2 + paseo 0.15.2 + omnigent + Open WebUI + Juggler + T3 Code + OpenChamber + hax (WSL) installed 2026-11-05; conductor/paradev are macOS-only (no Windows build exists).
- [x] Re-run `/login meta` in pi - DONE 2026-11-06 (Robert): meta entry present, `meta-muse-key --check` mint OK (shared + codex), `/v1/models` 200 spark family, live proofs parity-only AND shell-named tools both 200 `LIVE_OK` (403 bisection closed).
- [x] jcode upgraded to 0.99.1 - `meta-muse` surfaces in the provider enum; live exec now only needs a real Meta key (human `/login meta` in pi, or interactive `jcode login --provider muse-subscription`).
- [ ] maki headless Meta: Lua provider registers only in interactive TUI sessions on 0.5.6; run one TUI session in-repo to seed `maki.provider.auth` for meta.
- [ ] hax live from WSL needs the kernel reachable (bind `--host 0.0.0.0` or WSL mirrored networking) - user security-posture decision.
- [ ] droid live needs Factory account auth; reasonix live needs one interactive `reasonix setup` (provider key); freebuff/codebuff BYOK needs the mint revived.
- [x] ~~Kernel-native orchestrate~~ **done (verified v1.0.64)**: Go-native `/api/agent/orchestrate` serves RECALL/DISCOVER/PERSIST locally; live 200 + tests green.
- [ ] `claude` command still crashes on system Node 26 - either downgrade global Node to 22/24 LTS or put `%LOCALAPPDATA%\node22` first in PATH; `~/bin/claude.cmd` wrapper does not shadow in PowerShell.
- [ ] droid 0.71.0 does not surface `customModels` (schema mismatch); copilot-cli Meta route needs the mint revived (`/login meta` in pi).

---
*Keep the party going. Never stop. Don't stop the party!!!*

- [ ] **POST-PAYMENT (Invoice #001 clears): Nexus Mailroom (Zero-Exposure Key Vault feature)** — 2 endpoints only: `POST /vault/one-time-link` (ingest a client key once into an alias) + outbound header injection at the MCP proxy boundary so staff/agents invoke `alias://Stripe-Prod-Main` and never see raw keys. NOTE: `vault_engine.go` does NOT exist in this repo yet (verdict PDF assumed MDMAtk/TormentNexus code) — this is new work, gated on payment, est. ~half day Go. Tenant routing stays deterministic (Ed25519/HMAC in SQL); vectors only classify MCP tools/payloads, never route tenants.
