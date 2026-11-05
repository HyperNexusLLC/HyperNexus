# HyperNexus — TODO (granular, immediate)

> Version source: `VERSION.md`. Reference the exact version in every commit.

## 🔴 High (do next)

- [x] ~~Dashboard consolidation~~ — **verified already consolidated** (nav = 7 value-ordered sections, all tooltips present, all hrefs → home-view anchors). Remaining polish below.
- [x] **Flesh out 3 thin home-view sections** — `health-metrics`, `skills-workflows`, `security-audit` now carry tooltips (`title`), `aria-label`, `data-testid` wraps, and truth-pass copy (loading/error/empty, never mocked) in `dashboard-home-view.tsx`. Remaining: per-card forms/filters live in sub-pages.
- [ ] **Decompose `dashboard-home-view.tsx`** (4958 lines) → one lazy-loaded component per section.
- [ ] **Retire 99 legacy `dashboard/*` pages** (not in nav) — progress 2026-10-31: ~53 already `RedirectPage` stubs; `health|metrics|pulse`→`#health-metrics`, `skills|workflows`→`#skills-workflows`, `security|audit`→`#security-audit` deep-linked (7/7 verified). Remaining `GenericDashboardPage` stubs (logs-metrics, healer, memory-analytics, mcp) carry unique fetches — review before stubbing.
- [ ] **Marketing agent (:8084)** — `scripts/autonomous_marketing.py` is down; decide: start it, or document as optional and gate the health check.
- [x] ~~Watchdog as scheduled task~~ — **verified done 2026-10-23**: `HyperNexus-KernelWatchdog` is registered and Running (spawns the kernel with an elevated token — see HANDOFF session 9 for the swap implications).
- [x] **Port pi tools to opencode** — `hypernexus_workflow`, `hypernexus_orchestrate`, `hypernexus_browser` added to the OpenCode plugin (33 tools total; gauntlet 10/10). **mimo port still pending.**

## 🟡 Medium

- [ ] **Embedding cache** — in-memory vector matrix so semantic search stays sub-second under load (currently 0.8–2.5s with hybrid retrieve).
- [ ] **Ollama install** — `llama-server` binary is missing; either repair the install or drop the watchdog's Ollama dependency (embeddings already use bundled MiniLM, so Ollama is now optional).
- [ ] **Port pi tools** (`hypernexus_orchestrate`, `hypernexus_workflow`, `hypernexus_browser`) to mimo + opencode for parity.
- [ ] **`codebase_search` docs** — its modes are `symbols|definitions|references` (not `ast|semantic|pattern`); document in the tool description.
- [ ] **Gossip (:7878)** — confirm whether P2P gossip is expected to run locally; gate or start it.

## 🟢 Low / cleanup

- [ ] **Script consolidation** — `bin/` has many one-off `hypernexus-*.exe.bak` binaries + old `serve-*.log`; archive (non-destructively) to an `archive/` dir. (binaries already `.gitignore`d.)
- [ ] **`bin/_pitest*.txt` + `_mcpall*.txt`** test artifacts — deleted; add to `.gitignore`.
- [ ] **Docs sweep** — refresh `VISION.md`, `MEMORY.md`, `DEPLOY.md`, `IDEAS.md`, `CHANGELOG.md` to reflect the systray fix, search-coverage fix, hybrid retrieval, and dashboard consolidation plan.
- [ ] **Version bump** — bump `VERSION.md` + CHANGELOG for this batch of fixes.

## ✅ Done this session
- [x] Merged `clean-main` into `feat/mimo-plugin-max-surface` (resolved 6 conflicts, kept both reliability + features).
- [x] Started the dashboard (:7779) — was down.
- [x] Systray: no more ghost icons (NIM_DELETE on shutdown) + survives explorer restarts (TaskbarCreated).
- [x] Watchdog activated (stall-vs-death aware, won't thrash).
- [x] Verified tray menu is feature-complete (Dashboard / Logs / Auto-Start / Exit All Processes).

## Repo Sync (2026-11-05, v1.0.28)

- [x] Fast-forward local `main` to remote (258 commits); audit all feature branches (see HANDOFF Session RS).
- [ ] **Drop `stash@{0}`** ("pre-sync-wip-2026-11-05") after verifying v1.0.28 push landed.
- [ ] **deepseek-harness 0.2.2-rc.1**: re-verify `addons/deepseek-harness-gui` against bumped `vendor/deepseek-harness` (`fcc0ad4621`); root kernel does not import it, addon untested.
- [ ] **Git LFS for runtime DBs**: `data/tormentnexus.db` (210MB), `data/catalog.db` (52MB), `.tormentnexus/skills.db` (49MB) exceed GitHub's 100MB file limit and stay untracked until LFS is adopted.
- [ ] **Archive or delete** `feature/cloud-dashboard-mcp-sse-389806464713532918` (unrelated history, superseded layout, features already in main) once archival need lapses; kept for now per retention policy.
- [ ] Prune stale remote-tracking refs `origin-tormentnexus/*` and `robertpelloni/*` (remotes no longer configured).
