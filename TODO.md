# HyperNexus — TODO (granular, immediate)

> Version source: `VERSION`. Reference the exact version in every commit.

## 🔴 High (do next)

- [x] ~~Owner: reinstall Git for Windows~~ — **done v1.0.43** (winget, 2.56.0.windows.4). Still owner-pending: rotate Groq/HF keys + decide GitHub secret-blob unblock (see HANDOFF v1.0.43).
- [x] ~~Kernel build drift~~ — **done v1.0.43**: live :7778 is now the repo build `bin/hypernexus-new.exe serve` reporting v1.0.43 (exact-pid swap; other sessions' MCP processes untouched).

- [x] ~~Dashboard consolidation~~ — **verified already consolidated** (nav = 7 value-ordered sections, all tooltips present, all hrefs → home-view anchors). Remaining polish below.
- [x] **Flesh out 3 thin home-view sections** — `health-metrics`, `skills-workflows`, `security-audit` now carry tooltips (`title`), `aria-label`, `data-testid` wraps, and truth-pass copy (loading/error/empty, never mocked) in `dashboard-home-view.tsx`. Remaining: per-card forms/filters live in sub-pages.
- [ ] **Decompose `dashboard-home-view.tsx`** → one lazy-loaded component per section. Progress (v1.0.29): consolidated sections extracted to `dashboard-consolidated-sections.tsx` (4698→4631 lines, tsc+build green). Progress (v1.0.33): startup-blocking helpers extracted to `dashboard-startup-blocking.ts` (4888→4509 lines, tsc+build green). Progress (v1.0.43): overview builders extracted to `dashboard-overview-model.ts` (~3750 lines, tsc+build green). Progress (v1.0.44): `#research-workflows` section extracted to `dashboard-research-workflows-section.tsx` (2451→2267 lines, tsc+build green). Progress (v1.0.45): governance/security section extracted to `dashboard-governance-security-section.tsx` with its full logic block (2267→1883 lines, tsc+build green). **Done v1.0.47**: decomposition completed by workspace lane (home view 1883→760 lines; workflow-orchestration, prompts-deployments, system-recovery sections extracted; route tests repaired — 15 files / 107 tests green). Per-tab lazy loading **done v1.0.50** (8 sections via `next/dynamic`; 107/107 tests).
- [x] ~~Fix pre-existing dashboard test breakage~~ — **done v1.0.43**: `apps/web/vitest.config.ts` (source aliases, single React, inline deps, build-output excludes) + test mocks; 14 files / 97 tests green. Also fixed research/manual `data?.totals` crash + memory-detail shadowing found by the revived tests.
- [x] ~~Retire legacy `dashboard/*` pages~~ — **done v1.0.43**: zero `GenericDashboardPage` files remain; final 10 generic JSON viewers (browser, browser-extension, cli-harnesses, cloud-dev, deerflow, healer, imports, logs-metrics, observability, runtime) verified byte-identical templates and converted to `RedirectPage` deep-links into consolidated sections.
- [x] ~~Kernel `facts/add` hang~~ — **fixed v1.0.49**: async bounded L2 dual-write; swarm/session buses live-green; regression test for chat-shape attestation strip.
- [ ] **Harness matrix follow-ups**: ~~per-GUI live completion smokes~~ **kernel-path done v1.0.51 (30/30; GUI app launches still unexercised)**; cross-driver (swarm vs session-bus) interop check; ~~codewhale `.codewhale` payload~~ **installed v1.0.51**; freebuff/hax CLI on PATH (owner installs).
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
- [ ] **deepseek-harness 0.2.2-rc.1**: re-verify `addons/deepseek-harness-gui` against bumped `vendor/deepseek-harness` (`fcc0ad4621`); root kernel does not import it, addon untested.
- [ ] **Git LFS for runtime DBs**: `data/tormentnexus.db` (210MB), `data/catalog.db` (52MB), `.tormentnexus/skills.db` (49MB) exceed GitHub's 100MB file limit and stay untracked until LFS is adopted.
- [ ] **Archive or delete** `feature/cloud-dashboard-mcp-sse-389806464713532918` (unrelated history, superseded layout, features already in main) once archival need lapses; kept for now per retention policy.
- [ ] Prune stale remote-tracking refs `origin-tormentnexus/*` and `robertpelloni/*` (remotes no longer configured).

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
- [ ] Kernel-native orchestrate: TS upstream on :4000 no longer exists in-tree (`packages/cli/` removed; root `start` script stale). Needs a Go-native `/api/agent/orchestrate` implementation or restoring the TS core. Paseo + memory-facts are the working control plane meanwhile.
- [ ] `claude` command still crashes on system Node 26 - either downgrade global Node to 22/24 LTS or put `%LOCALAPPDATA%\node22` first in PATH; `~/bin/claude.cmd` wrapper does not shadow in PowerShell.
- [ ] droid 0.71.0 does not surface `customModels` (schema mismatch); copilot-cli Meta route needs the mint revived (`/login meta` in pi).
