# HyperNexus — TODO (granular, immediate)

> Version source: `VERSION.md`. Reference the exact version in every commit.

## 🔴 High (do next)

- [x] ~~Dashboard consolidation~~ — **verified already consolidated** (nav = 7 value-ordered sections, all tooltips present, all hrefs → home-view anchors). Remaining polish below.
- [ ] **Flesh out 3 thin home-view sections** — `health-metrics` (~676c), `skills-workflows` (~562c), `security-audit` (~550c) are stubs; add real content/forms/tooltips.
- [ ] **Decompose `dashboard-home-view.tsx`** (4958 lines) → one lazy-loaded component per section.
- [ ] **Retire 99 legacy `dashboard/*` pages** (not in nav) — redirect to home anchors to remove dead weight.
- [ ] **Marketing agent (:8084)** — `scripts/autonomous_marketing.py` is down; decide: start it, or document as optional and gate the health check.
- [ ] **Watchdog as scheduled task** — register `scripts/kernel-watchdog.ps1` for boot survival (currently only a background process).

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
