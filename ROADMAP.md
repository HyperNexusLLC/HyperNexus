# HyperNexus — ROADMAP (structural, long-term)

> Version source of truth: `VERSION.md`. Every milestone bump commits + pushes with the version in the message.

## Current State Snapshot (2026-10-21)

| Layer | Status |
|---|---|
| Go kernel (:7778) | ✅ running, 49+ tools, systray (fixed ghost + TaskbarCreated) |
| Dashboard (:7779) | ✅ running (Next.js standalone) — **99 pages / 66 components / 4958-line home view** |
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
