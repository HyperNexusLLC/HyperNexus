# HyperNexus — ROADMAP (structural, long-term)

> Version source of truth: `VERSION`. Every milestone bump commits + pushes with the version in the message.

## Current State Snapshot (2026-10-21)

> SYNC4 (2026-11-11, v1.0.32): all feature branches merged or retained-as-archive; deepseek-harness at v0.2.2-rc.2; live kernel is the installed v1.0.0-b1 build (drift from repo version — see TODO). v1.0.33: dashboard startup-blocking helpers extracted to `dashboard-startup-blocking.ts`; v1.0.34: overview model extracted to `dashboard-overview-model.ts`; v1.0.35: dashboard test suite repaired (97/97 green) + research/manual totals crash fix; v1.0.36: final legacy dashboard pages retired to redirects; v1.0.37: embedding cache for semantic search; v1.0.38: mission-control header extracted to its own component; v1.0.39: integrations section extracted; v1.0.43: docs governance refresh + kernel swap to repo build; v1.0.44: `#research-workflows` section extracted to `dashboard-research-workflows-section.tsx` (home view 2451→2267 lines); v1.0.45: governance/security section + logic extracted to `dashboard-governance-security-section.tsx` (2267→1883 lines).

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
